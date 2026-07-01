import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, NotificationType, OfferStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContentFilterService } from './content-filter.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';

const OFFER_SELECT = {
  id: true,
  offerModel: true,
  message: true,
  revenueSharePercent: true,
  cashOfferAmount: true,
  estimatedMonths: true,
  status: true,
  createdAt: true,
  contractor: {
    select: { id: true, fullName: true },
  },
} satisfies Prisma.OfferSelect;

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly filter: ContentFilterService,
  ) {}

  async create(contractorId: string, listingId: string, dto: CreateOfferDto) {
    // İçerik filtresi
    this.filter.assertClean(dto.message);

    // İlan var mı ve aktif mi?
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, ownerId: true, title: true },
    });

    if (!listing || listing.status === ListingStatus.DELETED) {
      throw new NotFoundException('İlan bulunamadı');
    }
    if (listing.status !== ListingStatus.ACTIVE) {
      throw new ForbiddenException('Sadece aktif ilanlara teklif verilebilir');
    }
    if (listing.ownerId === contractorId) {
      throw new ForbiddenException('Kendi ilanınıza teklif veremezsiniz');
    }

    const offer = await this.prisma.$transaction(async (tx) => {
      // Duplicate kontrolü transaction içinde — dışarıdaki findUnique race condition'a açıktı.
      // P2002 (unique constraint) DB katmanında da korur ama net hata mesajı için burada kontrol ediyoruz.
      const existing = await tx.offer.findUnique({
        where: { listingId_contractorId: { listingId, contractorId } },
        select: { id: true },
      });
      if (existing) throw new ConflictException('Bu ilana zaten teklif verdiniz');

      const created = await tx.offer.create({
        data: { ...dto, listingId, contractorId, status: OfferStatus.PENDING },
        select: OFFER_SELECT,
      });

      // Arsa sahibine bildirim
      await tx.notification.create({
        data: {
          userId: listing.ownerId,
          type: NotificationType.NEW_OFFER,
          title: 'Yeni teklif aldınız',
          body: `"${listing.title}" ilanınıza yeni bir teklif geldi.`,
          data: { offerId: created.id, listingId },
        },
      });

      return created;
    });

    return offer;
  }

  async findByListing(listingId: string, requesterId: string, requesterRole: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true, status: true },
    });

    if (!listing || listing.status === ListingStatus.DELETED) {
      throw new NotFoundException('İlan bulunamadı');
    }

    // Sadece ilan sahibi ve admin tüm teklifleri görebilir
    if (listing.ownerId !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu ilanın tekliflerini görme yetkiniz yok');
    }

    return this.prisma.offer.findMany({
      where: { listingId, status: { not: OfferStatus.WITHDRAWN } },
      select: OFFER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMyOffers(contractorId: string, page = 1, limit = 20) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.offer.count({ where: { contractorId } }),
      this.prisma.offer.findMany({
        where: { contractorId },
        select: {
          ...OFFER_SELECT,
          listing: { select: { id: true, title: true, city: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }

  async update(offerId: string, contractorId: string, dto: UpdateOfferDto) {
    if (dto.message) this.filter.assertClean(dto.message);

    const offer = await this.findOfferOrThrow(offerId);

    if (offer.contractorId !== contractorId) {
      throw new ForbiddenException('Bu teklifi güncelleme yetkiniz yok');
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new ForbiddenException('Sadece bekleyen teklifler güncellenebilir');
    }

    return this.prisma.offer.update({
      where: { id: offerId },
      data: dto,
      select: OFFER_SELECT,
    });
  }

  async withdraw(offerId: string, contractorId: string) {
    const offer = await this.findOfferOrThrow(offerId);

    if (offer.contractorId !== contractorId) {
      throw new ForbiddenException('Bu teklifi geri çekme yetkiniz yok');
    }
    if (offer.status !== OfferStatus.PENDING) {
      throw new ForbiddenException('Sadece bekleyen teklifler geri çekilebilir');
    }

    await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.WITHDRAWN },
    });

    return { message: 'Teklif geri çekildi' };
  }

  async accept(offerId: string, ownerId: string) {
    const offer = await this.findOfferOrThrow(offerId);
    await this.assertListingOwner(offer.listingId, ownerId);

    if (offer.status !== OfferStatus.PENDING) {
      throw new ForbiddenException('Sadece bekleyen teklifler kabul edilebilir');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.ACCEPTED },
        select: OFFER_SELECT,
      });

      // Müteahhide kabul bildirimi
      await tx.notification.create({
        data: {
          userId: offer.contractorId,
          type: NotificationType.OFFER_ACCEPTED,
          title: 'Teklifiniz kabul edildi',
          body: 'İletişim bilgilerine erişmek için ödeme yapabilirsiniz.',
          data: { offerId, listingId: offer.listingId },
        },
      });

      return result;
    });

    return updated;
  }

  async reject(offerId: string, ownerId: string) {
    const offer = await this.findOfferOrThrow(offerId);
    await this.assertListingOwner(offer.listingId, ownerId);

    if (offer.status !== OfferStatus.PENDING) {
      throw new ForbiddenException('Sadece bekleyen teklifler reddedilebilir');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.REJECTED },
        select: OFFER_SELECT,
      });

      await tx.notification.create({
        data: {
          userId: offer.contractorId,
          type: NotificationType.OFFER_REJECTED,
          title: 'Teklifiniz reddedildi',
          body: 'Başka ilanlara teklif verebilirsiniz.',
          data: { offerId, listingId: offer.listingId },
        },
      });

      return result;
    });

    return updated;
  }

  // ─── Yardımcılar ────────────────────────────────────────────────────────────

  private async findOfferOrThrow(offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        contractorId: true,
        listingId: true,
        status: true,
      },
    });

    if (!offer) throw new NotFoundException('Teklif bulunamadı');
    return offer;
  }

  private async assertListingOwner(listingId: string, userId: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { ownerId: true },
    });

    if (!listing || listing.ownerId !== userId) {
      throw new ForbiddenException('Bu işlemi yapmaya yetkiniz yok');
    }
  }
}
