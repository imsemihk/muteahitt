# MONITORING_AND_LOGGING.md — İzleme ve Loglama

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Strateji Özeti

```
Ne izlenir?       → Uygulama hataları, performans, iş metrikleri
Nerede saklanır?  → Sentry (hatalar), Railway (sistem), yapılandırılmış JSON log
Kim tetikler?     → Sentry alert + e-posta + (v2) Slack
Ne zaman müdahale? → P0: anlık, P1: 1 saat, P2: iş günü
```

MVP için araç seti minimal tutulur. Ayrı log aggregation servisi (Datadog,
Logtail vb.) MVP maliyetini gereksiz artırır. Railway log'ları + Sentry
başlangıç için yeterlidir.

---

## 2. Log Seviyeleri ve Kullanımı

```typescript
// NestJS Logger kullanım standardı

// ERROR — sistem hatası, kullanıcı işlemi tamamlanamadı
this.logger.error('Iyzico webhook işlenemedi', { paymentId, error: err.message });

// WARN — beklenmeyen durum ama sistem çalışıyor
this.logger.warn('Rate limit yaklaşıyor', { userId, endpoint, remaining: 2 });

// LOG (INFO) — önemli iş olayı
this.logger.log('Ödeme tamamlandı', { paymentId, userId, amount: 399 });

// DEBUG — geliştirme/sorun giderme (production'da kapalı)
this.logger.debug('Cache miss', { key: 'listings:search:abc123' });
```

**Production log seviyesi:** `LOG` ve üzeri (`DEBUG` kapalı).

---

## 3. Yapılandırılmış Log Formatı

Tüm loglar JSON formatında yazılır. Her log şu alanları içerir:

```json
{
  "timestamp": "2026-07-01T10:30:00.000Z",
  "level": "error",
  "service": "PaymentsService",
  "action": "processWebhook",
  "requestId": "req_01J4XYZ",
  "userId": "uuid",
  "message": "Iyzico webhook HMAC doğrulama başarısız",
  "context": {
    "paymentId": "pay_123",
    "ip": "1.2.3.4"
  }
}
```

**Asla loglanmaz:**
`password`, `passwordHash`, `tcNumber`, `refreshToken`, `cardNumber`,
`cvv`, `encryptionKey`, `apiSecret`

```typescript
// common/logger/logger.service.ts

@Injectable()
export class AppLogger extends Logger {
  private readonly SENSITIVE_KEYS = new Set([
    'password', 'passwordHash', 'tcNumber', 'token',
    'refreshToken', 'cardNumber', 'cvv', 'secret',
  ]);

  log(message: string, context?: Record<string, unknown>) {
    const sanitized = context ? this.sanitize(context) : undefined;
    super.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...sanitized,
    }));
  }

  private sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k,
        this.SENSITIVE_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v,
      ])
    );
  }
}
```

---

## 4. Sentry Entegrasyonu

### 4.1 NestJS Konfigürasyonu

```typescript
// apps/api/src/main.ts

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.RAILWAY_GIT_COMMIT_SHA,

  // Production'da %10 trace örnekleme (maliyet kontrolü)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    nodeProfilingIntegration(),
  ],

  // Hassas veriyi Sentry'ye gönderme
  beforeSend(event) {
    if (event.request?.data) {
      const sensitive = ['password', 'tcNumber', 'cardNumber'];
      sensitive.forEach(key => {
        if (event.request?.data?.[key]) {
          event.request.data[key] = '[REDACTED]';
        }
      });
    }
    return event;
  },
});
```

### 4.2 Next.js Konfigürasyonu

```typescript
// apps/web/sentry.client.config.ts

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,

  // Hata anındaki kullanıcı oturumu kaydı
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});
```

### 4.3 Manuel Hata Yakalama

```typescript
// Beklenen ama izlenmesi gereken durumlar
try {
  await iyzicoService.initiatePayment(payload);
} catch (error) {
  Sentry.captureException(error, {
    extra: {
      userId,
      offerId,
      action: 'initiatePayment',
    },
    tags: {
      service: 'iyzico',
      critical: 'true',
    },
  });
  throw new AppException('PAYMENT_PROVIDER_ERROR', '...', 503);
}
```

---

## 5. İş Metrikleri İzleme

Teknik metrikler kadar iş metrikleri de izlenir.
Alarm kurmak için eşik değerleri tanımlanır:

### 5.1 Kritik İş Metrikleri

