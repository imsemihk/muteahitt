import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export type UploadFolder = 'listings' | 'documents' | 'avatars';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOC_SIZE = 20 * 1024 * 1024;
const PRESIGNED_URL_TTL = 300;

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;
  private bucket: string | null = null;
  private publicUrl: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): { client: S3Client; bucket: string; publicUrl: string } | null {
    if (this.client && this.bucket && this.publicUrl) {
      return { client: this.client, bucket: this.bucket, publicUrl: this.publicUrl };
    }

    const endpoint = this.config.get<string>('R2_ENDPOINT');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET_NAME');
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL');

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      this.logger.warn('R2 yapılandırması eksik — dosya yükleme devre dışı');
      return null;
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl;
    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    return { client: this.client, bucket: this.bucket, publicUrl: this.publicUrl };
  }

  async getPresignedUploadUrl(
    folder: UploadFolder,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    this.validateUpload(folder, contentType, fileSizeBytes);

    const storage = this.getClient();
    if (!storage) throw new Error('Dosya yükleme servisi şu an kullanılamıyor');

    const ext = contentType.split('/')[1] ?? 'bin';
    const key = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
    });

    const uploadUrl = await getSignedUrl(storage.client, command, { expiresIn: PRESIGNED_URL_TTL });

    return { uploadUrl, key, publicUrl: `${storage.publicUrl}/${key}` };
  }

  async deleteObject(key: string): Promise<void> {
    const storage = this.getClient();
    if (!storage) return;
    try {
      await storage.client.send(new DeleteObjectCommand({ Bucket: storage.bucket, Key: key }));
    } catch (err) {
      this.logger.error(`R2 silme hatası: ${key}`, err);
    }
  }

  getPublicUrl(key: string): string {
    const pub = this.config.get<string>('R2_PUBLIC_URL') ?? '';
    return `${pub}/${key}`;
  }

  private validateUpload(folder: UploadFolder, contentType: string, size: number): void {
    if (folder === 'listings' || folder === 'avatars') {
      if (!ALLOWED_IMAGE_TYPES.includes(contentType))
        throw new Error(`Desteklenmeyen dosya tipi. İzin verilenler: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
      if (size > MAX_IMAGE_SIZE) throw new Error("Görsel boyutu 10 MB'ı aşamaz");
    } else if (folder === 'documents') {
      if (!ALLOWED_DOC_TYPES.includes(contentType))
        throw new Error('Desteklenmeyen dosya tipi. İzin verilenler: PDF, JPEG, PNG');
      if (size > MAX_DOC_SIZE) throw new Error("Belge boyutu 20 MB'ı aşamaz");
    }
  }
}
