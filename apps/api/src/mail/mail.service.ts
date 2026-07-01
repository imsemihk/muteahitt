import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.logger.warn('SMTP_HOST tanımlı değil — e-posta gönderimi devre dışı');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });

    return this.transporter;
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/auth/verify-email?token=${token}`;
    await this.send(to, 'E-posta adresinizi doğrulayın', this.verificationTemplate(url));
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;
    await this.send(to, 'Şifrenizi sıfırlayın', this.resetTemplate(url));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const transporter = this.getTransporter();
    if (!transporter) return;

    try {
      await transporter.sendMail({
        from: `"müteahitt" <${this.config.get('SMTP_FROM') ?? 'noreply@muteahitt.com'}>`,
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`E-posta gönderilemedi: ${to}`, err);
    }
  }

  private verificationTemplate(url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#f97316">müteahitt</h2>
        <p>Hesabınızı doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${url}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          E-postamı Doğrula
        </a>
        <p style="color:#6b7280;font-size:14px">Bu bağlantı 24 saat geçerlidir.</p>
      </div>
    `;
  }

  private resetTemplate(url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#f97316">müteahitt</h2>
        <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
        <a href="${url}" style="display:inline-block;background:#f97316;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Şifremi Sıfırla
        </a>
        <p style="color:#6b7280;font-size:14px">Bu bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız görmezden gelin.</p>
      </div>
    `;
  }
}