```typescript
// common/metrics/business-metrics.service.ts

@Injectable()
export class BusinessMetricsService {
  constructor(private redis: RedisService) {}

  // Sayaçları Redis'te tut (günlük sıfırlama)
  async increment(metric: string): Promise<void> {
    const key = `metrics:${metric}:${format(new Date(), 'yyyy-MM-dd')}`;
    await this.redis.incr(key);
    await this.redis.expire(key, 7 * 24 * 60 * 60); // 7 gün sakla
  }

  async get(metric: string, date?: string): Promise<number> {
    const d = date ?? format(new Date(), 'yyyy-MM-dd');
    return Number(await this.redis.get(`metrics:${metric}:${d}`) ?? 0);
  }
}

// Kullanım örnekleri:
// Yeni kayıt
await metrics.increment('registrations');

// Yeni teklif
await metrics.increment('offers_created');

// Başarılı ödeme
await metrics.increment('payments_completed');
await metrics.increment(`revenue:${amount}`);

// İçerik filtresi tetiklendi
await metrics.increment('content_filter_triggered');
```

### 5.2 Admin Dashboard Metrikleri

```typescript
// GET /admin/stats
{
  today: {
    registrations: 8,
    offersCreated: 23,
    paymentsCompleted: 4,
    revenue: 1596,            // TRY
    contentFilterTriggers: 2,
  },
  week: {
    registrations: 47,
    paymentsCompleted: 19,
    revenue: 7581,
  },
  totals: {
    activeUsers: 847,
    activeListings: 234,
    pendingVerifications: 12,
  }
}
```

---

## 6. Alert Kuralları

### 6.1 P0 — Anlık Müdahale (< 15 dakika)

| Koşul                                    | Tetikleyici               |
|------------------------------------------|---------------------------|
| API health check başarısız (2 dakika)    | Uptime izleme             |
| Web sitesi erişilemiyor (2 dakika)       | Uptime izleme             |
| Sentry'de 5xx hatası/dakika > 10         | Sentry alert              |
| Veritabanı bağlantısı kesildi            | Health check + Sentry     |
| Ödeme webhook HMAC hatası > 3/saat       | Sentry alert              |

### 6.2 P1 — 1 Saat İçinde (İş Saatleri)

| Koşul                                    | Tetikleyici               |
|------------------------------------------|---------------------------|
| Başarısız ödeme oranı > %20              | Metrik izleme             |
| E-posta queue derinliği > 100            | Bull Queue izleme         |
| Doğrulama kuyruğu > 50 bekleyen          | Admin dashboard           |
| API yanıt süresi p95 > 2 saniye          | Railway metrics           |

### 6.3 P2 — İş Günü İçinde

| Koşul                                    | Tetikleyici               |
|------------------------------------------|---------------------------|
| İçerik filtresi günlük > 20 tetikleme    | Metrik izleme             |
| Disk kullanımı > %80                     | Railway metrics           |
| Redis bellek > %70                       | Upstash dashboard         |

### 6.4 Alert Konfigürasyonu

```typescript
// Sentry alert konfigürasyonu (dashboard üzerinden):

// Kural 1: Kritik hata patlaması
{
  name: 'Yüksek 5xx Oranı',
  conditions: [{ type: 'event_frequency', value: 10, interval: '1m' }],
  filters: [{ type: 'level', value: 'error' }],
  actions: [{ type: 'email', targetType: 'team' }],
}

// Kural 2: Yeni hata türü
{
  name: 'Yeni Hata Tipi Tespit Edildi',
  conditions: [{ type: 'first_seen_event' }],
  actions: [{ type: 'email', targetType: 'team' }],
}
```

---

## 7. Performans İzleme

### 7.1 API Yanıt Süresi Loglama

```typescript
// common/interceptors/logging.interceptor.ts

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new AppLogger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const { method, url, user } = req;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - start;
          const level = duration > 1000 ? 'warn' : 'log';

          this.logger[level]('HTTP request completed', {
            requestId: req.headers['x-request-id'],
            method,
            url,
            statusCode: context.switchToHttp().getResponse().statusCode,
            durationMs: duration,
            userId: user?.id,
          });

          // Yavaş sorgu uyarısı
          if (duration > 2000) {
            Sentry.captureMessage(`Yavaş endpoint: ${method} ${url} (${duration}ms)`, 'warning');
          }
        },
        error: (error) => {
          this.logger.error('HTTP request failed', {
            requestId: req.headers['x-request-id'],
            method,
            url,
            durationMs: Date.now() - start,
            userId: user?.id,
            error: error.message,
          });
        },
      })
    );
  }
}
```

### 7.2 Veritabanı Sorgu İzleme

Prisma'da yavaş sorgu loglama `PrismaService` içinde `$on` ile kurulur:

```typescript
// prisma/prisma.service.ts

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    // 1 saniyeden uzun sorgular için uyarı
    this.$on('query' as never, (e: Prisma.QueryEvent) => {
      if (e.duration > 1000) {
        this.logger.warn(`Yavaş sorgu (${e.duration}ms): ${e.query}`);
        Sentry.captureMessage(`Yavaş DB sorgusu: ${e.duration}ms`, 'warning');
      }
    });

    await this.$connect();
  }
}
```

