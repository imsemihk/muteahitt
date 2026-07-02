import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: Resend | null = null;

  constructor(private config: ConfigService) {}

  private getClient(): Resend | null {
    if (this.client) return this.client;
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY tanımlı değil — e-posta gönderimi devre dışı');
      return null;
    }
    this.client = new Resend(apiKey);
    return this.client;
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/auth/verify-email?token=${token}`;
    await this.send(to, 'E-posta adresinizi doğrulayın — müteahitt', this.verificationTemplate(url));
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = `${this.config.get('FRONTEND_URL')}/auth/reset-password?token=${token}`;
    await this.send(to, 'Şifrenizi sıfırlayın — müteahitt', this.resetTemplate(url));
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const client = this.getClient();
    if (!client) return;

    const from = this.config.get('RESEND_FROM') ?? 'müteahitt <noreply@muteahitt.com>';

    try {
      const { error } = await client.emails.send({ from, to, subject, html });
      if (error) this.logger.error(`Resend hatası: ${to}`, error);
    } catch (err) {
      this.logger.error(`E-posta gönderilemedi: ${to}`, err);
    }
  }

  private verificationTemplate(url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
        <h2 style="color:#f97316;margin-bottom:8px">müteahitt</h2>
        <p style="color:#374151;font-size:16px">Merhaba,</p>
        <p style="color:#374151;font-size:16px">Hesabınızı doğrulamak için aşağıdaki butona tıklayın:</p>
        <a href="${url}" style="display:inline-block;background:#f97316;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;margin:20px 0;font-weight:600;font-size:15px">
          E-postamı Doğrula
        </a>
        <p style="color:#6b7280;font-size:13px">Bu bağlantı 24 saat geçerlidir. Eğer bu isteği siz yapmadıysanız görmezden gelebilirsiniz.</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">© 2026 müteahitt — Türkiye'nin inşaat sektörü platformu</p>
      </div>
    `;
  }

  private resetTemplate(url: string): string {
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:32px;border-radius:12px">
        <h2 style="color:#f97316;margin-bottom:8px">müteahitt</h2>
        <p style="color:#374151;font-size:16px">Merhaba,</p>
        <p style="color:#374151;font-size:16px">Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
        <a href="${url}" style="display:inline-block;background:#f97316;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;margin:20px 0;font-weight:600;font-size:15px">
          Şifremi Sıfırla
        </a>
        <p style="color:#6b7280;font-size:13px">Bu bağlantı 1 saat geçerlidir. Bu isteği siz yapmadıysanız güvenliğiniz için şifrenizi değiştirin.</p>
        <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0"/>
        <p style="color:#9ca3af;font-size:12px">© 2026 müteahitt — Türkiye'nin inşaat sektörü platformu</p>
      </div>
    `;
  }
}
