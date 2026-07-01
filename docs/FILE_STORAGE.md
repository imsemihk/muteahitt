# FILE_STORAGE.md — Dosya ve Medya Yönetimi

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Depolama Sağlayıcısı: Cloudflare R2

### 1.1 Neden R2?

| Kriter                 | Cloudflare R2       | AWS S3            |
|------------------------|---------------------|-------------------|
| Egress ücreti          | **Ücretsiz**        | $0.09/GB          |
| Storage ücreti         | $0.015/GB/ay        | $0.023/GB/ay      |
| S3 uyumlu API          | Evet                | Native            |
| Türkiye'ye yakınlık    | EU-West POP         | EU-West-1         |
| CDN entegrasyonu       | Cloudflare CDN      | CloudFront (ücretli)|
| Bant genişliği         | **CDN ücretsiz**    | Ücretli           |

Fotoğraf yoğun bir platform için egress ücretsizliği kritik maliyet avantajıdır.

### 1.2 Bucket Yapısı

```
Üretim (production):
  muteahitt-media-prod        ← Herkese açık: ilan fotoğrafları
  muteahitt-docs-prod         ← Gizli: kimlik ve şirket belgeleri
  muteahitt-avatars-prod      ← Herkese açık: profil fotoğrafları

Staging:
  muteahitt-media-staging
  muteahitt-docs-staging
  muteahitt-avatars-staging
```

**Kural:** `*-docs-*` bucket'ları asla public erişime açılmaz.
Yalnızca presigned URL ile geçici erişim verilir.

---

## 2. Yükleme Mimarisi

### 2.1 Presigned URL Akışı

Büyük dosyalar API sunucusundan geçirilmez. Client doğrudan R2'ye yükler:

```
1. Client → API
   POST /upload/presign
   { fileType: "image/jpeg", fileSize: 1048576, context: "listing-image" }

2. API:
   - Dosya tipi ve boyutu doğrula
   - Rastgele UUID ile dosya anahtarı üret: listings/{uuid}.jpg
   - R2'ye presigned PUT URL oluştur (süre: 5 dakika)
   - Client'a gönder

3. Client → R2 (Doğrudan)
   PUT {presignedUrl}
   Content-Type: image/jpeg
   Body: [dosya içeriği]

4. Client → API
   POST /upload/confirm
   { fileKey: "listings/uuid.jpg", context: "listing-image" }

5. API:
   - FileKey'i doğrula (kendi ürettiği key mi?)
   - Veritabanına kaydet
   - CDN URL'ini döndür
```

**Neden confirm adımı?**
R2'ye yükleme doğrudan yapılır; API yüklemenin tamamlandığını bilemez.
Confirm adımı olmadan veritabanına geçersiz URL kaydedilebilir.

### 2.2 Presign Endpoint

```typescript
// upload/upload.service.ts

async presignUpload(dto: PresignDto, userId: string) {
  const { fileType, fileSize, context } = dto;

  // Tip kontrolü
  const allowedTypes = UPLOAD_RULES[context]?.allowedTypes;
  if (!allowedTypes?.includes(fileType)) {
    throw new BadRequestException(`${fileType} bu context için geçersiz.`);
  }

  // Boyut kontrolü
  const maxSize = UPLOAD_RULES[context]?.maxSizeBytes;
  if (fileSize > maxSize) {
    throw new BadRequestException(
      `Maksimum dosya boyutu: ${maxSize / 1_048_576}MB`
    );
  }

  // Magic bytes doğrulaması için işaretleme (confirm adımında yapılır)
  const fileKey = `${UPLOAD_PATHS[context]}/${userId}/${randomUUID()}${ext(fileType)}`;

  const presignedUrl = await this.r2.presignedPutUrl(fileKey, {
    expiresIn: 300,         // 5 dakika
    maxContentLength: maxSize,
    contentType: fileType,
  });

  // Geçici token kaydı (confirm adımında doğrulama için)
  await this.redis.setex(`upload:${fileKey}`, 600, userId);

  return { presignedUrl, fileKey };
}
```

---

## 3. Yükleme Kuralları

