import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, OfferStatus, PaymentStatus } from '@prisma/client';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { IyzicoService } from './iyzico.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

const CONTACT_UNLOCK_PRICE = '399.00';
const CURRENCY = 'TRY';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly iyzico: IyzicoService,
    private readonly config: ConfigService,
  ) {}

  async initiate(buyerId: string, dto: InitiatePaymentDto, req: Request) {
    const { offerId, conversationId } = dto;

    // Teklif var mı ve kabul edilmiş mi?
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: { select: { title: true, ownerId: true } },
        contractor: { select: { id: true, fullName: true } },
      },
    });

    if (!offer) throw new NotFoundException('Teklif bulunamadı');
    if (offer.status !== OfferStatus.ACCEPTED) {
      throw new BadRequestException('Sadece kabul edilmiş teklifler için ödeme yapılabilir');
    }

    // Sadece ilan sahibi ödeme yapabilir
    if (offer.listing.ownerId !== buyerId) {
      throw new ForbiddenException('Bu ödemeyi yapmaya yetkiniz yok');
    }

    // Çift ödeme koruması — @@unique([buyerId, offerId])
    const alreadyUnlocked = await this.prisma.contactUnlock.findUnique({
      where: { buyerId_offerId: { buyerId, offerId } },
    });
    if (alreadyUnlocked) {
      throw new ConflictException('Bu iletişim bilgisi zaten açık');
    }

    const buyer = await this.prisma.user.findUniqueOrThrow({
      where: { id: buyerId },
      select: { fullName: true, email: true, phone: true },
    });

    const [firstName, ...rest] = buyer.fullName.split(' ');
    const lastName = rest.join(' ') || '-';
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? '0.0.0.0';

    const callbackUrl = `${this.config.getOrThrow('API_URL')}/api/v1/payments/callback`;

    // Ödeme kaydını PENDING olarak oluştur
    const payment = await this.prisma.payment.create({
      data: {
        buyerId,
        offerId,
        amount: 399,
        currency: CURRENCY,
        status: PaymentStatus.PENDING,
        providerRef: conversationId,
      },
    });

    try {
      const result = await this.iyzico.initializeCheckout({
        price: CONTACT_UNLOCK_PRICE,
        paidPrice: CONTACT_UNLOCK_PRICE,
        currency: CURRENCY,
        installment: '1',
        paymentChannel: 'WEB',
        paymentGroup: 'PRODUCT',
        callbackUrl,
        conversationId,
        buyer: {
          id: buyerId,
          name: firstName,
          surname: lastName,
          email: buyer.email,
          identityNumber: '11111111111', // Sandbox zorunluluğu; gerçekte şifreli TC kullanılır
          registrationAddress: 'Türkiye',
          city: 'Istanbul',
          country: 'Turkey',
          ip,
        },
        shippingAddress: { contactName: buyer.fullName, city: 'Istanbul', country: 'Turkey', address: 'Türkiye' },
        billingAddress: { contactName: buyer.fullName, city: 'Istanbul', country: 'Turkey', address: 'Türkiye' },
        basketItems: [
          {
            id: offerId,
            name: `İletişim Kilidi Açma — ${offer.listing.title}`,
            category1: 'Dijital Hizmet',
            itemType: 'VIRTUAL',
            price: CONTACT_UNLOCK_PRICE,
          },
        ],
      });

      // Token'ı kayıt ile ilişkilendir
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: result.token },
      });

      return {
        paymentId: payment.id,
        checkoutFormContent: result.checkoutFormContent,
        token: result.token,
      };
    } catch (err) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Ödeme başlatılamadı');
    }
  }

  // Iyzico 3DS form-post callback
  async handleCallback(token: string) {
    // Önce Iyzico'yu doğrula — DB'ye dokunmadan önce sonucu al
    const result = await this.iyzico.retrieveCheckoutForm(token);

    // Atomic update: sadece PENDING olan kaydı eşzamanlı duplicate callback'lere karşı
    // güvenli biçimde PROCESSING'e çek (compare-and-swap).
    // updateMany 0 satır güncellerse bu callback zaten işlenmiş demektir.
    const { count } = await this.prisma.payment.updateMany({
      where: { providerRef: token, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PROCESSING },
    });

    if (count === 0) {
      this.logger.warn(`Callback: token zaten işlenmiş veya bilinmiyor — ${token}`);
      return { success: false };
    }

    const payment = await this.prisma.payment.findFirstOrThrow({
      where: { providerRef: token },
      include: {
        offer: {
          include: {
            contractor: { select: { id: true, fullName: true, email: true, phone: true } },
            listing: { select: { title: true } },
          },
        },
      },
    });

    if (result.status !== 'success') {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      return { success: false, reason: result.errorMessage };
    }

    // Iyzico'dan dönen conversationId DB'deki buyerId ile eşleşmeli (token karıştırma saldırısı)
    if (result.conversationId && result.conversationId !== payment.buyerId) {
      this.logger.error(`Callback güvenlik uyarısı: conversationId uyuşmuyor — token ${token}`);
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      });
      return { success: false };
    }

    // Transaction: ödemeyi tamamla + iletişim kilidi oluştur + bildirim
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.COMPLETED,
          providerPaymentId: result.paymentId,
        },
      });

      await tx.contactUnlock.create({
        data: {
          buyerId: payment.buyerId,
          offerId: payment.offerId,
          paymentId: payment.id,
        },
      });

      await tx.notification.create({
        data: {
          userId: payment.buyerId,
          type: NotificationType.CONTACT_UNLOCKED,
          title: 'İletişim bilgileri açıldı',
          body: `${payment.offer.contractor.fullName} ile iletişime geçebilirsiniz.`,
          data: { offerId: payment.offerId, contractorId: payment.offer.contractor.id },
        },
      });
    });

    return { success: true, paymentId: payment.id };
  }

  // Ödeme tamamlandıktan sonra iletişim bilgisini döner
  async getUnlockedContact(buyerId: string, offerId: string) {
    const unlock = await this.prisma.contactUnlock.findUnique({
      where: { buyerId_offerId: { buyerId, offerId } },
      include: {
        offer: {
          include: {
            contractor: {
              select: { id: true, fullName: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!unlock) {
      throw new ForbiddenException('Bu iletişim bilgisi için ödeme yapılmamış');
    }

    return {
      contractorId: unlock.offer.contractor.id,
      fullName: unlock.offer.contractor.fullName,
      email: unlock.offer.contractor.email,
      phone: unlock.offer.contractor.phone,
      unlockedAt: unlock.createdAt,
    };
  }

  async getMyPayments(buyerId: string, page = 1, limit = 20) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count({ where: { buyerId } }),
      this.prisma.payment.findMany({
        where: { buyerId },
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          createdAt: true,
          offer: {
            select: {
              id: true,
              listing: { select: { id: true, title: true } },
              contractor: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }
}
