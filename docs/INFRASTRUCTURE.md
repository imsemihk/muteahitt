# INFRASTRUCTURE.md — Altyapı ve Dağıtım

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Servis Haritası

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Üretim Ortamı                                │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   Vercel         │    │   Railway        │                      │
│  │   Next.js 14     │───▶│   NestJS API     │                      │
│  │   apps/web       │    │   apps/api       │                      │
│  └──────────────────┘    └────────┬─────────┘                      │
│                                   │                                 │
│              ┌────────────────────┼────────────────────┐           │
│              ▼                    ▼                    ▼           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │   Neon           │  │   Upstash        │  │   Cloudflare R2  │ │
│  │   PostgreSQL 15  │  │   Redis          │  │   Dosya Depolama │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   Resend         │    │   Sentry         │                      │
│  │   E-posta        │    │   Hata İzleme    │                      │
│  └──────────────────┘    └──────────────────┘                      │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │   Cloudflare     │    │   Iyzico         │                      │
│  │   DNS + DDoS     │    │   Ödeme          │                      │
│  └──────────────────┘    └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Servis Seçim Gerekçeleri

| Servis           | Sağlayıcı        | Plan         | Aylık Maliyet | Gerekçe                              |
|------------------|------------------|--------------|---------------|--------------------------------------|
| Frontend         | Vercel           | Hobby→Pro    | $0→$20        | Next.js ile native entegrasyon       |
| Backend API      | Railway          | Starter      | ~$5–20        | Dockerfile deploy, otomatik ölçekleme|
| PostgreSQL       | Neon             | Free→Launch  | $0→$19        | Serverless, otomatik uyku, branching |
| Redis            | Upstash          | Free→Pay-as  | $0→~$5        | Serverless HTTP Redis, düşük gecikme |
| Dosya Depolama   | Cloudflare R2    | Pay-as-you-go| ~$4           | Ücretsiz egress, S3 uyumlu           |
| E-posta          | Resend           | Free→Pro     | $0→$20        | React Email entegrasyonu             |
| Hata izleme      | Sentry           | Free         | $0            | NestJS + Next.js SDK                 |
| DDoS / DNS       | Cloudflare       | Free         | $0            | Tüm trafik filtresi                  |
| Ödeme            | Iyzico           | Pay-per-tx   | %2.9+₺0.25/tx | Türk kartları, 3D Secure             |
| Domain           | —                | —            | ~₺500/yıl     | muteahitt.com                        |

**Toplam MVP aylık maliyet (başlangıç): ~$25–45 / ~₺850–1.500**

---

## 3. Ortam Yapısı

Üç ortam tanımlanır:

```
local        → Geliştirici makinesinde Docker Compose
staging      → Railway (prod ile aynı config, farklı servisler)
production   → Railway + Vercel + tüm servisler
```

### 3.1 Ortam Değişkenleri Yapısı

```
apps/api/
  .env.local        ← Yerel geliştirme (git'e girmiyor)
  .env.staging      ← Staging (git'e girmiyor)
  .env.example      ← Tüm key'ler, değersiz (git'e giriyor)

apps/web/
  .env.local
  .env.staging
  .env.example
```

### 3.2 Gizli Değişkenler (Railway Secrets)

Railway'de "Variables" bölümüne eklenir, build sırasında env'e enjekte edilir:

```bash
# Veritabanı
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Redis
REDIS_URL=rediss://default:pass@host:port

# JWT
JWT_ACCESS_SECRET=<64 byte random hex>
JWT_REFRESH_SECRET=<64 byte random hex>

# Şifreleme (TC kimlik)
ENCRYPTION_KEY=<32 byte hex — AES-256>

# Cloudflare R2
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<key>
R2_SECRET_ACCESS_KEY=<secret>
R2_MEDIA_BUCKET=muteahitt-media-prod
R2_DOCS_BUCKET=muteahitt-docs-prod
R2_AVATARS_BUCKET=muteahitt-avatars-prod
R2_PUBLIC_URL=https://cdn.muteahitt.com

# Resend
RESEND_API_KEY=re_...

# Iyzico
IYZICO_API_KEY=<key>
IYZICO_SECRET_KEY=<secret>
IYZICO_BASE_URL=https://api.iyzipay.com
IYZICO_WEBHOOK_SECRET=<secret>

# Sentry
SENTRY_DSN=https://...

# Uygulama
NODE_ENV=production
API_URL=https://api.muteahitt.com
WEB_URL=https://muteahitt.com
CONTACT_UNLOCK_PRICE=399
```

