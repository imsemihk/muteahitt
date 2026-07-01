# ARCHITECTURE.md — Sistem Mimarisi

Sürüm: 1.1  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Mimari Genel Bakış

müteahitt.com, **Modüler Monolith** mimarisi üzerine inşa edilmiştir.
Her modül bağımsız test edilebilir, bağımsız değiştirilebilir ve gerektiğinde
ayrı bir servise dönüştürülebilir. Microservices'in operasyonel karmaşıklığı
olmadan servis sınırlarının disiplinini sağlar.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE CDN / EDGE                        │
│              (Statik asset, SSG sayfalar, DDoS koruması)            │
└────────────────────────┬───────────────────────┬────────────────────┘
                         │                       │
               ┌─────────▼──────────┐  ┌─────────▼──────────┐
               │   NEXT.JS (Web)    │  │  CLOUDFLARE R2     │
               │  Vercel Edge       │  │  (Medya & Belgeler) │
               │  SSR / SSG / CSR   │  └────────────────────┘
               └─────────┬──────────┘
                         │ HTTPS / REST
               ┌─────────▼──────────────────────────────────┐
               │           NESTJS API (Railway)              │
               │         Modüler Monolith v1                 │
               │                                             │
               │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
               │  │   Auth   │  │  Users   │  │Listings  │  │
               │  └──────────┘  └──────────┘  └──────────┘  │
               │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
               │  │  Offers  │  │ Payments │  │  Admin   │  │
               │  └──────────┘  └──────────┘  └──────────┘  │
               │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
               │  │Notif.    │  │   AI     │  │  Chat*   │  │
               │  └──────────┘  └──────────┘  └──────────┘  │
               │                    │                        │
               │         ┌──────────▼──────────┐            │
               │         │    Bull Queue        │            │
               │         │  (Async Job Worker)  │            │
               │         └──────────┬──────────┘            │
               └────────────────────┼────────────────────────┘
                                    │
               ┌────────────────────▼────────────────────────┐
               │              VERİ KATMANI                    │
               │                                             │
               │  ┌──────────────────┐  ┌────────────────┐  │
               │  │  PostgreSQL 15   │  │  Redis         │  │
               │  │  (Neon)          │  │  (Upstash)     │  │
               │  │  Ana veritabanı  │  │  Cache + Queue │  │
               │  └──────────────────┘  └────────────────┘  │
               └─────────────────────────────────────────────┘

* Chat modülü v1.5'te WebSocket Gateway olarak eklenecek.
```

---

## 2. Tasarım Kararları ve Gerekçeleri

### 2.1 Neden Modüler Monolith?

| Kriter              | Microservices        | Modüler Monolith (Seçilen)  |
|---------------------|----------------------|-----------------------------|
| Ekip büyüklüğü      | 8+ kişi gerektirir   | 1-4 kişiyle yönetilebilir   |
| Operasyonel yük     | Çok yüksek           | Düşük                       |
| Network latency     | Servisler arası var  | Yok (in-process)            |
| Debug / tracing     | Karmaşık             | Basit                       |
| Servis ayırma       | Baştan gerekli       | İleride yapılabilir         |
| MVP hızı            | Yavaş                | Hızlı                       |

**Karar:** MVP ve v2 boyunca Modüler Monolith devam eder.
Trafik 100K+ aktif kullanıcıya ulaştığında ve Chat modülü ayrı
ölçeklenme ihtiyacı gösterdiğinde, yalnızca Chat servisi ayrılır.

### 2.2 Neden NestJS?

- TypeScript-first, kurumsal deseni (DI, Guards, Interceptors) destekler.
- Modül sistemi mimari sınırları zorlar; "her şeyi bir dosyaya yazma" önlenir.
- WebSocket Gateway eklentisi yerleşik (Chat v1.5 için hazır).
- Bull Queue entegrasyonu `@nestjs/bull` ile paketten gelir.
- Güçlü test altyapısı (Jest entegrasyonu yerleşik).

### 2.3 Neden Modüller Arası Doğrudan Import Yasak?

Her modül yalnızca kendi servislerini dışa açar.
Başka modüle erişim yalnızca **export edilmiş servis** üzerinden yapılır.

```
DOĞRU:
  PaymentsModule → import UsersModule → inject UsersService

