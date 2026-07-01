import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { StorageService } from '../storage/storage.service';
import { IndividualVerificationDto } from './dto/individual-verification.dto';
import { CompanyVerificationDto } from './dto/company-verification.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly storage: StorageService,
  ) {}

  // Bireysel doğrulama bilgilerini kaydet (TC şifreli)
  async submitIndividual(userId: string, dto: IndividualVerificationDto) {
    const existing = await this.prisma.individualVerification.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Bireysel doğrulama bilgisi zaten mevcut');
    }

    // TC kimlik numarasını AES-256-GCM ile şifrele — ham değer asla yazılmaz
    const encryptedTc = this.encryption.encrypt(dto.tcNumber);

    await this.prisma.$transaction([
      this.prisma.individualVerification.create({
        data: {
          userId,
          tcNumber: encryptedTc,
          dateOfBirth: new Date(dto.dateOfBirth),
          nationality: dto.nationality ?? 'TR',
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.PENDING_VERIFICATION },
      }),
    ]);

    return { message: 'Bireysel doğrulama bilgisi kaydedildi. Belgelerinizi yükleyin.' };
  }

  // Şirket doğrulama bilgilerini kaydet
  async submitCompany(userId: string, dto: CompanyVerificationDto) {
    const existing = await this.prisma.companyVerification.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictException('Şirket doğrulama bilgisi zaten mevcut');
    }

    const existingTax = await this.prisma.companyVerification.findFirst({
      where: { taxNumber: dto.taxNumber },
    });

    if (existingTax) {
      throw new ConflictException('Bu vergi numarası ile kayıtlı bir şirket zaten var');
    }

    await this.prisma.$transaction([
      this.prisma.companyVerification.create({
        data: { userId, ...dto },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.PENDING_VERIFICATION },
      }),
    ]);

    return { message: 'Şirket doğrulama bilgisi kaydedildi. Belgelerinizi yükleyin.' };
  }

  // Belge yükle (R2'ye yüklendi, burada DB kaydı oluşturulur)
  async uploadDocument(userId: string, dto: UploadDocumentDto) {
    const document = await this.prisma.verificationDocument.create({
      data: {
        userId,
        type: dto.type,
        key: dto.key,
        fileUrl: this.storage.getPublicUrl(dto.key),
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        fileSizeBytes: dto.fileSizeBytes,
      },
      select: {
        id: true,
        type: true,
        fileName: true,
        fileUrl: true,
        uploadedAt: true,
      },
    });

    return document;
  }

  // Doğrulama durumunu getir
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        status: true,
        rejectionReason: true,
        individualVerification: {
          select: { id: true, nviVerified: true, nviCheckedAt: true, createdAt: true },
        },
        companyVerification: {
          select: { id: true, companyTitle: true, taxNumber: true, createdAt: true },
        },
        verificationDocuments: {
          select: {
            id: true,
            type: true,
            fileName: true,
            uploadedAt: true,
            reviewedAt: true,
            reviewNote: true,
          },
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    return user;
  }

  // Belge sil (sadece incelenmemişleri)
  async deleteDocument(userId: string, documentId: string) {
    const doc = await this.prisma.verificationDocument.findUnique({
      where: { id: documentId },
      select: { userId: true, reviewedAt: true, key: true },
    });

    if (!doc || doc.userId !== userId) {
      throw new BadRequestException('Belge bulunamadı');
    }

    if (doc.reviewedAt) {
      throw new BadRequestException('İncelenmiş belgeler silinemez');
    }

    await Promise.all([
      this.storage.deleteObject(doc.key),
      this.prisma.verificationDocument.delete({ where: { id: documentId } }),
    ]);

    return { message: 'Belge silindi' };
  }
}
