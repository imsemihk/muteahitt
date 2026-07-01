import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PROFILE_SELECT = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  avatarUrl: true,
  role: true,
  userType: true,
  status: true,
  emailVerifiedAt: true,
  createdAt: true,
  individualVerification: {
    select: { id: true, nviVerified: true, createdAt: true },
  },
  companyVerification: {
    select: {
      id: true,
      companyTitle: true,
      taxNumber: true,
      companyType: true,
      city: true,
      createdAt: true,
    },
  },
  verificationDocuments: {
    select: { id: true, type: true, fileName: true, uploadedAt: true, reviewedAt: true, reviewNote: true },
    orderBy: { uploadedAt: 'desc' as const },
  },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });

    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: PROFILE_SELECT,
    });
  }
}
