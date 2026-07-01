# Deployment Rehberi

## Genel Mimari

```
Vercel (Next.js)  →  Railway (NestJS API)  →  Neon (PostgreSQL)
                                           →  Upstash (Redis)
                                           →  Cloudflare R2 (Dosyalar)
```

---

## 1. Neon (PostgreSQL)

1. [neon.tech](https://neon.tech) → New Project → `muteahitt`
2. Connection string'i kopyala → Railway Secrets'e `DATABASE_URL` olarak ekle
3. İlk migration için local'den çalıştır:
   ```bash
   DATABASE_URL=<neon-url> ./scripts/migrate-prod.sh
   ```

---

## 2. Upstash (Redis)

1. [upstash.com](https://upstash.com) → New Database → Region: EU (Frankfurt)
2. `Redis Connection String (TLS)` → Railway Secrets'e `REDIS_URL` olarak ekle
   - Format: `rediss://default:xxx@xxx.upstash.io:6379`

---

## 3. Cloudflare R2

1. Cloudflare Dashboard → R2 → Create Bucket → `muteahitt-uploads`
2. Settings → Public Access → Enable (veya custom domain bağla)
3. R2 → Manage API Tokens → Create token:
   - Permissions: Object Read & Write
   - Bucket: `muteahitt-uploads`
4. Şu değerleri Railway Secrets'e ekle:
   - `R2_ACCOUNT_ID` — Cloudflare account ID
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET_NAME=muteahitt-uploads`
   - `R2_PUBLIC_URL=https://pub-xxx.r2.dev` (bucket settings'ten al)

---

## 4. Resend (E-posta)

1. [resend.com](https://resend.com) → API Keys → Create
2. Domains → Add Domain → `muteahitt.com` → DNS kayıtlarını ekle (MX, DKIM)
3. Railway Secrets'e ekle:
   - `RESEND_API_KEY=re_xxx`
   - `MAIL_FROM=noreply@muteahitt.com`

---

## 5. Iyzico

1. [iyzico.com](https://iyzico.com) → Dashboard → Ayarlar → API Anahtarları
2. Prod anahtarları Railway Secrets'e ekle:
   - `IYZICO_API_KEY`
   - `IYZICO_SECRET_KEY`
   - `IYZICO_BASE_URL=https://api.iyzipay.com`

---

## 6. Railway (API)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Repo seç → Root Directory: `.` (monorepo kökü)
3. Build Config:
   - Dockerfile Path: `apps/api/Dockerfile`
4. Secrets panelinden tüm env değişkenlerini ekle:
   ```
   DATABASE_URL
   REDIS_URL
   JWT_ACCESS_SECRET        # openssl rand -hex 32
   JWT_REFRESH_SECRET       # openssl rand -hex 32
   ENCRYPTION_KEY           # openssl rand -hex 32
   RESEND_API_KEY
   MAIL_FROM
   IYZICO_API_KEY
   IYZICO_SECRET_KEY
   IYZICO_BASE_URL
   R2_ACCOUNT_ID
   R2_ACCESS_KEY_ID
   R2_SECRET_ACCESS_KEY
   R2_BUCKET_NAME
   R2_PUBLIC_URL
   FRONTEND_URL             # https://muteahitt.com (Vercel URL'i)
   NODE_ENV=production
   PORT=3001
   ```
5. Generate Domain → URL'i not al (Vercel'e `NEXT_PUBLIC_API_URL` olarak girilecek)

---

## 7. Vercel (Web)

1. [vercel.com](https://vercel.com) → New Project → GitHub repo
2. Framework: Next.js
3. Root Directory: `apps/web`
4. Build Command: `cd ../.. && pnpm build:shared && pnpm --filter @muteahitt/web build`
5. Install Command: `cd ../.. && pnpm install --frozen-lockfile`
6. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL=https://<railway-url>/api/v1
   ```
7. Deploy → Custom Domain → `muteahitt.com` ekle

---

## Güvenlik Kontrol Listesi (Prod'a Geçmeden)

- [ ] `ENCRYPTION_KEY` gerçekten 64 karakterlik hex mi? (`echo -n $ENCRYPTION_KEY | wc -c`)
- [ ] `JWT_ACCESS_SECRET` ve `JWT_REFRESH_SECRET` birbirinden farklı mı?
- [ ] Iyzico anahtarları sandbox → prod geçişi yapıldı mı?
- [ ] `IYZICO_BASE_URL` `sandbox-api` değil `api.iyzipay.com` mı?
- [ ] R2 bucket CORS ayarı: sadece `muteahitt.com` ve `localhost:3000`'e izin ver
- [ ] Neon'da connection pooling aktif mi? (Serverless için PgBouncer önerilir)
- [ ] Railway'de auto-sleep kapalı mı? (Production planında kapalı gelir)

---

## Yerel Geliştirme

```bash
# 1. Ortam değişkenlerini ayarla
cp .env.example .env
# .env dosyasını düzenle

# 2. PostgreSQL + Redis başlat
docker compose up -d

# 3. Migration çalıştır
pnpm --filter @muteahitt/api exec prisma migrate dev

# 4. Uygulamayı başlat
pnpm dev
```
