import { BadRequestException, Injectable } from '@nestjs/common';

// Teklif mesajlarında yasak içerik kontrolü.
// Telefon, e-posta ve sosyal medya hesapları iletişim kilidini atlatmayı önlemek için engellenir.
const PHONE_PATTERN = /(\+90|0)?\s*[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const SOCIAL_PATTERN = /instagram|whatsapp|telegram|twitter|facebook|linkedin|tiktok/i;
const URL_PATTERN = /https?:\/\/|www\./i;

const FORBIDDEN_KEYWORDS = [
  'arayın', 'arayınız', 'mesaj atın', 'dm atın', 'direkt mesaj',
  'numaramı', 'numaram', 'iletişime geçin', 'iletisime gecin',
];

export interface FilterResult {
  passed: boolean;
  reason?: string;
}

@Injectable()
export class ContentFilterService {
  check(text: string): FilterResult {
    if (PHONE_PATTERN.test(text)) {
      return { passed: false, reason: 'Teklif mesajına telefon numarası eklenemez' };
    }
    if (EMAIL_PATTERN.test(text)) {
      return { passed: false, reason: 'Teklif mesajına e-posta adresi eklenemez' };
    }
    if (URL_PATTERN.test(text)) {
      return { passed: false, reason: 'Teklif mesajına bağlantı eklenemez' };
    }
    if (SOCIAL_PATTERN.test(text)) {
      return { passed: false, reason: 'Teklif mesajına sosyal medya adı eklenemez' };
    }
    const lower = text.toLowerCase();
    const hit = FORBIDDEN_KEYWORDS.find((kw) => lower.includes(kw));
    if (hit) {
      return { passed: false, reason: `Teklif mesajında yasak ifade: "${hit}"` };
    }
    return { passed: true };
  }

  assertClean(text: string): void {
    const result = this.check(text);
    if (!result.passed) throw new BadRequestException(result.reason);
  }
}