YANLIŞ:
  PaymentsService → doğrudan UsersRepository'e erişim
```

Bu kural ihlal edilirse ilerideki servis ayırma imkânsız hale gelir.

---

## 3. Monorepo Yapısı

```
muteahitt/                          # pnpm workspace kökü
├── apps/
│   ├── web/                        # Next.js 14 (App Router)
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── package.json
│   └── api/                        # NestJS Modüler Monolith
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── prisma/
│       │   │   └── prisma.service.ts
│       │   └── modules/
│       │       ├── auth/
│       │       ├── users/
│       │       ├── verification/
│       │       ├── listings/
│       │       ├── offers/
│       │       ├── payments/
│       │       ├── notifications/
│       │       ├── chat/            # v1.5'te eklenecek
│       │       ├── ai/
│       │       └── admin/
│       └── package.json
├── prisma/
│   ├── schema.prisma           # Tek kaynak — tüm modeller burada
│   └── migrations/             # prisma migrate dev ile oluşturulur
├── packages/
│   └── shared/                     # Paylaşılan kod
│       ├── src/
│       │   ├── types/              # Ortak TypeScript interface'leri
│       │   ├── schemas/            # Zod validasyon şemaları (web + api paylaşır)
│       │   ├── constants/          # Enum'lar, sabitler
│       │   └── utils/              # Pure utility fonksiyonlar
│       └── package.json
├── docker-compose.yml              # Lokal geliştirme (PG + Redis)
├── pnpm-workspace.yaml
└── turbo.json                      # Turborepo build orchestration
```

**`packages/shared` Kuralı:**
- Yalnızca saf TypeScript (framework bağımlılığı olmaz).
- NestJS veya Next.js özgü kod buraya girmez.
- Zod şemaları burada tanımlanır; API `class-validator` ile, web doğrudan Zod ile kullanır.

---

## 4. NestJS Modül Mimarisi

Her modül aşağıdaki katman yapısını takip eder:

```
modules/listings/
├── listings.module.ts          # DI konfigürasyonu
├── listings.controller.ts      # HTTP endpoint'leri (ince — sadece routing)
├── listings.service.ts         # İş mantığı
├── dto/
│   ├── create-listing.dto.ts   # Giriş validasyonu (Zod + nestjs-zod)
│   └── update-listing.dto.ts
└── listings.service.spec.ts    # Birim testler
```

TypeORM entity dosyaları yoktur. Veritabanı sorguları doğrudan
`PrismaService` üzerinden service içinde yapılır.

**Katman Sorumlulukları:**

| Katman       | Sorumluluk                                  | Ne İçermez                          |
|--------------|---------------------------------------------|-------------------------------------|
| Controller   | HTTP decode/encode, auth guard, rate limit  | İş mantığı, Prisma sorgusu          |
| Service      | İş kuralları, Prisma sorguları, transaction | HTTP detayı                         |
| DTO          | Giriş validasyonu (Zod şeması)              | İş mantığı                          |
| PrismaService| Veritabanı bağlantısı ve client             | İş mantığı                          |

---

## 5. Veri Akışı

### 5.1 Standart HTTP İsteği

```
Client
  │ HTTPS
  ▼
NestJS Global Middleware
  (Helmet, CORS, RawBody parser for webhook)
  │
  ▼
Rate Limiter (ThrottlerGuard)
  │
  ▼
Auth Guard (JWT doğrulama)
  │
  ▼
Role Guard (LAND_OWNER / CONTRACTOR / ADMIN)
  │
  ▼
Status Guard (ACTIVE / RESTRICTED kontrolü)
  │
  ▼
