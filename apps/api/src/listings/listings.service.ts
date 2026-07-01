import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListListingsDto } from './dto/list-listings.dto';

// İlanda hassas owner bilgisi açık listelerde gösterilmez
const PUBLIC_LISTING_SELECT = {
  id: true,
  title: true,
  city: true,
  district: true,
  neighborhood: true,
  areaM2: true,
  dealType: true,
  zoningType: true,
  floorCount: true,
  floorAreaRatio: true,
  askingPrice: true,
  status: true,
  createdAt: true,
  images: { select: { id: true, url: true, order: true }, orderBy: { order: 'asc' as const } },
  owner: { select: { id: true, fullName: true } },
  _count: { select: { offers: true } },
} satisfies Prisma.ListingSelect;

@Injectable()
export class ListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateListingDto) {
    const listing = await this.prisma.listing.create({
      data: {
        ...dto,
        ownerId,
        status: ListingStatus.DRAFT,
      },
      select: PUBLIC_LISTING_SELECT,
    });
    return listing;
  }

  async findAll(dto: ListListingsDto) {
    const {
      page = 1,
      limit = 20,
      city,
      district,
      dealType,
      zoningType,
      status = ListingStatus.ACTIVE,
      minArea,
      maxArea,
      minPrice,
      maxPrice,
      q,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = dto;

    const where: Prisma.ListingWhereInput = {
      status,
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(district && { district: { contains: district, mode: 'insensitive' } }),
      ...(dealType && { dealType }),
      ...(zoningType && { zoningType }),
      ...(minArea !== undefined || maxArea !== undefined
        ? { areaM2: { gte: minArea, lte: maxArea } }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? { askingPrice: { gte: minPrice, lte: maxPrice } }
        : {}),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const ALLOWED_SORT_FIELDS = ['createdAt', 'areaM2', 'askingPrice'] as const;
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy as any) ? sortBy : 'createdAt';
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const [total, items] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        select: PUBLIC_LISTING_SELECT,
        orderBy: { [safeSortBy]: sortOrder },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return {
      items,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        pageCount: Math.ceil(total / safeLimit),
      },
    };
  }

  async findOne(id: string, requesterId?: string, requesterRole?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: {
        ...PUBLIC_LISTING_SELECT,
        description: true,
        ownerId: true,
        documents: { select: { id: true, name: true, url: true } },
      },
    });

    if (!listing || listing.status === ListingStatus.DELETED) {
      throw new NotFoundException('İlan bulunamadı');
    }

    // Taslak ve kapalı ilanları sadece sahibi veya admin görebilir
    const isOwnerOrAdmin =
      (requesterId && listing.ownerId === requesterId) || requesterRole === 'ADMIN';

    if (listing.status !== ListingStatus.ACTIVE && !isOwnerOrAdmin) {
      throw new NotFoundException('İlan bulunamadı');
    }

    return listing;
  }

  async findMyListings(ownerId: string, page = 1, limit = 20) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.listing.count({ where: { ownerId, status: { not: ListingStatus.DELETED } } }),
      this.prisma.listing.findMany({
        where: { ownerId, status: { not: ListingStatus.DELETED } },
        select: { ...PUBLIC_LISTING_SELECT, description: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }

  async update(id: string, userId: string, userRole: string, dto: UpdateListingDto) {
    const listing = await this.findOneOrThrow(id);
    this.assertOwnerOrAdmin(listing.ownerId, userId, userRole);

    return this.prisma.listing.update({
      where: { id },
      data: dto,
      select: PUBLIC_LISTING_SELECT,
    });
  }

  async publish(id: string, userId: string, userRole: string) {
    const listing = await this.findOneOrThrow(id);
    this.assertOwnerOrAdmin(listing.ownerId, userId, userRole);

    if (listing.status !== ListingStatus.DRAFT) {
      throw new ForbiddenException('Sadece taslak ilanlar yayına alınabilir');
    }

    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.ACTIVE },
      select: PUBLIC_LISTING_SELECT,
    });
  }

  async close(id: string, userId: string, userRole: string) {
    const listing = await this.findOneOrThrow(id);
    this.assertOwnerOrAdmin(listing.ownerId, userId, userRole);

    return this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.CLOSED },
      select: PUBLIC_LISTING_SELECT,
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const listing = await this.findOneOrThrow(id);
    this.assertOwnerOrAdmin(listing.ownerId, userId, userRole);

    // Soft delete
    await this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.DELETED },
    });

    return { message: 'İlan silindi' };
  }

  // ─── Yardımcılar ────────────────────────────────────────────────────────────

  private async findOneOrThrow(id: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });

    if (!listing || listing.status === ListingStatus.DELETED) {
      throw new NotFoundException('İlan bulunamadı');
    }

    return listing;
  }

  private assertOwnerOrAdmin(ownerId: string, userId: string, userRole: string) {
    if (ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Bu işlemi yapmaya yetkiniz yok');
    }
  }
}