```typescript
// upload/upload.rules.ts

export const UPLOAD_RULES = {
  'listing-image': {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 2 * 1024 * 1024,   // 2MB
    maxCount: 10,                     // İlan başına max fotoğraf
    bucket: 'media',                  // public bucket
  },
  'listing-document': {
    allowedTypes: ['application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,  // 10MB
    maxCount: 5,
    bucket: 'docs',                   // private bucket
  },
  'verification-document': {
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,  // 10MB
    maxCount: 10,
    bucket: 'docs',                   // private bucket
  },
  'avatar': {
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 2 * 1024 * 1024,   // 2MB
    maxCount: 1,
    bucket: 'avatars',               // public bucket
  },
};

export const UPLOAD_PATHS = {
  'listing-image':          'listings',
  'listing-document':       'listing-docs',
  'verification-document':  'verification',
  'avatar':                 'avatars',
};
```

---

## 4. Magic Bytes Doğrulaması

Content-Type header sahte olabilir. Gerçek format tespiti için
dosyanın ilk birkaç byte'ı (magic bytes) okunur:

```typescript
// upload/magic-bytes.validator.ts
import { fileTypeFromBuffer } from 'file-type';

export async function validateMagicBytes(
  buffer: Buffer,
  declaredMimeType: string
): Promise<void> {
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    throw new UnsupportedMediaTypeException('Dosya formatı tanınamadı.');
  }

  if (detected.mime !== declaredMimeType) {
    throw new UnsupportedMediaTypeException(
      `Gerçek format (${detected.mime}) beyan edilen formatla (${declaredMimeType}) eşleşmiyor.`
    );
  }
}
```

**Uygulama:** R2'ye yükleme doğrudan yapıldığı için magic bytes kontrolü
`/upload/confirm` adımında yapılır. API, R2'den dosyanın ilk 261 byte'ını
okuyarak doğrular (tam dosyayı indirmez).

---

## 5. Görüntü Optimizasyonu

### 5.1 Client-Side Compress (Frontend)

Fotoğraf yüklemeden önce tarayıcıda sıkıştırılır:

```typescript
// web/lib/upload/compress-image.ts
import Compressor from 'compressorjs';

export function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      convertSize: 1_000_000,   // 1MB'dan büyükse JPEG'e çevir
      success: resolve,
      error: reject,
    });
  });
}
```

**Hedefler:** Max 1920px genişlik, %80 kalite, ~200-500KB/fotoğraf.

### 5.2 Cloudflare Image Resizing (CDN'de)

Farklı boyutlar için CDN'de anlık resize:

```
Orijinal:
  https://cdn.muteahitt.com/listings/uuid.jpg

Thumbnail (300x200):
  https://cdn.muteahitt.com/cdn-cgi/image/width=300,height=200,fit=cover/listings/uuid.jpg

Kart görünümü (800x600):
  https://cdn.muteahitt.com/cdn-cgi/image/width=800,height=600,fit=cover/listings/uuid.jpg

Lightbox (original):
  https://cdn.muteahitt.com/listings/uuid.jpg
```

**Cloudflare Image Resizing:** Cloudflare Pro plan ile gelir ($20/ay).
MVP'de standart boyut kullanılır, Pro plan v1.5'te aktifleştirilir.

---

## 6. CDN Konfigürasyonu

### 6.1 Public Bucket — CDN Üzerinden Servis

```
R2 Bucket: muteahitt-media-prod
Cloudflare Workers Route: cdn.muteahitt.com → R2

Cache kuralı:
  - Fotoğraflar: Cache-Control: public, max-age=31536000 (1 yıl)
  - Avatarlar: Cache-Control: public, max-age=86400 (1 gün)

Neden farklı? Avatarlar değişebilir. Fotoğraflar UUID ile
yeniden adlandırıldığından değişmez (immutable).
```

### 6.2 Private Bucket — Presigned URL ile Erişim

```typescript
// r2/r2.service.ts

async getSignedUrl(fileKey: string, expiresInSeconds = 900): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_PRIVATE_BUCKET,
    Key: fileKey,
  });

  return getSignedUrl(this.s3Client, command, {
    expiresIn: expiresInSeconds,
  });
}
```