---

## 8. Uptime İzleme

**Araç:** Better Uptime (ücretsiz plan) veya UptimeRobot.

```
İzlenen endpoint'ler:
  https://muteahitt.com                   → 60 saniye aralık
  https://api.muteahitt.com/v1/health     → 60 saniye aralık

Health check response beklentisi:
  HTTP 200
  Body: { "status": "ok" }
  Maksimum yanıt süresi: 5 saniye

Uyarı kanalları:
  E-posta: kurucu adresi
  2 başarısız kontrol sonrası alarm tetiklenir (2 dakika tolerans)
```

---

## 9. Railway Log Yönetimi

Railway otomatik log toplar, 7 gün saklar (Starter plan).

```bash
# Railway CLI ile log takibi
railway logs --tail

# Belirli bir deployment'ın logları
railway logs --deployment <deployment-id>
```

**Log arama ipuçları:**

```bash
# 500 hatalarını filtrele
railway logs | grep '"level":"error"'

# Belirli request ID'yi takip et
railway logs | grep 'req_01J4XYZ'

# Yavaş endpoint'leri bul
railway logs | grep '"durationMs"' | jq 'select(.durationMs > 1000)'
```

---

## 10. Veritabanı Sağlık Kontrolleri

```typescript
// health/health.controller.ts

@Get('/health')
async health(): Promise<HealthResponse> {
  const checks = await Promise.allSettled([
    this.checkDatabase(),
    this.checkRedis(),
    this.checkBullQueue(),
  ]);

  const [db, redis, queue] = checks.map(r =>
    r.status === 'fulfilled' ? r.value : false
  );

  return {
    status: db && redis ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
    services: {
      database: db,
      redis,
      queue,
    },
  };
}

private async checkDatabase(): Promise<boolean> {
  try {
    await this.dataSource.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

private async checkRedis(): Promise<boolean> {
  try {
    await this.redis.ping();
    return true;
  } catch {
    return false;
  }
}
```

---

## 11. Bull Queue İzleme

```typescript
// Bull Board — geliştirme ortamında queue görselleştirme

import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

// Yalnızca development/staging'de aktif
if (process.env.NODE_ENV !== 'production') {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullAdapter(emailQueue),
      new BullAdapter(notificationQueue),
    ],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());
}
```

Production'da Bull Queue metrikleri Redis üzerinden izlenir:

```typescript
// Günlük queue sağlık raporu
async checkQueueHealth() {
  const emailQueue = this.queueManager.getQueue('email');
  const counts = await emailQueue.getJobCounts();

  if (counts.failed > 10) {
    Sentry.captureMessage(`E-posta kuyruğunda ${counts.failed} başarısız job`, 'warning');
  }

  return counts;
  // { waiting, active, completed, failed, delayed, paused }
}
```

---

## 12. v2 — Gelişmiş İzleme

| Özellik                    | Araç                  | Tetikleyici Koşul                   |
|----------------------------|-----------------------|-------------------------------------|
| Log aggregation            | Logtail / Axiom       | Log hacmi > 100k/gün                |
| APM (uygulama performans)  | Sentry Performance    | p95 > 1s sorunları araştırılıyorsa  |
| Metrik dashboard           | Grafana + Prometheus  | Ekip büyüdüğünde                    |
| Slack entegrasyonu         | Sentry → Slack        | Ekipte ikinci kişi olduğunda        |
| Distributed tracing        | Sentry Trace          | Mikroservis geçişi planlanırsa      |

---

## 13. KVKK — Log Saklama Politikası

```
Uygulama logları (Railway): 7 gün (Railway Starter planı otomatik)
Sentry olayları: 90 gün (Sentry ücretsiz plan)
Audit logları (PostgreSQL): Süresiz (yasal zorunluluk)
Ödeme logları: 10 yıl (vergi mevzuatı)

Log içeriğinde ASLA saklanmaz:
  - TC kimlik numarası
  - Kart bilgileri
  - Şifre (hash dahil)
  - Refresh token
```

---

## 14. Lansman Öncesi İzleme Kontrol Listesi

```
□ Sentry DSN production ortamına bağlı (hem API hem web)
□ Uptime izleme aktif (muteahitt.com + api.muteahitt.com)
□ Sentry alert kuralları tanımlandı (P0 ve P1)
□ Health check endpoint çalışıyor (/v1/health → 200)
□ LoggingInterceptor tüm route'larda aktif
□ Hassas alan redact listesi güncel
□ Railway log retention yeterli (7 gün Starter)
□ Bull Queue monitoring aktif (failed job alertleri)
□ Admin dashboard metrikleri dolu görünüyor (seed ile test)
```