Validation Pipe (class-validator + class-transformer)
  │
  ▼
Controller Method
  │
  ▼
Service (İş Mantığı)
  │
  ├──▶ Repository (PostgreSQL sorgusu)
  ├──▶ External Service (Iyzico, Resend, R2...)
  └──▶ Queue (Bull — async işlemler)
  │
  ▼
Response Interceptor (standart yanıt formatı)
  │
  ▼
Client
```

### 5.2 Ödeme Webhook Akışı

```
Iyzico
  │ POST /payments/webhook
  ▼
Raw Body Middleware (imza doğrulama için ham body saklanır)
  │
  ▼
Webhook Signature Guard (HMAC-SHA256 doğrulama)
  │ Başarısız → 401, log atar, erken döner
  ▼
PaymentsController.webhook()
  │
  ▼
PaymentsService.processWebhook()
  │
  ├──▶ payments tablosu güncelle (COMPLETED)
  ├──▶ contact_unlocks kaydı oluştur
  └──▶ NotificationQueue'ya push (asenkron)
            │
            ▼
        Bull Worker (NotificationProcessor)
            ├──▶ Resend e-posta (arsa sahibine)
            └──▶ Resend e-posta (müteahhide)
  │
  ▼
200 "OK" (Iyzico'nun beklediği yanıt — mümkün olan en kısa sürede)
```

**Kural:** Webhook endpoint'i 3 saniye içinde yanıt vermeli.
Tüm yan işlemler (e-posta, bildirim) asenkron queue'ya aktarılır.

### 5.3 Asenkron Job Akışı

```
Service
  │ queue.add('send-email', payload)
  ▼
Bull Queue (Redis backed)
  │
  ▼
Job Worker (ayrı process veya aynı process içinde)
  │
  ├── Başarı → job completed, Redis'ten temizlenir
  └── Hata   → otomatik retry (3 deneme, exponential backoff)
               3. denemede de başarısız → dead-letter queue → alert
```

**Queue Listesi:**

| Queue Adı          | İşler                                                |
|--------------------|------------------------------------------------------|
| `email`            | Tüm e-posta gönderimlerি                             |
| `notification`     | In-app bildirim oluşturma                            |
| `ai-moderation`    | Teklif içerik moderasyonu (async)                    |
| `listing-expire`   | İlan expire kontrolü (cron tetikler)                 |
| `webhook-process`  | Ödeme webhook işleme (retry için ayrı queue)         |

---

## 6. Önbellek Stratejisi (Redis)

```
┌─────────────────────────────────────────────────────┐
│                   Redis Kullanım Alanları            │
├──────────────────────┬──────────────────────────────┤
│ Amaç                 │ Detay                        │
├──────────────────────┼──────────────────────────────┤
│ Bull Queue           │ Job state, retry backlog      │
│ Rate Limit Counter   │ IP bazlı sayaçlar (TTL: 15dk) │
│ JWT Blacklist        │ Logout sonrası token invalidate│
│ Session Cache        │ /auth/me sonucu (TTL: 5dk)    │
│ İlan Listesi Cache   │ Populer şehirler (TTL: 2dk)   │
│ OTP / Email Token    │ Doğrulama token'ları (TTL: 1s)│
└──────────────────────┴──────────────────────────────┘
```

**Cache Invalidation Kuralı:**
- İlan güncellendiğinde ilgili cache key'i pattern-delete ile temizlenir.
- Cache miss durumunda PostgreSQL'den okuyup cache'e yazar.
- Cache katmanı opsiyoneldir; Redis erişilemez olsa API çalışmaya devam eder
  (graceful degradation).

---

## 7. Güvenlik Katmanları

```
İstek Geldi
    │
    ├─ [1] Cloudflare → DDoS, bot filtreleme, IP rate limit
    │
    ├─ [2] NestJS Helmet → Security headers (CSP, HSTS, XSS...)
    │
    ├─ [3] CORS → Whitelist: muteahitt.com, app.muteahitt.com
    │
    ├─ [4] ThrottlerGuard → Endpoint bazlı rate limiting
    │
    ├─ [5] JWT Guard → Access token doğrulama
    │
    ├─ [6] Role Guard → LAND_OWNER / CONTRACTOR / ADMIN
    │
    ├─ [7] Status Guard → ACTIVE / RESTRICTED / PENDING_APPROVAL
    │
    ├─ [8] Ownership Guard → "Bu kayıt bu kullanıcıya ait mi?"
    │
    └─ [9] Validation Pipe → Input sanitizasyonu, type coercion
```

Detaylı güvenlik politikası: bkz. [SECURITY.md](./SECURITY.md)

---

## 8. API Versioning Stratejisi

**Yöntem:** URI versioning (`/v1/`, `/v2/`)

**Gerekçe:**
- Header versioning mobil uygulamalarda debug'u zorlaştırır.
- Query param versioning önbelleğe almayı karmaşıklaştırır.
- URI versioning açık, önbellek dostu ve mobil uyumludur.

```
https://api.muteahitt.com/v1/listings     ← Mevcut
https://api.muteahitt.com/v2/listings     ← Breaking change gerektiğinde
```

**Kural:**
- v1 endpoint'leri v2 yayınlandıktan sonra minimum 6 ay daha çalışır.
- Deprecated endpoint'ler `Deprecation: true` ve `Sunset: <tarih>` header'ı döner.
- Mobil uygulama minimum desteklenen sürüm politikasına göre yönlendirilir.

---

## 9. Ortam Yapısı

```
┌──────────┐    ┌──────────────┐    ┌─────────────────┐
│   LOCAL  │    │   STAGING    │    │   PRODUCTION    │
├──────────┤    ├──────────────┤    ├─────────────────┤
│ Docker   │    │ Railway      │    │ Railway         │
│ PG local │    │ Neon (branch)│    │ Neon (main)     │
│ Redis    │    │ Upstash      │    │ Upstash         │
│ local    │    │ Vercel prev. │    │ Vercel prod     │
│          │    │ Iyzico sand. │    │ Iyzico live     │
│          │    │ Resend test  │    │ Resend prod     │
└──────────┘    └──────────────┘    └─────────────────┘
```

**Kural:** Hiçbir production secret'ı local veya staging ortamında kullanılmaz.
Her ortam için ayrı Cloudflare R2 bucket'ı olur.

Detay: bkz. [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)

---

## 10. Modül Bağımlılık Haritası

```
AppModule
├── AuthModule
│   └── UsersModule (import)
├── UsersModule
│   └── EncryptionModule (import)
├── VerificationModule
│   ├── UsersModule (import)
│   └── FileStorageModule (import)
├── ListingsModule
│   ├── UsersModule (import)
│   └── FileStorageModule (import)
├── OffersModule
│   ├── ListingsModule (import)
│   └── UsersModule (import)
├── PaymentsModule
│   ├── OffersModule (import)
│   ├── UsersModule (import)
│   └── NotificationsModule (import)
├── ContactUnlocksModule
│   ├── PaymentsModule (import)
│   └── OffersModule (import)
├── NotificationsModule
│   └── UsersModule (import)
├── ChatModule (v1.5)
│   ├── UsersModule (import)
│   └── ContactUnlocksModule (import) ← chat sadece iletişim açıksa
├── AiModule
│   └── OffersModule (import)
├── AdminModule
│   ├── UsersModule (import)
│   ├── ListingsModule (import)
│   ├── OffersModule (import)
│   ├── PaymentsModule (import)
│   └── AuditLogsModule (import)
├── AuditLogsModule
│   └── UsersModule (import)
├── FileStorageModule           # Bağımsız altyapı modülü
├── EncryptionModule            # Bağımsız altyapı modülü
└── QueueModule                 # Bull konfigürasyonu
```

**Döngüsel Bağımlılık Kuralı:**
Hiçbir modül döngüsel bağımlılık içeremez.
`A → B → A` durumu tespit edildiğinde yeni bir `SharedModule` oluşturulur
veya event emitter ile dolaylı iletişim kurulur.

---

## 11. Chat Modülü için WebSocket Mimarisi (v1.5)

Chat sistemi MVP'de yoktur. v1.5'te aşağıdaki mimari ile eklenir:

```
Client (Browser / Mobile)
  │ WebSocket (Socket.IO)
  ▼
NestJS WebSocket Gateway (ChatGateway)
  │
  ├── Auth Middleware (JWT token — handshake sırasında)
  ├── ContactUnlock kontrolü (iletişim açık mı?)
  │
  ▼
ChatService
  │
  ├──▶ PostgreSQL (messages tablosu — kalıcı)
  └──▶ Redis Pub/Sub (çok instance için broadcast)
```

**Multi-Instance Kural:** Railway'de ölçeklendiğinde her instance
aynı Redis channel'ı dinler. Bu olmadan farklı instance'lardaki
kullanıcılar mesaj alamaz.

**İzin Kuralı:** Bir kullanıcı diğeriyle chat açabilmek için
`contact_unlocks` tablosunda geçerli bir kayıt olmalıdır.
Bu kontrol `WsGuard` içinde yapılır.

---

## 12. Shared Package Kullanım Örnekleri

```typescript
// packages/shared/src/schemas/listing.schema.ts
import { z } from 'zod';

export const CreateListingSchema = z.object({
  title: z.string().min(10).max(200),
  city: z.string().min(2),
  areaM2: z.number().positive(),
  dealType: z.enum(['KAT_KARSILIGI', 'NAKIT_DAIRE', 'NAKIT', 'NEGOTIABLE']),
});

export type CreateListingDto = z.infer<typeof CreateListingSchema>;
```

```typescript
// apps/web/components/listings/CreateListingForm.tsx
import { CreateListingSchema } from '@muteahitt/shared';

// Zod şeması doğrudan react-hook-form + zodResolver ile kullanılır
```

```typescript
// apps/api/src/modules/listings/dto/create-listing.dto.ts
import { CreateListingSchema } from '@muteahitt/shared';
import { createZodDto } from 'nestjs-zod';

export class CreateListingDto extends createZodDto(CreateListingSchema) {}
```

**Sonuç:** Aynı validasyon kuralı hem frontend hem backend'de tek kaynaktan gelir.
Validasyon değiştiğinde yalnızca `shared` paketi güncellenir.

---

## 13. Performans Hedefleri

| Metrik                          | Hedef          | Ölçüm Yöntemi          |
|---------------------------------|----------------|------------------------|
| API P95 yanıt süresi            | < 200ms        | Railway Metrics         |
| İlan listesi sayfası (SSR)      | < 1.2s TTFB    | Vercel Analytics        |
| Veritabanı sorgusu (basit)      | < 50ms         | Prisma query log        |
| Webhook işleme süresi           | < 500ms        | Bull job duration       |
| WebSocket bağlantı kurma (v1.5) | < 1s           | Socket.IO latency metric|
| Uptime                          | %99.5          | UptimeRobot             |

---

## 14. Ölçeklendirme Yol Haritası

```
Şu An (MVP)          Yük Büyüdükçe          İleri Aşama
─────────────────    ──────────────────────  ──────────────────────
Tek Railway pod  →   Railway horizontal   →  Chat ayrı servis
Neon free tier   →   Neon Pro (read replica) →  PgBouncer connection pool
Vercel free      →   Vercel Pro             →  Custom domain edge cache
Upstash Redis    →   Redis Cluster          →  —
Tek Bull worker  →   Ayrı worker process    →  —
```

**Kural:** Her ölçekleme adımı kod değişikliği gerektirmeden
yapılabilecek şekilde tasarlanmıştır.
