# TESTING_STRATEGY.md — Test Stratejisi

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Test Piramidi

```
            ┌─────────────┐
            │   E2E (az)   │  ← Kritik akışlar, yavaş, maliyetli
            ├─────────────┤
            │ Integration  │  ← API + DB, orta hız
            ├─────────────┤
            │  Unit (çok)  │  ← Hızlı, izole, ucuz
            └─────────────┘
```

| Katman      | Hedef  | Araç                | Çalışma zamanı       |
|-------------|--------|---------------------|----------------------|
| Unit        | %70    | Jest + ts-jest      | Her commit (< 30s)   |
| Integration | %20    | Jest + Supertest    | PR öncesi (< 3 dak)  |
| E2E         | %10    | Playwright          | Nightly / release    |

---

## 2. Unit Testler

### 2.1 NestJS — Service Katmanı

Service'ler `PrismaService` mock'lanarak test edilir.
Dış servisler ve Bull Queue da mock olur.

```typescript
// offers/offers.service.spec.ts

const mockPrisma = {
  offer: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  listing: {
    findUnique: jest.fn(),
  },
};

describe('OffersService', () => {
  let service: OffersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: { dispatch: jest.fn() } },
      ],
    }).compile();

    service = module.get(OffersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('iletişim bilgisi içeren teklif reddedilmeli', async () => {
      await expect(
        service.create({ content: '0532 123 45 67 arayın' }, 'contractor-id')
      ).rejects.toThrow('OFFER_CONTAINS_CONTACT_INFO');
    });

    it('aynı ilana ikinci teklif reddedilmeli', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue({ id: 'existing-offer' });

      await expect(
        service.create({ listingId: 'listing-id', content: 'temiz teklif' }, 'contractor-id')
      ).rejects.toThrow('OFFER_ALREADY_EXISTS');
    });

    it('geçerli teklif kaydedilmeli', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue(null);
      mockPrisma.offer.create.mockResolvedValue({ id: 'new-offer-id' });

      const result = await service.create(
        { listingId: 'listing-id', content: 'Deneyimli müteahhit, referanslarım mevcut.' },
        'contractor-id'
      );
      expect(result.id).toBe('new-offer-id');
    });
  });
});
```

### 2.2 İş Mantığı — Saf Fonksiyonlar

Doğrulama algoritmaları ve filtreler bağımsız test edilir:

```typescript
// utils/tc-validator.spec.ts

describe('validateTcNumber', () => {
  it('geçerli TC numarasını kabul etmeli', () => {
    expect(validateTcNumber('12345678901')).toBe(true);
  });

  it('11 haneden az reddetmeli', () => {
    expect(validateTcNumber('1234567890')).toBe(false);
  });

  it('0 ile başlayanı reddetmeli', () => {
    expect(validateTcNumber('01234567890')).toBe(false);
  });

  it('checksum hatasını reddetmeli', () => {
    expect(validateTcNumber('12345678900')).toBe(false); // Yanlış checksum
  });
});

// utils/content-filter.spec.ts

describe('containsContactInfo', () => {
  it.each([
    ['0532 123 45 67'],
    ['+90 532 123 45 67'],
    ['test@example.com'],
    ['whatsapp yazın'],
    ['@kullanici_adi'],
    ['beş sıfır üç iki yüz yirmi'],
  ])('"%s" iletişim bilgisi olarak algılanmalı', (text) => {
    expect(containsContactInfo(text)).toBe(true);
  });

  it.each([
    ['Kadıköy\'de 750 m² arsa, 5 katlı proje için teklif bekliyorum.'],
    ['Deneyimli ve referanslı müteahhitler tercih edilir.'],
  ])('"%s" temiz metin olarak geçmeli', (text) => {
    expect(containsContactInfo(text)).toBe(false);
  });
});
```

### 2.3 Frontend — React Bileşenleri

```typescript
// web/components/ListingCard.spec.tsx
import { render, screen } from '@testing-library/react';
import { ListingCard } from './ListingCard';

describe('ListingCard', () => {
  const mockListing = {
    id: 'uuid',
    title: 'Kadıköy Arsa',
    city: 'İstanbul',
    district: 'Kadıköy',
    areaM2: 750,
    dealType: 'KAT_KARSILIGI',
    offerCount: 3,
    coverImageUrl: 'https://cdn.muteahitt.com/test.jpg',
  };

  it('ilan başlığı göstermeli', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('Kadıköy Arsa')).toBeInTheDocument();
  });

  it('teklif sayısı göstermeli', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('3 teklif')).toBeInTheDocument();
  });

  it('alan bilgisini m² ile göstermeli', () => {
    render(<ListingCard listing={mockListing} />);
    expect(screen.getByText('750 m²')).toBeInTheDocument();
  });
});
```

---

## 3. Integration Testler

### 3.1 API Endpoint Testleri (Supertest)