**Kural:** Hiçbir secret `.env.example` dosyasında değer içermez.
Boş key listesi olarak tutulur.

---

## 4. Yerel Geliştirme Ortamı

### 4.1 Docker Compose

```yaml
# docker-compose.yml (repo kökünde)

version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: muteahitt
      POSTGRES_PASSWORD: muteahitt
      POSTGRES_DB: muteahitt_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    ports:
      - "9000:9000"    # S3 API
      - "9001:9001"    # Web konsol
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

### 4.2 Lokal Başlatma

```bash
# Servisleri başlat
docker compose up -d

# Veritabanı migration
pnpm --filter api db:migrate

# Seed (test verisi)
pnpm --filter api seed:dev

# API başlat
pnpm --filter api dev

# Web başlat (ayrı terminal)
pnpm --filter web dev
```

### 4.3 MinIO İlk Kurulum

```bash
# MinIO bucket'larını oluştur (ilk kurulumda bir kez)
pnpm --filter api run setup:storage
```

```typescript
// scripts/setup-local-storage.ts
async function setupLocalBuckets() {
  const buckets = ['muteahitt-media-local', 'muteahitt-docs-local', 'muteahitt-avatars-local'];
  for (const bucket of buckets) {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  // media ve avatars bucket'larına public policy ekle
  await s3.send(new PutBucketPolicyCommand({
    Bucket: 'muteahitt-media-local',
    Policy: JSON.stringify({ /* public read policy */ }),
  }));
}
```

---

## 5. Railway Konfigürasyonu (Backend)

### 5.1 Dockerfile

```dockerfile
# apps/api/Dockerfile

FROM node:20-alpine AS base
RUN npm install -g pnpm

# Bağımlılık kurulum katmanı
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Build katmanı
FROM deps AS builder
WORKDIR /app
COPY . .
RUN pnpm --filter shared build
RUN pnpm --filter api build

# Üretim katmanı
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm

COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile --prod

EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
```

### 5.2 railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "apps/api/Dockerfile"
  },
  "deploy": {
    "startCommand": "node apps/api/dist/main.js",
    "healthcheckPath": "/v1/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### 5.3 Health Check Endpoint

```typescript
// health/health.controller.ts
@Get('/health')
async health() {
  const dbOk = await this.checkDatabase();
  const redisOk = await this.checkRedis();

  const status = dbOk && redisOk ? 'ok' : 'degraded';
  return {
    status,
    timestamp: new Date().toISOString(),
    services: { database: dbOk, redis: redisOk },
  };
}
```

Railway health check `/v1/health` endpoint'ini 30 saniyede bir kontrol eder.
Başarısız olursa instance yeniden başlatılır.

---

## 6. Vercel Konfigürasyonu (Frontend)

### 6.1 vercel.json

```json
{
  "buildCommand": "pnpm --filter web build",
  "outputDirectory": "apps/web/.next",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "regions": ["fra1"],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### 6.2 Ortam Değişkenleri (Vercel Dashboard)

```bash
NEXT_PUBLIC_API_URL=https://api.muteahitt.com
NEXT_PUBLIC_CDN_URL=https://cdn.muteahitt.com
NEXT_PUBLIC_SENTRY_DSN=https://...
NEXT_PUBLIC_IYZICO_ENV=production
```

**Kural:** `NEXT_PUBLIC_` prefix'li değişkenler tarayıcıya açılır.
Secret içeren değişkenler asla `NEXT_PUBLIC_` olmaz.

---

## 7. CI/CD Pipeline

```
GitHub Push → main branch
        │
        ▼
GitHub Actions: ci.yml
        │
        ├── pnpm install
        ├── pnpm type-check (tsc --noEmit)
        ├── pnpm lint (ESLint)
        ├── pnpm test:unit (Jest — hızlı testler)
        │
        ├── Başarılı:
        │     ├── Vercel → otomatik deploy (web)
        │     └── Railway → otomatik deploy (api)
        │
        └── Başarısız:
              └── Deploy engellenir, Slack/e-posta bildirimi
```

### 7.1 GitHub Actions — ci.yml

```yaml
# .github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - run: pnpm --filter shared build

      - name: Type check
        run: pnpm -r type-check

      - name: Lint
        run: pnpm -r lint

      - name: Unit tests
        run: pnpm -r test:unit
        env:
          NODE_ENV: test
```

### 7.2 Branch Stratejisi

```
main        → Production deploy (Vercel + Railway otomatik)
staging     → Staging deploy
feature/*   → PR açılır, CI çalışır, merge sonrası staging'e
hotfix/*    → Doğrudan main'e PR, acil düzeltmeler için
```

**Kural:** `main` branch'ine doğrudan push yoktur.
Her değişiklik PR üzerinden gider, CI geçmeden merge yapılmaz.

---

## 8. Veritabanı Migration Stratejisi

### 8.1 Prisma ile Migration

```bash
# Geliştirme ortamı — migration oluştur + uygula
npx prisma migrate dev --name <açıklama>

# Production — yalnızca uygula
npx prisma migrate deploy

# Prisma Client yeniden oluştur (schema değişince)
npx prisma generate

# pnpm script kısayolları (apps/api/package.json'da tanımlı)
pnpm --filter api db:migrate      # prisma migrate dev
pnpm --filter api db:deploy       # prisma migrate deploy
pnpm --filter api db:generate     # prisma generate
pnpm --filter api db:studio       # prisma studio
```

**Migration dosya yolu:** `prisma/migrations/`

### 8.2 Production Migration Akışı

```
1. schema.prisma güncellenir
2. prisma migrate dev --name <açıklama> çalıştırılır (lokal)
3. Oluşan migration dosyası Git'e eklenir
4. Staging'de test edilir
5. PR'a dahil edilir
6. Merge sonrası Railway deploy başlar
7. Dockerfile'da prisma migrate deploy çalışır (deploy öncesi)
8. Migration başarısızsa deploy durur
```

```dockerfile
# Dockerfile CMD kısmı — migration + uygulama başlat
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

### 8.3 Tehlikeli Migration Kuralları

```
ASLA production'da:
  ✗ DROP TABLE (önce soft-delete, sonra temizlik)
  ✗ DROP COLUMN (önce nullable yapıp kullanımdan kaldır)
  ✗ NOT NULL constraint (mevcut verilerle kırılır)
  ✗ Büyük tabloda senkron INDEX (CONCURRENTLY kullan)

DOĞRU yaklaşım:
  ✓ Yeni kolon ekle (nullable)
  ✓ Uygulama kodu güncelle (her iki formata da yazacak)
  ✓ Veri migration script'i çalıştır
  ✓ NOT NULL yap (veri temiz olduktan sonra)
  ✓ Eski kolonu kullanımdan kaldır
```

---

## 9. Neon PostgreSQL Konfigürasyonu

### 9.1 Branch Yapısı

```
Neon Project: muteahitt
  ├── main branch        → Production veritabanı
  ├── staging branch     → Staging veritabanı (main'den fork)
  └── dev/* branch       → Geliştirici branch'leri (isteğe bağlı)
```

### 9.2 Connection Pooling

Neon, serverless ortamda connection pool yönetir.
Prisma `DATABASE_URL`'de `connection_limit` parametresi ile ayarlanır:

```bash
# .env
# connection_limit=10 → Neon free plan limiti
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require&connection_limit=10"
```

```typescript
// prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
```

**Uyarı:** Prisma'da `synchronize` kavramı yoktur — schema değişiklikleri
her zaman `prisma migrate deploy` ile uygulanır. Otomatik senkronizasyon
hiçbir zaman devreye girmez.

---

## 10. DNS ve Cloudflare Yapılandırması

### 10.1 DNS Kayıtları

```
muteahitt.com        → Vercel (A/CNAME)
api.muteahitt.com    → Railway (CNAME)
cdn.muteahitt.com    → Cloudflare R2 / Workers (CNAME)
```

### 10.2 Cloudflare Kuralları

```
SSL/TLS: Full (strict)
Always Use HTTPS: Açık
HSTS: Açık (max-age: 1 yıl)
Minimum TLS Version: 1.2
Auto Minify: JS, CSS, HTML
Brotli: Açık

Firewall Rules:
  - Türkiye dışı trafik: Challenge (MVP aşamasında)
  - Bot score < 30: Block
  - Rate limit: 1000 req/10min/IP (genel)
```

**Not:** Cloudflare firewall kuralları MVP için agresiftir.
Türkiye dışı trafik engellemek SEO'ya zarar verir.
Müşteri tabanı netleşince bu kural gevşetilebilir.

---

## 11. İzleme ve Uyarılar

### 11.1 Uptime İzleme

Better Uptime veya UptimeRobot (ücretsiz plan) ile:

```
İzlenen endpoint'ler:
  https://muteahitt.com              → 1 dakika aralık
  https://api.muteahitt.com/v1/health → 1 dakika aralık

Uyarı kanalları:
  E-posta: founder@muteahitt.com
  SMS: (opsiyonel)
```

### 11.2 Sentry Konfigürasyonu

```typescript
// apps/api/src/main.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new ProfilingIntegration(),
  ],
});

// apps/web/src/app/layout.tsx
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,   // Hata anındaki session replay
});
```

### 11.3 Railway Metrics

Railway dashboard üzerinden izlenir:
- CPU kullanımı
- Bellek kullanımı
- Network I/O
- Deployment geçmişi

Eşik değerleri aşıldığında Railway otomatik ölçekleme yapar
(Starter plan: 512MB RAM, 0.5 vCPU — büyümede Pro'ya geçiş).

---

## 12. Felaket Kurtarma (Disaster Recovery)

### 12.1 Yedekleme

| Servis        | Yedekleme           | RPO    | RTO     |
|---------------|---------------------|--------|---------|
| PostgreSQL    | Neon otomatik (7 gün) | 1 gün | 1 saat |
| Redis         | Upstash AOF         | ~1 sn  | 5 dak   |
| R2 Dosyalar   | Cloudflare replikasyon | N/A  | N/A     |
| Kod           | GitHub              | anlık  | 30 dak  |

**RPO** (Recovery Point Objective): Maksimum veri kaybı süresi  
**RTO** (Recovery Time Objective): Maksimum kesinti süresi

### 12.2 Veri Kaybı Riski

Neon free plan'da 7 günlük otomatik yedek vardır.
Production'a geçişte **Neon Launch plan** ($19/ay) ile
point-in-time recovery (1 gün geri) aktifleştirilmelidir.

### 12.3 Rollback Prosedürü

```bash
# Uygulama rollback (Railway)
railway rollback --deployment <previous-deployment-id>

# Veritabanı migration rollback (Prisma)
# Prisma'da otomatik revert yoktur — Neon snapshot'tan restore yapılır
# veya yeni bir migration ile değişiklik geri alınır

# Gerekirse Neon snapshot'tan restore
# → Neon dashboard üzerinden manuel yapılır
```

---

## 13. MVP Lansman Öncesi Kontrol Listesi

```
Altyapı:
  □ Tüm production secret'ları Railway'e eklendi
  □ DATABASE_URL production Neon bağlantısını gösteriyor
  □ REDIS_URL production Upstash bağlantısını gösteriyor
  □ R2 bucket'ları oluşturuldu ve policy'ler ayarlandı
  □ cdn.muteahitt.com DNS kaydı R2'ye yönlendiriyor
  □ SSL sertifikaları aktif (Cloudflare ve Vercel)
  □ Health check endpoint çalışıyor (/v1/health → 200)

Güvenlik:
  □ CORS whitelist yalnızca muteahitt.com içeriyor
  □ Rate limit kuralları aktif
  □ Helmet CSP konfigürasyonu uygulandı
  □ JWT secret'ları 64+ byte random değer
  □ ENCRYPTION_KEY 32 byte random değer

CI/CD:
  □ GitHub Actions CI pipeline çalışıyor
  □ main branch push koruması açık (PR zorunlu)
  □ Staging deploy çalışıyor

İzleme:
  □ Sentry production ortamına bağlı
  □ Uptime izleme aktif
  □ Railway metrics baseline alındı

Yasal:
  □ Iyzico production hesabı onaylı
  □ muteahitt.com domain kaydı yapıldı
  □ KVKK aydınlatma metni yayında
  □ Kullanım koşulları sayfası yayında
  □ VERBİS başvurusu yapıldı (veya planlandı)
```
