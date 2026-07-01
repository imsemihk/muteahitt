import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export type UploadFolder = 'listings' | 'documents' | 'avatars';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20 MB
const PRESIGNED_URL_TTL = 300; // 5 dakika

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow('R2_BUCKET_NAME');
    this.publicUrl = config.getOrThrow('R2_PUBLIC_URL');

    this.client = new S3Client({
      region: 'auto',
      endpoint: config.getOrThrow('R2_ENDPOINT'),
      credentials: {
        accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  // Frontend'in doğrudan R2'ye yüklemek için kullandığı presigned PUT URL
  async getPresignedUploadUrl(
    folder: UploadFolder,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    this.validateUpload(folder, contentType, fileSizeBytes);

    const ext = contentType.split('/')[1] ?? 'bin';
    const key = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: PRESIGNED_URL_TTL });

    return {
      uploadUrl,
      key,
      publicUrl: `${this.publicUrl}/${key}`,
    };
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.error(`R2 silme hatası: ${key}`, err);
    }
  }

  // Key'den public URL türetir
  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  private validateUpload(folder: UploadFolder, contentType: string, size: number): void {
    if (folder === 'listings' || folder === 'avatars') {
      if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
        throw new Error(`Desteklenmeyen dosya tipi. İzin verilenler: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
      }
      if (size > MAX_IMAGE_SIZE) {
        throw new Error('Görsel boyutu 10 MB\'ı aşamaz');
      }
    } else if (folder === 'documents') {
      if (!ALLOWED_DOC_TYPES.includes(contentType)) {
        throw new Error(`Desteklenmeyen dosya tipi. İzin verilenler: PDF, JPEG, PNG`);
      }
      if (size > MAX_DOC_SIZE) {
        throw new Error('Belge boyutu 20 MB\'ı aşamaz');
      }
    }
  }
}
