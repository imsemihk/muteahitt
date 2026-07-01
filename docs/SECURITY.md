# SECURITY.md — Güvenlik Mimarisi ve Politikaları

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Güvenlik Felsefesi

müteahitt.com üç kritik veri türünü işler:

1. **Kişisel kimlik bilgisi** — TC kimlik numarası, vergi kimliği
2. **Finansal işlem verisi** — Ödeme kayıtları, iletişim erişim geçmişi
3. **Ticari sır** — Müteahhit teklifleri, arsa değerlemeleri

Bu veri türleri nedeniyle güvenlik, sonradan eklenen bir özellik değil,
**baştan tasarıma gömülü bir gereksinim** olarak ele alınır.

**Temel prensipler:**
- **Defense in Depth:** Tek bir güvenlik katmanı asla yeterli değildir.
- **Least Privilege:** Her bileşen yalnızca ihtiyacı olan yetkiye sahiptir.
- **Fail Secure:** Hata durumunda güvensiz tarafa değil, güvenli tarafa düşülür.
- **Zero Trust:** Ağ içindeki hiçbir istek önceden güvenilir sayılmaz.

---

## 2. Kimlik Doğrulama (Authentication)

### 2.1 JWT Token Stratejisi

```
Kullanıcı Girişi
      │
      ▼
  Access Token (15 dakika)        Refresh Token (7 gün)
  ─────────────────────────       ─────────────────────────
  Payload: userId, role, status   Payload: userId, tokenFamily
  İmza: HS256 (secret 256-bit)    Depolama: Redis (revoke için)
  Kullanım: Her API isteği        Kullanım: Access token yenileme
```

**Access Token Politikası:**
- 15 dakika kısa ömür — çalınsa bile kısa sürede geçersizleşir.
- Payload'da `status` alanı taşır; böylece askıya alınan hesap bir sonraki
  istekte engellenir (15 dk gecikme kabul edilebilir).
- Sunucu tarafında blacklist tutulmaz (stateless); yalnızca imza doğrulanır.

**Refresh Token Politikası:**
- Redis'e kaydedilir; logout veya şüpheli aktivite tespit edildiğinde
  `DEL token:{userId}:{family}` ile anında geçersiz kılınır.
- Token rotation uygulanır: her yenilemede yeni refresh token verilir,
  eskisi geçersizleşir.
- Aynı refresh token iki kez kullanılırsa (token theft indicator):
  1. İlgili `tokenFamily`'deki tüm token'lar iptal edilir.
  2. Kullanıcıya "Hesabınız başka bir cihazdan giriş yapıldığı için
     çıkış yapıldı" e-postası gönderilir.
  3. Güvenlik audit log'u oluşturulur.

### 2.2 Şifre Politikası

```
Minimum: 8 karakter
Zorunlu: en az 1 büyük harf, en az 1 rakam
Hash: bcrypt (cost factor: 12)
Maksimum: 128 karakter (bcrypt DoS koruması için)
```

**bcrypt Cost Factor Seçimi:**
- Cost 10: ~100ms (çok hızlı, brute-force riski)
- Cost 12: ~400ms (önerilen denge)
- Cost 14: ~1.5s (yüksek trafikte CPU sorunu)

