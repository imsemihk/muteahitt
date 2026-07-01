import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ListingStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { ListUsersDto } from './dto/list-users.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Dashboard ────────────────────────────────────────────────────────────

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  // ─── Kullanıcı yönetimi ──────────────────────────────────────────────────

  @Get('users')
  listUsers(@Query() dto: ListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/status')
  updateUserStatus(
    @CurrentUser() admin: { id: string },
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(admin.id, userId, dto);
  }

  // ─── Doğrulama inceleme ──────────────────────────────────────────────────

  @Get('verifications/pending')
  listPendingVerifications() {
    return this.adminService.listPendingVerifications();
  }

  @Post('verifications/:userId/review')
  reviewVerification(
    @CurrentUser() admin: { id: string },
    @Param('userId') userId: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.adminService.reviewUserVerification(admin.id, userId, dto);
  }

  @Post('documents/:documentId/review')
  reviewDocument(
    @CurrentUser() admin: { id: string },
    @Param('documentId') documentId: string,
    @Body() dto: ReviewVerificationDto,
  ) {
    return this.adminService.reviewDocument(admin.id, documentId, dto);
  }

  // ─── İlan yönetimi ────────────────────────────────────────────────────────

  @Get('listings')
  listListings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: ListingStatus,
  ) {
    return this.adminService.listListings(page, limit, status);
  }

  @Patch('listings/:id/status')
  setListingStatus(
    @CurrentUser() admin: { id: string },
    @Param('id') listingId: string,
    @Body() body: { status: ListingStatus; reason?: string },
  ) {
    return this.adminService.setListingStatus(admin.id, listingId, body.status, body.reason);
  }

  // ─── Ödemeler ────────────────────────────────────────────────────────────

  @Get('payments/stats')
  getPaymentStats() {
    return this.adminService.getPaymentStats();
  }

  @Get('payments')
  getPayments(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.listPayments(Number(page) || 1, Number(limit) || 20);
  }

  // ─── Dashboard trends ─────────────────────────────────────────────────────

  @Get('dashboard/trends')
  getDashboardTrends() {
    return this.adminService.getDashboardTrends();
  }

  // ─── Audit logs ──────────────────────────────────────────────────────────

  @Get('audit-logs')
  getAuditLogs(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.adminService.listAuditLogs(Number(page) || 1, Number(limit) || 20);
  }

  // ─── Duyurular ───────────────────────────────────────────────────────────

  @Post('announcements')
  sendAnnouncement(@Request() req: any, @Body() body: { title: string; body: string }) {
    return this.adminService.sendAnnouncement(req.user.id, body.title, body.body);
  }
}