Integration testleri gerçek veritabanı kullanır.
Test veritabanı: `muteahitt_test` (ayrı Neon branch veya lokal PostgreSQL).

```typescript
// test/offers.e2e-spec.ts

describe('POST /v1/offers', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let contractorToken: string;
  let activeListing: Prisma.Listing;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    contractorToken = await loginAsContractor(app);
    activeListing = await seedActiveListing(prisma);
  });

  afterEach(async () => {
    await prisma.offer.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('200 — geçerli teklif kaydedilmeli', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/offers')
      .set('Authorization', `Bearer ${contractorToken}`)
      .send({ listingId: activeListing.id, content: 'Kaliteli iş garantisi.' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it('422 — iletişim bilgisi içeren teklif reddedilmeli', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/offers')
      .set('Authorization', `Bearer ${contractorToken}`)
      .send({ listingId: activeListing.id, content: '0532 123 45 67' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OFFER_CONTAINS_CONTACT_INFO');
  });

  it('401 — token olmadan reddedilmeli', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/offers')
      .send({ listingId: activeListing.id, content: 'Geçerli içerik.' });

    expect(res.status).toBe(401);
  });

  it('409 — aynı ilana çift teklif reddedilmeli', async () => {
    await request(app.getHttpServer())
      .post('/v1/offers')
      .set('Authorization', `Bearer ${contractorToken}`)
      .send({ listingId: activeListing.id, content: 'İlk teklif.' });

    const res = await request(app.getHttpServer())
      .post('/v1/offers')
      .set('Authorization', `Bearer ${contractorToken}`)
      .send({ listingId: activeListing.id, content: 'İkinci teklif.' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OFFER_ALREADY_EXISTS');
  });
});
```

### 3.2 Kritik Güvenlik Testleri

```typescript
// test/security/idor.spec.ts

describe('IDOR Koruması', () => {
  it('kullanıcı başkasının teklifini görmemeli', async () => {
    const user1Token = await loginAsUser(app, 'user1@test.com');
    const user2Token = await loginAsUser(app, 'user2@test.com');

    // user2'nin teklifi
    const offer = await createOffer(app, user2Token);

    // user1 erişmeye çalışıyor
    const res = await request(app.getHttpServer())
      .get(`/v1/offers/${offer.id}`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(403);
  });

  it('iletişim bilgisi ödemesiz görüntülenmemeli', async () => {
    const offer = await createOffer(app, contractorToken);

    const res = await request(app.getHttpServer())
      .get(`/v1/offers/${offer.id}/contact`)
      .set('Authorization', `Bearer ${landOwnerToken}`);

    // Ödeme yapılmadıysa 403
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CONTACT_NOT_UNLOCKED');
  });
});

// test/security/rate-limit.spec.ts

describe('Rate Limiting', () => {
  it('login endpoint 5 başarısız denemede kilitlenmeli', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({ email: 'test@test.com', password: 'yanlis-sifre' });
    }

    const res = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: 'test@test.com', password: 'yanlis-sifre' });

    expect(res.status).toBe(429);
  });
});
```

### 3.3 Ödeme Idempotency Testi

```typescript
describe('Ödeme Idempotency', () => {
  it('webhook iki kez gelirse contact_unlock bir kez oluşmalı', async () => {
    const webhookPayload = createIyzicoWebhookPayload('COMPLETED');

    // İki kez gönder
    await request(app.getHttpServer())
      .post('/v1/payments/webhook')
      .set('X-Iyzico-Signature', sign(webhookPayload))
      .send(webhookPayload);

    await request(app.getHttpServer())
      .post('/v1/payments/webhook')
      .set('X-Iyzico-Signature', sign(webhookPayload))
      .send(webhookPayload);

    const unlocks = await db.query(
      'SELECT COUNT(*) FROM contact_unlocks WHERE payment_id = $1',
      [webhookPayload.paymentId]
    );

    expect(Number(unlocks.rows[0].count)).toBe(1);
  });
});
```

---

## 4. E2E Testler (Playwright)

### 4.1 Kritik Akışlar

E2E testler yalnızca en kritik iş akışlarını kapsar:

```typescript
// e2e/critical-flows/payment-flow.spec.ts

test('arsa sahibi ödeme yapıp iletişim bilgisine erişebilmeli', async ({ page }) => {
  // 1. Arsa sahibi girişi
  await page.goto('/login');
  await page.fill('[name=email]', 'arsasahibi@test.com');
  await page.fill('[name=password]', 'Test1234!');
  await page.click('[type=submit]');

  // 2. İlan detayına git
  await page.goto('/listings/test-listing-id');
  await expect(page.locator('h1')).toContainText('Test İlanı');

  // 3. Teklif seç, ödeme butonuna tıkla
  await page.click('[data-testid=offer-card]:first-child');
  await page.click('[data-testid=unlock-contact-btn]');

  // 4. Iyzico sandbox — test kartı
  await page.fill('[data-testid=card-number]', '5528790000000008');
  await page.fill('[data-testid=card-expiry]', '12/30');
  await page.fill('[data-testid=card-cvv]', '123');
  await page.click('[data-testid=pay-btn]');

  // 5. İletişim bilgisi görünmeli
  await expect(page.locator('[data-testid=contact-info]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid=contractor-phone]')).toContainText('+90');
});
```