**Şifre Sıfırlama Güvenliği:**
- Token: 32-byte kriptografik random (`crypto.randomBytes(32)`)
- Veritabanında: SHA-256 hash saklanır (düz token asla DB'ye girmez)
- Süre: 1 saat
- Tek kullanım: `used_at` dolduktan sonra tekrar kullanılamaz
- Enumeration koruması: e-posta bulunamasa bile aynı yanıt döner

---

## 3. Yetkilendirme (Authorization)

### 3.1 Guard Zinciri

Her korumalı endpoint şu sırayla geçirilir:

```typescript
// Guard uygulama sırası (NestJS interceptor chain)

1. ThrottlerGuard       → Rate limit kontrolü
2. JwtAuthGuard         → Token geçerliliği
3. RolesGuard           → Rol kontrolü (LAND_OWNER / CONTRACTOR / ADMIN)
4. StatusGuard          → Hesap durumu (ACTIVE / RESTRICTED / ...)
5. OwnershipGuard       → Kayıt sahipliği (kendi kaydı mı?)
```

### 3.2 IDOR (Insecure Direct Object Reference) Koruması

En yaygın ve tehlikeli yetkilendirme açığıdır.

**Sorun:** `GET /offers/uuid-123` isteğinde başka müteahhitin teklifine erişim.

**Çözüm — Repository Katmanında Zorunlu Filtre:**

```typescript
// YANLIŞ — IDOR açığı
async findById(id: string) {
  return this.offerRepository.findOne({ where: { id } });
}

// DOĞRU — Ownership filter zorunlu
async findByIdAndContractor(id: string, contractorId: string) {
  return this.offerRepository.findOne({
    where: { id, contractorId }  // ← contractorId her zaman filtreye girer
  });
}
```

**Kural:** `findOne` veya `findBy` çağrılarında `userId` / `ownerId` /
`contractorId` filtresiz kullanım **code review'da reddedilir**.
Admin endpoint'lerinde bu kısıtlama kaldırılabilir ama açıkça belgelenmelidir.

### 3.3 Admin İşlem Kontrolü

```
Admin işlemi geldi
      │
      ▼
ADMIN rolü kontrolü (Guard)
      │
      ▼
İşlem loggable mı? (audit_logs'a yazılacak)
      │
      ▼
AuditInterceptor (otomatik kayıt)
  - admin_id: req.user.id
  - ip_address: req.ip (Cloudflare real IP header'dan)
  - entity_type, entity_id, action
      │
      ▼
İşlem gerçekleşir
```

---

## 4. Kişisel Veri Şifreleme

### 4.1 TC Kimlik Numarası Şifreleme

TC kimlik numarası **KVKK kapsamında özel nitelikli kişisel veri** değil,
genel kişisel veridir. Ancak kimlik doğrulamada kullanıldığı için
yüksek koruma seviyesi uygulanır.

**Algoritma:** AES-256-GCM (Authenticated Encryption)

```
Şifreleme Akışı:
─────────────────────────────────────────────────
Düz metin: "12345678901"
      │
      ▼
IV üret: crypto.randomBytes(12)  [her kayıt için benzersiz]
      │
      ▼
AES-256-GCM şifrele
  key: process.env.ENCRYPTION_KEY  [256-bit, Railway Secret]
  iv: yukarıdaki IV
  authTag: 16-byte (bütünlük doğrulama)
      │
      ▼
Saklanan değer: base64(iv + authTag + ciphertext)

─────────────────────────────────────────────────
Çözme Akışı:
base64 decode → iv + authTag + ciphertext ayır → AES-256-GCM decrypt
```

**Neden GCM (Galois/Counter Mode)?**
- Şifreleme + bütünlük doğrulama birleşik.
- Şifreli metin değiştirilmişse çözme başarısız olur (tamper detection).
- CBC moduna göre padding oracle saldırılarına karşı güvenli.

**Key Yönetimi:**
- `ENCRYPTION_KEY` Railway Secrets'ta saklanır, kod içinde asla bulunmaz.
- Aynı key tüm kayıtlarda kullanılır; her kayıt için benzersiz IV yeterlidir.
- Key rotation gerektiğinde: yeni key ile tüm kayıtlar yeniden şifrelenir
  (migration script ile background job olarak).

**API Yanıtında:**
- TC numarası hiçbir API yanıtında tam olarak döndürülmez.
- Admin panelinde bile yalnızca son 4 hane gösterilir: `*******8901`

### 4.2 Vergi Kimlik Numarası

Özel nitelikli veri değildir. Şifrelenmez, ancak yalnızca
admin ve ilgili kullanıcı görebilir. API yanıtlarında
diğer kullanıcılara hiçbir zaman açılmaz.

---

## 5. Input Güvenliği

### 5.1 SQL Injection Koruması

TypeORM parametreli sorguları kullanır; ham SQL string concatenation yasaktır.

```typescript
// YANLIŞ — SQL Injection açığı
const result = await dataSource.query(
  `SELECT * FROM listings WHERE city = '${city}'`
);

// DOĞRU — Parametreli sorgu
const result = await listingRepository.find({
  where: { city }
});

// DOĞRU — Ham sorgu gerekiyorsa
const result = await dataSource.query(
  'SELECT * FROM listings WHERE city = $1',
  [city]
);
```

### 5.2 XSS Koruması

```
Frontend (Next.js):
  - React default olarak HTML encode eder (dangerouslySetInnerHTML kullanılmaz)
  - Kullanıcı içeriği innerHTML'e asla atanmaz

Backend (NestJS):
  - class-transformer ile input sanitize edilir
  - ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })
  - HTML tag'leri içeren input'lar sanitize-html ile temizlenir

CSP Header (Helmet):
  Content-Security-Policy: default-src 'self'; script-src 'self'; ...
```

### 5.3 Teklif İçerik Filtresi (Monetizasyon Koruma)

Teklif metni, platform dışı iletişime teşvik içeremez.

```typescript
// OffersService içinde — her teklif kaydında çalışır
private validateOfferContent(description: string): void {
  const patterns = [
    // Türkiye formatları
    /(\+90|0090|0)?\s*[5][0-9]{2}\s*[0-9]{3}\s*[0-9]{2}\s*[0-9]{2}/,
    // E-posta
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    // Türk telefon gizleme girişimleri
    /beş\s*yüz|5\s*yüz|bes\s*yuz/i,
    // WhatsApp yönlendirme
    /whatsapp|wa\.me|telegram|@[a-zA-Z]/i,
    // Instagram / sosyal medya
    /instagram|twitter|linkedin/i,
  ];

  const hasContactInfo = patterns.some(p => p.test(description));

  if (hasContactInfo) {
    throw new UnprocessableEntityException({
      code: 'OFFER_CONTAINS_CONTACT_INFO',
      message: 'Teklif metninizde iletişim bilgisi bulunamaz.',
    });
  }
}
```

**Önemli:** Bu filtre backend'de zorunludur. Frontend gösterimi yardımcıdır,
güvenlik garantisi sağlamaz.

### 5.4 Dosya Yükleme Güvenliği

```
Yüklenen dosya kontrolü:
  1. Content-Type header kontrolü (kolayca atlatılır, yeterli değil)
  2. Magic bytes kontrolü (file-type kütüphanesi ile gerçek format tespiti)
  3. Dosya boyutu limiti (Multer middleware: 10MB belgeler, 2MB fotoğraflar)
  4. Dosya adı sanitizasyonu (path traversal önleme)
  5. Rastgele UUID ile yeniden adlandırma (orijinal ad saklanmaz)
  6. Yükleme: Client → Presigned URL → R2 (API sunucusu dosyayı asla almaz)
```

**Presigned URL Akışı:**
```
Client → API: "dosya yükleyeceğim, 2MB, image/jpeg"
API → R2: Presigned PUT URL oluştur (süre: 5 dakika, boyut limiti: 2MB)
API → Client: { uploadUrl, fileKey }
Client → R2: Doğrudan yükleme (presigned URL ile)
Client → API: "yükleme tamamlandı, fileKey: xyz"
API: fileKey'i kayıt eder
```

**Neden bu akış?**
- API sunucusu büyük dosyaları işlemez → memory/CPU tasarrufu.
- Boyut limiti R2 tarafında enforce edilir → bypass edilemez.

---

## 6. Ödeme Güvenliği

### 6.1 Webhook Doğrulama

```typescript
// payments/webhook.guard.ts

@Injectable()
export class IyzicoWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Raw body zorunlu — JSON.parse edilmiş body imza doğrulamada çalışmaz
    const rawBody: Buffer = request.rawBody;
    const signature = request.headers['x-iyz-signature'];

    const expectedSignature = crypto
      .createHmac('sha256', process.env.IYZICO_SECRET_KEY)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison (timing attack önleme)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature', {
        ip: request.ip,
        signature,
      });
      throw new UnauthorizedException('Invalid webhook signature');
    }

    return true;
  }
}
```

### 6.2 Çift Ödeme Koruması

```
POST /payments/initiate geldi
      │
      ▼
contact_unlocks tablosunu sorgula:
  WHERE buyer_id = ? AND offer_id = ?
      │
      ├── Kayıt var → 409 Conflict ("Bu teklif için zaten ödeme yapıldı")
      │
      └── Kayıt yok → Devam et
            │
            ▼
      payments tablosunda PENDING kayıt var mı?
      (aynı user + offer, son 10 dakika içinde)
            │
            ├── Var → 409 ("Ödeme işleminiz devam ediyor")
            │
            └── Yok → Yeni PENDING payment oluştur
```

### 6.3 İdempotent Webhook İşleme

```typescript
async processWebhook(iyzicoRef: string, payload: any) {
  // Aynı webhook tekrar gelirse idempotent çalışır
  const existingPayment = await this.paymentRepository.findOne({
    where: { providerRef: iyzicoRef }
  });

  if (existingPayment?.status === 'COMPLETED') {
    // Sessizce başarı döndür — Iyzico 200 bekledi zaten
    return;
  }

  // ... işleme devam
}
```

---

## 7. Rate Limiting

```typescript
// app.module.ts
ThrottlerModule.forRoot([
  {
    name: 'global',
    ttl: 60_000,       // 1 dakika
    limit: 100,        // 100 istek
  },
  {
    name: 'auth',
    ttl: 900_000,      // 15 dakika
    limit: 10,         // 10 istek (login + register)
  },
  {
    name: 'upload',
    ttl: 60_000,
    limit: 20,
  },
])
```

**Endpoint Bazlı Overrides:**

| Endpoint                   | TTL       | Limit | Gerekçe                            |
|----------------------------|-----------| ------|------------------------------------|
| `POST /auth/login`         | 15 dakika | 5     | Brute-force koruması               |
| `POST /auth/register`      | 1 saat    | 10    | Hesap oluşturma sınırı             |
| `POST /auth/forgot-password`| 1 saat   | 3     | E-posta spam koruması              |
| `POST /verification/documents`| 1 saat | 20    | Dosya yükleme limiti               |
| `POST /payments/initiate`  | 1 saat    | 10    | Ödeme denemesi limiti              |
| `POST /payments/webhook`   | 1 dakika  | 50    | Iyzico yüksek frekanslı gönderebilir|

**IP Tespiti:**
```typescript
// Cloudflare arkasında gerçek IP
const realIp = request.headers['cf-connecting-ip']
  ?? request.headers['x-forwarded-for']?.split(',')[0]
  ?? request.ip;
```

---

## 8. Transport Güvenliği

### 8.1 HTTPS

- Tüm trafik TLS 1.2+ zorunlu.
- TLS 1.0 ve 1.1 Cloudflare seviyesinde devre dışı.
- HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- HTTP → HTTPS yönlendirme Cloudflare'de yapılandırılır.

### 8.2 Güvenlik Header'ları (Helmet)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{NONCE}'"],  // inline script yok
      styleSrc: ["'self'", "'unsafe-inline'"],    // Tailwind için
      imgSrc: ["'self'", "data:", "https://cdn.muteahitt.com"],
      connectSrc: ["'self'", "https://api.muteahitt.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,  // Iyzico iframe için
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### 8.3 CORS

```typescript
app.enableCors({
  origin: [
    'https://muteahitt.com',
    'https://www.muteahitt.com',
    'https://app.muteahitt.com',
    // Geliştirme
    ...(process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000']
      : []),
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,  // Preflight önbelleği: 24 saat
});
```

---

## 9. Veritabanı Güvenliği

### 9.1 Bağlantı Güvenliği

- Neon veritabanına bağlantı `sslmode=require` ile.
- Bağlantı string'i yalnızca `DATABASE_URL` env değişkeninden okunur.
- API sunucusunun DB kullanıcısı: yalnızca `SELECT, INSERT, UPDATE, DELETE`.
  `DROP`, `CREATE`, `ALTER` yetkisi migration kullanıcısına özel.

### 9.2 Hassas Veri Loglama Yasağı

```typescript
// YANLIŞ — Hassas veri loga yazılamaz
this.logger.log(`User registered: ${email}, tc: ${tcNumber}`);

// DOĞRU — Hassas alanlar maskelenir
this.logger.log(`User registered: ${email}, tc: ***`);
```

**Loglanmayacak alanlar:** `tc_number`, `password`, `token`, `card_number`,
`cvv`, `provider_payload` (Iyzico ham response), `private_key`

### 9.3 Soft Delete Politikası

Kullanıcı verileri asla fiziksel olarak silinmez (`deleted_at` ile işaretlenir).
KVKK "unutulma hakkı" talebi geldiğinde özel anonymization endpoint'i çalışır:

```
Anonymization (KVKK Unutulma Hakkı):
  users.email → anon_{uuid}@deleted.muteahitt.com
  users.full_name → [Kullanıcı Silindi]
  users.phone → NULL
  individual_verifications.tc_number → şifreli NULL
  company_verifications alanları → NULL
  audit_logs → KORUNUR (yasal yükümlülük)
  payments → KORUNUR (muhasebe yükümlülüğü, 10 yıl)
```

---

## 10. Güvenlik İzleme ve Olay Müdahalesi

### 10.1 İzlenecek Güvenlik Olayları

| Olay                                | Seviye   | Aksiyon                                 |
|-------------------------------------|----------|-----------------------------------------|
| Başarısız login (5+/15dk, aynı IP)  | UYARI    | IP geçici engel, admin bildirimi        |
| Geçersiz JWT token (yüksek hacim)   | UYARI    | Log, araştırma                          |
| Webhook imza hatası                 | KRİTİK   | Anında log, admin e-postası             |
| Refresh token çift kullanım         | KRİTİK   | Token family iptal, kullanıcı bildirimi |
| Admin yetkisiz erişim girişimi      | KRİTİK   | Log, admin bildirimi                    |
| TC numarası şifre çözme hatası      | KRİTİK   | Log, araştırma, erişim engeli           |
| Rate limit ihlali (yüksek hacim)    | UYARI    | Cloudflare kuralı tetikleme             |

### 10.2 Sentry Entegrasyonu

```typescript
// Güvenlik olayları Sentry'ye özel tag ile gönderilir
Sentry.captureEvent({
  level: 'warning',
  tags: { security: 'true', type: 'webhook_signature_mismatch' },
  extra: { ip: request.ip, endpoint: request.path }
});
```

**Kural:** Sentry'ye gönderilen event'lerde hassas veri (TC, şifre, kart)
bulunmamalıdır. `beforeSend` hook'u ile filtrelenir.

### 10.3 Olay Müdahale Planı

```
Güvenlik olayı tespit edildi
      │
      ▼
Seviye: KRİTİK mi?
  │ Evet → Etkilenen hesapları derhal askıya al
  │        Admin ve kurucu'ya SMS + e-posta
  │        Sentry alert
  │
  │ Hayır → Log oluştur
             24 saat içinde araştır
             Gerekirse kullanıcıyı bilgilendir
```

---

## 11. Bağımlılık Güvenliği

```bash
# Her hafta çalıştırılır (CI/CD pipeline'da)
pnpm audit --audit-level=high

# Kritik/High seviyeli güvenlik açığı varsa
# → PR merge edilmez
# → Admin bilgilendirilir
```

**Bağımlılık Güncelleme Politikası:**
- Patch sürümleri: otomatik (Dependabot / Renovate)
- Minor sürümler: haftalık review
- Major sürümler: planlı sprint

---

## 12. Penetration Test Planı

**MVP Öncesi (Zorunlu):**
- [ ] OWASP Top 10 kontrolü (manuel veya araç)
- [ ] Ödeme akışı güvenlik testi
- [ ] JWT işleme güvenliği
- [ ] File upload güvenliği
- [ ] IDOR kontrolleri

**v2 Öncesi (Önerilen):**
- [ ] Profesyonel penetration test firması
- [ ] WebSocket güvenlik testi (Chat modülü için)
- [ ] API fuzzing
- [ ] Sosyal mühendislik simülasyonu

---

## 13. Güvenlik Kontrol Listesi (Deployment Öncesi)

```
[ ] Tüm env değişkenleri Railway Secrets'ta, kod içinde değil
[ ] DEBUG modu production'da kapalı
[ ] Error stack trace'leri API yanıtlarında gizli
[ ] Iyzico live key sandbox key ile çakışmıyor
[ ] CORS whitelist'inde localhost yok
[ ] Rate limiting aktif
[ ] Helmet header'ları aktif
[ ] HTTPS redirect aktif (Cloudflare)
[ ] bcrypt cost factor 12
[ ] Refresh token Redis'te
[ ] Webhook HMAC doğrulama aktif
[ ] TC şifreleme key'i Railway'de
[ ] Dosya yükleme presigned URL akışı aktif
[ ] Audit log tüm admin işlemlerinde çalışıyor
[ ] Sentry production environment'ı bağlı
[ ] pnpm audit → kritik/high bulgu yok
```