Doğrulama belgelerini görüntülemek isteyen admin:
- Backend'den 15 dakika geçerli presigned URL alır
- URL doğrudan R2'ye gider (CDN bypass)
- 15 dakika sonra URL geçersizleşir

---

## 7. Dosya Silme Politikası

### 7.1 İlan Silindiğinde

```
Listing soft-delete yapıldı
      │
      ▼
Anlık silme YOK (fotoğraflar saklanır)

30 gün sonra çalışan cron job:
  - deleted_at > 30 gün olan listing'lerin fotoğrafları R2'den silinir
  - listing_images ve listing_documents kayıtları hard-delete edilir

Gerekçe: Admin yanlışlıkla silme durumuna karşı 30 gün tolerans
```

### 7.2 Kullanıcı Hesabı Silindiğinde (KVKK)

```
Anonymization akışında:
  1. Profil fotoğrafı → anında R2'den silinir
  2. Doğrulama belgeleri → anında R2'den silinir
  3. İlan fotoğrafları → anonymization flag ile işaretlenir
     (ilanlar anonimleştirilir ama fotoğraflar 30 gün bekler)

Detay: bkz. KVKK_AND_LEGAL.md §8
```

### 7.3 Doğrulama Belgeleri Saklama Süresi

```
KVKK saklama süresi: Hesap kapanmasından sonra 5 yıl
(yasal uyum belgesi niteliği taşıdığından)

Cron job: Her ay
  verification_documents WHERE
    user.deleted_at < NOW() - INTERVAL '5 years'
  → R2'den fiziksel sil
  → DB kaydını hard-delete
```

---

## 8. Depolama Maliyet Tahmini

```
Varsayımlar (Ay 12):
  Aktif ilan: 500
  İlan başına ortalama fotoğraf: 6
  Ortalama fotoğraf boyutu: 400KB
  Doğrulama belgesi: 2.000 kullanıcı × 3 belge × 500KB

Hesap:
  İlan fotoğrafları: 500 × 6 × 400KB = 1,2 GB
  Eski ilanlar (birikmiş): ~5 GB
  Doğrulama belgeleri: 2.000 × 3 × 500KB = 3 GB
  Avatarlar: 2.000 × 100KB = 200 MB
  ─────────────────────────────────────────
  Toplam depolama: ~10 GB

Cloudflare R2 Maliyet:
  Depolama: 10 GB × $0.015 = $0.15/ay
  Operasyon: 1M istek × $0.0036 = $3.60/ay
  Egress: ÜCRETSIZ
  ─────────────────────────────────────────
  Tahmini aylık: ~$4 (yaklaşık ₺130)
```

---

## 9. Monitoring

```
İzlenecek metrikler:
  - R2 bucket boyutu (aylık artış)
  - Presign isteği sayısı (upload hacmi)
  - Başarısız upload oranı
  - CDN cache hit rate (hedef: %90+)
  - Presigned URL süresi dolmadan önce tamamlanan upload yüzdesi
```

---

## 10. Geliştirici Rehberi

### 10.1 Lokal Geliştirme

R2'ye lokal erişim için MinIO kullanılır:

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  minio_data:
```

```env
# apps/api/.env.local
R2_ENDPOINT=http://localhost:9000
R2_ACCESS_KEY_ID=minioadmin
R2_SECRET_ACCESS_KEY=minioadmin
R2_MEDIA_BUCKET=muteahitt-media-local
R2_DOCS_BUCKET=muteahitt-docs-local
R2_PUBLIC_URL=http://localhost:9000/muteahitt-media-local
```

### 10.2 R2Service Arayüzü

```typescript
// r2/r2.service.ts — public interface

interface R2Service {
  // Presigned upload URL (PUT)
  presignedPutUrl(key: string, options: PutOptions): Promise<string>;

  // Presigned download URL (GET) — private bucket
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  // Public CDN URL — public bucket
  getPublicUrl(key: string): string;

  // Dosya sil
  delete(key: string): Promise<void>;

  // Çoklu sil
  deleteMany(keys: string[]): Promise<void>;

  // İlk N byte oku (magic bytes kontrolü için)
  readPartial(key: string, bytes: number): Promise<Buffer>;
}
```
