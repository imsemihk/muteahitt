# müteahitt.com

Türkiye'nin dijital inşaat pazaryeri — arsa sahipleri ile müteahhitleri buluşturan platform.

## Teknoloji Yığını

| Katman       | Teknoloji                              |
|--------------|----------------------------------------|
| Frontend     | Next.js 14 (App Router), Tailwind CSS  |
| Backend      | NestJS, TypeORM                        |
| Veritabanı   | PostgreSQL 15 (Neon)                   |
| Cache/Queue  | Redis (Upstash) + Bull Queue           |
| Dosya        | Cloudflare R2                          |
| Ödeme        | Iyzico                                 |
| E-posta      | Resend + React Email                   |
| Deploy       | Vercel (web) + Railway (api)           |

## Monorepo Yapısı

```
müteahitt/
  apps/
    web/          ← Next.js 14
    api/          ← NestJS
  packages/
    shared/       ← Zod şemaları + TypeScript tipleri
  docs/           ← Teknik dokümantasyon (22 dosya)
  docker-compose.yml
```

## Yerel Geliştirme

```bash
# Bağımlılıkları yükle
pnpm install

# Servisleri başlat (PostgreSQL, Redis, MinIO)
docker compose up -d

# Veritabanı migration
pnpm --filter api migration:run

# API başlat (port 3001)
pnpm --filter api dev

# Web başlat (port 3000)
pnpm --filter web dev
```

## Teknik Dokümantasyon

Tüm mimari kararlar, şemalar ve sistemler `docs/` klasöründe belgelenmiştir.

| Doküman                   | İçerik                              |
|---------------------------|-------------------------------------|
| ARCHITECTURE.md           | Sistem mimarisi ve modüller         |
| DATABASE_SCHEMA.md        | Tablo şemaları ve indexler          |
| API_ROUTES.md             | Tüm endpoint'ler                    |
| SECURITY.md               | Güvenlik katmanları ve kurallar     |
| VERIFICATION_SYSTEM.md    | Kullanıcı doğrulama akışı           |
| PAYMENT_SYSTEM.md         | Iyzico entegrasyonu                 |
| FILE_STORAGE.md           | R2 dosya yönetimi                   |
| ERROR_HANDLING.md         | Hata yönetimi standartları          |
| NOTIFICATION_SYSTEM.md    | Bildirim sistemi                    |
| ADMIN_PANEL.md            | Yönetim paneli                      |
| SEARCH_AND_FILTERING.md   | Arama ve filtreleme                 |
| INFRASTRUCTURE.md         | Deployment ve CI/CD                 |
| CHAT_SYSTEM.md            | Mesajlaşma sistemi (v1.5)           |
| AI_FEATURES.md            | AI özellikleri                      |
| MOBILE_APP.md             | Expo React Native stratejisi        |
| TESTING_STRATEGY.md       | Test stratejisi                     |
| MONITORING_AND_LOGGING.md | İzleme ve loglama                   |
| KVKK_AND_LEGAL.md         | KVKK uyumu                          |
| PROJECT_SCOPE.md          | Kapsam ve faz planı                 |
| UI_PAGES.md               | Arayüz sayfaları                    |
| ROADMAP.md                | Ürün yol haritası                   |

## Ortam Değişkenleri

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

Gerekli değişkenler için `apps/api/.env.example` ve `apps/web/.env.example` dosyalarına bakın.

## Lisans

Tüm hakları saklıdır © 2026 müteahitt.com