### 4.2 E2E Test Senaryoları

| Senaryo                              | Öncelik |
|--------------------------------------|---------|
| Kayıt → e-posta doğrulama → giriş    | P0      |
| İlan oluşturma → yayınlama           | P0      |
| Teklif verme                         | P0      |
| Ödeme → iletişim bilgisi açılması    | P0      |
| Admin doğrulama onayı                | P1      |
| İletişim bilgisi olmadan erişim engeli | P0    |

---

## 5. Test Ortamı

### 5.1 Test Veritabanı

```typescript
// test/test-app.factory.ts

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
  .overrideProvider('DATABASE_URL')
  .useValue(process.env.TEST_DATABASE_URL) // Ayrı test DB
  .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app); // Pipe, interceptor, filter — prod ile aynı
  await app.init();
  return app;
}
```

### 5.2 Seed Fonksiyonları

```typescript
// test/seeds/index.ts

export async function seedActiveListing(prisma: PrismaService) {
  const owner = await prisma.user.create({
    data: createTestUser({ role: 'LAND_OWNER', status: 'ACTIVE' }),
  });
  return prisma.listing.create({
    data: {
      ownerId: owner.id,
      title: 'Test İlanı',
      city: 'İstanbul',
      district: 'Kadıköy',
      areaM2: 750,
      dealType: 'KAT_KARSILIGI',
      status: 'ACTIVE',
    },
  });
}

export async function loginAsContractor(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/v1/auth/login')
    .send({ email: 'contractor@test.com', password: 'Test1234!' });
  return res.body.data.accessToken;
}
```

---

## 6. CI Pipeline Entegrasyonu

```yaml
# .github/workflows/ci.yml (test bölümü)

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: muteahitt_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3

      - name: Unit testler
        run: pnpm -r test:unit
        env:
          NODE_ENV: test

      - name: Integration testler
        run: pnpm --filter api test:integration
        env:
          TEST_DATABASE_URL: postgresql://test:test@localhost/muteahitt_test
          REDIS_URL: redis://localhost:6379
          NODE_ENV: test

      - name: Coverage raporu
        run: pnpm --filter api test:coverage
```

---

## 7. Coverage Hedefleri

| Katman               | Minimum Coverage | Kritik Dosyalar (100% hedef)          |
|----------------------|------------------|---------------------------------------|
| Service katmanı      | %80              | payments.service, auth.service        |
| Utils / validators   | %95              | tc-validator, content-filter          |
| Controller katmanı   | %60              | —                                     |
| Frontend bileşenler  | %50              | —                                     |
| E2E akışlar          | P0 listesi tam   | Ödeme akışı                           |

Coverage rakamı amaç değil araçtır.
%100 coverage hatalı mantığı önlemez.
Kritik iş kurallarının test edilmesi, rakamdan önemlidir.

---

## 8. Test Yazma Kuralları

```
✅ Her servis metodunun happy path testi olmalı
✅ Her AppException fırlatan durum test edilmeli
✅ Güvenlik kontrolleri (auth, ownership) test edilmeli
✅ Idempotent operasyonlar çift çağrı ile test edilmeli

❌ Private metodları doğrudan test etme — public arayüzü test et
❌ Mock'u test etme — mock.toBeCalledWith yerine sonucu doğrula
❌ Implementasyon detayını test etme — davranışı test et
❌ Test için production kodu değiştirme (test-only flag, vb.)
```

### 8.1 Test İsimlendirme Standardı

```typescript
// Format: [koşul] — [beklenen sonuç]
it('iletişim bilgisi içeren teklif reddedilmeli')
it('geçersiz token ile istek 401 dönmeli')
it('webhook iki kez gelirse tek unlock oluşmalı')

// Değil:
it('test 1')
it('offers service create method')
it('should work')
```

---

## 9. Mobil Test Stratejisi (v2 — Expo)

```typescript
// apps/mobile — Jest + React Native Testing Library

describe('ListingCard', () => {
  it('ilan başlığı ve alan bilgisi göstermeli', () => {
    const { getByText } = render(<ListingCard listing={mockListing} />);
    expect(getByText('Kadıköy Arsa')).toBeTruthy();
    expect(getByText('750 m²')).toBeTruthy();
  });
});
```

**Expo E2E:** Maestro veya Detox ile kritik akış testleri.
MVP'de mobile E2E öncelik değildir — v2 uygulaması stabilize olduktan sonra eklenir.
