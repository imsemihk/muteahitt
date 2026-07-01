import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM için önerilen
const TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bit

// Şifreli veri formatı: iv(12) + tag(16) + ciphertext — hex encoding
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const rawKey = config.getOrThrow<string>('ENCRYPTION_KEY');
    // Hex string olarak saklanır (64 karakter = 32 byte)
    if (rawKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY 64 karakterlik hex string olmalıdır (32 byte)');
    }
    this.key = Buffer.from(rawKey, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // iv + tag + ciphertext → hex
    return Buffer.concat([iv, tag, encrypted]).toString('hex');
  }

  decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'hex');

    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
    decipher.setAuthTag(tag);

    return decipher.update(encrypted) + decipher.final('utf8');
  }
}
