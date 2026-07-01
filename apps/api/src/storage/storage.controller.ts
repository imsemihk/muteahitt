import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListingStatus, UserRole } from '@prisma/client';
import { StorageService } from './storage.service';
import { PresignedUrlDto } from './dto/presigned-url.dto';
import { ConfirmListingImageDto } from './dto/confirm-upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  // 1. Adım: Frontend presigned URL ister
  @Post('presigned-url')
  @ApiOperation({ summary: 'R2 presigned upload URL al (5 dakika geçerli)' })
  async getPresignedUrl(@Body() dto: PresignedUrlDto) {
    try {
      return await this.storage.getPresignedUploadUrl(dto.folder, dto.contentType, dto.fileSizeBytes);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'URL üretilemedi');
    }
  }

  // 2. Adım: Frontend R2'ye yükledi, key'i API'ye bildiriyor
  @Post('confirm/listing-image')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAND_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'İlan görseli yüklemesini onayla — DB kaydı oluşturulur' })
  async confirmListingImage(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: ConfirmListingImageDto,
  ) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
      select: { ownerId: true, status: true },
    });

    if (!listing || listing.status === ListingStatus.DELETED) {
      throw new BadRequestException('İlan bulunamadı');
    }

    if (listing.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new BadRequestException('Yetkiniz yok');
    }

    const image = await this.prisma.listingImage.create({
      data: {
        listingId: dto.listingId,
        key: dto.key,
        url: this.storage.getPublicUrl(dto.key),
        order: dto.order ?? 0,
      },
      select: { id: true, url: true, order: true },
    });

    return image;
  }

  // Görsel sil
  @Delete('listing-image/:imageId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.LAND_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'İlan görselini sil' })
  async deleteListingImage(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Param('imageId') imageId: string,
  ) {
    const image = await this.prisma.listingImage.findUnique({
      where: { id: imageId },
      include: { listing: { select: { ownerId: true } } },
    });

    if (!image) throw new BadRequestException('Görsel bulunamadı');

    if (image.listing.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new BadRequestException('Yetkiniz yok');
    }

    await Promise.all([
      this.storage.deleteObject(image.key),
      this.prisma.listingImage.delete({ where: { id: imageId } }),
    ]);

    return { message: 'Görsel silindi' };
  }
}
