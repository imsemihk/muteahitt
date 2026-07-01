import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL = 60 * 60 * 24 * 7; // 7 gün
const EMAIL_VERIFY_TTL = 60 * 60 * 24; // 24 saat
const PASSWORD_RESET_TTL = 60 * 60; // 1 saat

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Bu e-posta adresi zaten kullanılıyor');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const role = dto.role === UserRole.CONTRACTOR ? UserRole.CONTRACTOR : UserRole.LAND_OWNER;

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        userType: dto.userType,
        role,
        status: UserStatus.PENDING_EMAIL,
      },
      select: { id: true, email: true, fullName: true },
    });

    await this.sendEmailVerification(user.id, user.email);

    return { message: 'Kayıt başarılı. Lütfen e-postanızı doğrulayın.' };
  }

  async verifyEmail(token: string) {
    const tokenHash = this.hashToken(token);

    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Doğrulama bağlantısı geçersiz veya süresi dolmuş');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.delete({ where: { tokenHash } }),
    ]);

    return { message: 'E-posta başarıyla doğrulandı' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }

    if (user.status === UserStatus.PENDING_EMAIL) {
      throw new UnauthorizedException('Lütfen önce e-posta adresinizi doğrulayın');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('Hesabınız askıya alınmıştır');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return tokens;
  }

  async refresh(userId: string, jti: string) {
    // Önce kullanıcıyı doğrula; sonra token'ı sil.
    // Ters sıra token limbo'ya yol açıyordu: del başarılı ama DB hatası → kullanıcı kalıcı çıkış.
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status === UserStatus.BANNED) {
      throw new UnauthorizedException();
    }

    // Rotation: eski token'ı geçersiz kıl, yeni çift üret
    await this.redis.del(`refresh:${userId}:${jti}`);

    return this.generateTokens(user.id, user.email, user.role);
  }

  async logout(userId: string, jti: string) {
    await this.redis.del(`refresh:${userId}:${jti}`);
    return { message: 'Çıkış yapıldı' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Güvenlik: kullanıcı bulunsun ya da bulunmasın aynı yanıtı ver
    if (!user) return { message: 'Şifre sıfırlama bağlantısı gönderildi' };

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL * 1000);

    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.mail.sendPasswordReset(email, token);

    return { message: 'Şifre sıfırlama bağlantısı gönderildi' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);

    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Bağlantı geçersiz veya süresi dolmuş');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({ where: { tokenHash } }),
    ]);

    // Tüm refresh token'larını geçersiz kıl
    const keys = await this.redis.keys(`refresh:${record.userId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);

    return { message: 'Şifreniz başarıyla güncellendi' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.status !== UserStatus.PENDING_EMAIL) {
      return { message: 'Doğrulama e-postası gönderildi' };
    }

    await this.sendEmailVerification(user.id, user.email);
    return { message: 'Doğrulama e-postası tekrar gönderildi' };
  }

  // ─── Özel yardımcılar ────────────────────────────────────────────────────────

  private async generateTokens(userId: string, email: string, role: string) {
    const jti = uuidv4();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email, role },
        {
          secret: this.config.getOrThrow('JWT_SECRET'),
          expiresIn: '15m',
        },
      ),
      this.jwt.signAsync(
        { sub: userId, jti },
        {
          secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);

    await this.redis.set(`refresh:${userId}:${jti}`, '1', REFRESH_TTL);

    return { accessToken, refreshToken };
  }

  private async sendEmailVerification(userId: string, email: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + EMAIL_VERIFY_TTL * 1000);

    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    await this.mail.sendEmailVerification(email, token);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
