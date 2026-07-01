import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ListingStatus, NotificationType, Prisma, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  userType: true,
  status: true,
  rejectionReason: true,
  adminNote: true,
  createdAt: true,
  emailVerifiedAt: true,
  individualVerification: { select: { id: true, nviVerified: true, createdAt: true } },
  companyVerification: { select: { id: true, companyTitle: true, taxNumber: true } },
  verificationDocuments: {
    select: { id: true, type: true, fileName: true, fileUrl: true, uploadedAt: true, reviewedAt: true, reviewNote: true },
    orderBy: { uploadedAt: 'desc' as const },
  },
  _count: { select: { listings: true, offers: true, payments: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Dashboard istatistikleri ─────────────────────────────────────────────

  async getStats() {
    const [
      totalUsers,
      pendingVerification,
      activeListings,
      totalPayments,
      revenueResult,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.PENDING_VERIFICATION } }),
      this.prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalUsers,
      pendingVerification,
      activeListings,
      totalPayments,
      totalRevenue: revenueResult._sum.amount ?? 0,
    };
  }

  // ─── Kullanıcı yönetimi ───────────────────────────────────────────────────

  async listUsers(dto: ListUsersDto) {
    const { page = 1, limit = 20, status, role, userType, q } = dto;

    const where: Prisma.UserWhereInput = {
      ...(status && { status }),
      ...(role && { role }),
      ...(userType && { userType }),
      ...(q && {
        OR: [
          { email: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
        ],
      }),
    };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return { items, meta: { total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) } };
  }

  async getUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: ADMIN_USER_SELECT,
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }

  async updateUserStatus(adminId: string, userId: string, dto: UpdateUserStatusDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: userId },
        data: {
          status: dto.status,
          ...(dto.reason && { rejectionReason: dto.reason }),
          ...(dto.adminNote && { adminNote: dto.adminNote }),
          ...(dto.status === UserStatus.ACTIVE && { approvedAt: new Date(), approvedById: adminId }),
        },
        select: { id: true, email: true, status: true },
      });

      // Kullanıcıya bildirim
      const notifMap: Partial<Record<UserStatus, { title: string; body: string }>> = {
        [UserStatus.ACTIVE]: {
          title: 'Hesabınız onaylandı',
          body: 'Profiliniz doğrulandı. Artık platformu tam olarak kullanabilirsiniz.',
        },
        [UserStatus.SUSPENDED]: {
          title: 'Hesabınız askıya alındı',
          body: dto.reason ?? 'Hesabınız geçici olarak askıya alındı.',
        },
      };

      const notif = notifMap[dto.status];
      if (notif) {
        await tx.notification.create({
          data: {
            userId,
            type: NotificationType.SYSTEM,
            title: notif.title,
            body: notif.body,
            data: {},
          },
        });
      }

      await tx.auditLog.create({
        data: {
          adminId,
          entityType: 'USER',
          entityId: userId,
          action: 'UPDATE_STATUS',
          before: { status: user.status },
          after: { status: dto.status, reason: dto.reason },
        },
      });

      return result;
    });

    return updated;
  }

  // ─── Doğrulama inceleme ──────────────────────────────────────────────────

  async listPendingVerifications() {
    return this.prisma.user.findMany({
      where: { status: UserStatus.PENDING_VERIFICATION },
      select: {
        ...ADMIN_USER_SELECT,
        verificationDocuments: {
          select: { id: true, type: true, fileName: true, fileUrl: true, uploadedAt: true, reviewedAt: true },
          orderBy: { uploadedAt: 'asc' as const },
        },
      },
      orderBy: { createdAt: 'asc' }, // en eski başvuru önce
    });
  }

  async reviewUserVerification(adminId: string, userId: string, dto: ReviewVerificationDto) {
    if (dto.action === 'reject' && !dto.reason) {
      throw new BadRequestException('Reddetme sebebi zorunludur');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new BadRequestException('Bu kullanıcının doğrulama beklemiyor');
    }

    const newStatus = dto.action === 'approve' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;

    return this.updateUserStatus(adminId, userId, {
      status: newStatus,
      reason: dto.reason,
    });
  }

  async reviewDocument(adminId: string, documentId: string, dto: ReviewVerificationDto) {
    if (dto.action === 'reject' && !dto.reason) {
      throw new BadRequestException('Reddetme notu zorunludur');
    }

    const doc = await this.prisma.verificationDocument.findUnique({
      where: { id: documentId },
      select: { id: true, reviewedAt: true },
    });

    if (!doc) throw new NotFoundException('Belge bulunamadı');
    if (doc.reviewedAt) throw new BadRequestException('Bu belge zaten incelendi');

    return this.prisma.verificationDocument.update({
      where: { id: documentId },
      data: {
        reviewedById: adminId,
        reviewedAt: new Date(),
        reviewNote: dto.reason,
      },
      select: { id: true, type: true, reviewedAt: true, reviewNote: true },
    });
  }

  // ─── İlan yönetimi ────────────────────────────────────────────────────────

  async listListings(page = 1, limit = 20, status?: ListingStatus) {
    const where: Prisma.ListingWhereInput = {
      ...(status ? { status } : {}),
    };

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const [total, items] = await this.prisma.$transaction([
      this.prisma.listing.count({ where }),
      this.prisma.listing.findMany({
        where,
        select: {
          id: true,
          title: true,
          city: true,
          status: true,
          dealType: true,
          createdAt: true,
          owner: { select: { id: true, fullName: true, email: true } },
          _count: { select: { offers: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
    ]);

    return { items, meta: { total, page: safePage, limit: safeLimit, pageCount: Math.ceil(total / safeLimit) } };
  }

  // ─── Ödeme yönetimi ──────────────────────────────────────────────────────

  async getPaymentStats() {
    const [total, completed, pending, totalRevenue] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'COMPLETED' } }),
    ]);
    return { total, completed, pending, totalRevenue: totalRevenue._sum.amount ?? 0 };
  }

  async listPayments(page = 1, limit = 20) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.payment.count(),
      this.prisma.payment.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, amount: true, currency: true, status: true, type: true,
          createdAt: true, providerRef: true,
          buyer: { select: { id: true, fullName: true, email: true } },
          offer: { select: { id: true, listing: { select: { title: true, city: true } } } },
        },
      }),
    ]);
    return { items, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }

  // ─── Dashboard trend verileri ─────────────────────────────────────────────

  async getDashboardTrends() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [usersByDay, listingsByDay, revenueByDay] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM users
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      this.prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM listings
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
      this.prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COALESCE(SUM(amount), 0)::float as total
        FROM payments
        WHERE "createdAt" >= ${thirtyDaysAgo} AND status = 'COMPLETED'
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `,
    ]);

    return { usersByDay, listingsByDay, revenueByDay };
  }

  // ─── Audit log ────────────────────────────────────────────────────────────

  async listAuditLogs(page = 1, limit = 20) {
    const [total, items] = await this.prisma.$transaction([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, entityType: true, entityId: true, action: true,
          note: true, ipAddress: true, createdAt: true,
          before: true, after: true,
          admin: { select: { id: true, fullName: true, email: true } },
        },
      }),
    ]);
    return { items, meta: { total, page, limit, pageCount: Math.ceil(total / limit) } };
  }

  // ─── Duyuru ───────────────────────────────────────────────────────────────

  async sendAnnouncement(adminId: string, title: string, body: string) {
    const users = await this.prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: 'ANNOUNCEMENT' as NotificationType,
        title,
        body,
      })),
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        entityType: 'ANNOUNCEMENT',
        entityId: 'all',
        action: 'SEND_ANNOUNCEMENT',
        after: { title, body, recipientCount: users.length },
      },
    });

    return { sent: users.length };
  }

  async setListingStatus(adminId: string, listingId: string, status: ListingStatus, reason?: string) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true },
    });

    if (!listing) throw new NotFoundException('İlan bulunamadı');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.listing.update({
        where: { id: listingId },
        data: { status },
        select: { id: true, title: true, status: true },
      });

      await tx.auditLog.create({
        data: {
          adminId,
          entityType: 'LISTING',
          entityId: listingId,
          action: 'UPDATE_STATUS',
          before: { status: listing.status },
          after: { status, reason },
        },
      });

      return result;
    });

    return updated;
  }
}
