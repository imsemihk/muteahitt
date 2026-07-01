# SEARCH_AND_FILTERING.md — Arama ve Filtreleme

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. MVP Stratejisi: PostgreSQL Full-Text Search

MVP'de ayrı bir arama motoru kurulmaz. PostgreSQL'in yerleşik full-text
search ve indexleme yetenekleri kullanılır.

**Gerekçe:**
- Ek servis maliyeti yok (Neon üzerinde çalışır)
- Operasyonel karmaşıklık yok (senkronizasyon gerektirmez)
- 10.000 ilana kadar yeterli performans (< 100ms)
- Meilisearch'e geçiş mümkün ve planlanmış (v2)

**Sınırlılık:** Türkçe morfoloji desteği zayıf.
"müteahhit" araması "müteahhitler" veya "müteahhitlik" döndürmeyebilir.
Bu v2'de Meilisearch ile çözülür.

---

## 2. Veri Modeli — Arama İndeksi

İlan tablosuna full-text search kolonu eklenir:

```sql
-- Mevcut listings tablosuna eklenir (migration)
ALTER TABLE listings
  ADD COLUMN search_vector TSVECTOR;

-- search_vector otomatik güncelleme trigger'ı
CREATE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('turkish', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('turkish', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('turkish', COALESCE(NEW.city, '')), 'A') ||
    setweight(to_tsvector('turkish', COALESCE(NEW.district, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION listings_search_vector_update();

-- GIN index (full-text için optimize)
CREATE INDEX idx_listings_search_vector
  ON listings USING GIN(search_vector);
```

**Ağırlık sistemi:**
- `A` (en yüksek): title, city, district
- `B` (orta): description

---

## 3. İlan Arama ve Filtreleme API

```
GET /v1/listings?{parametreler}
```

### 3.1 Desteklenen Parametreler

| Parametre     | Tip             | Açıklama                                         |
|---------------|-----------------|--------------------------------------------------|
| `q`           | string          | Serbest metin araması                            |
| `city`        | string          | İl (tam eşleşme)                                 |
| `district`    | string          | İlçe (tam eşleşme)                               |
| `dealType`    | enum            | KAT_KARSILIGI, NAKIT_DAIRE, NAKIT, NEGOTIABLE   |
| `minArea`     | number          | Minimum arsa alanı (m²)                          |
| `maxArea`     | number          | Maksimum arsa alanı (m²)                         |
| `minFloors`   | number          | Minimum kat sayısı                               |
| `maxFloors`   | number          | Maksimum kat sayısı                              |
| `zoningStatus`| string          | İmar durumu                                      |
| `sortBy`      | enum            | createdAt, areaM2, offerCount (varsayılan: createdAt) |
| `order`       | asc \| desc     | Sıralama yönü (varsayılan: desc)                 |
| `page`        | number          | Sayfa numarası (varsayılan: 1)                   |
| `limit`       | number          | Sayfa başı sonuç (varsayılan: 20, max: 50)       |

### 3.2 Örnek İstekler

```
# İstanbul'da kat karşılığı ilanlar, büyükten küçüğe
GET /v1/listings?city=İstanbul&dealType=KAT_KARSILIGI&sortBy=areaM2&order=desc

# "Kadıköy arsa" araması
GET /v1/listings?q=Kadıköy+arsa

# 500-1000 m² aralığında aktif ilanlar
GET /v1/listings?minArea=500&maxArea=1000&page=2&limit=20
```

### 3.3 Response Formatı

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Kadıköy Merkezi Arsa",
        "city": "İstanbul",
        "district": "Kadıköy",
        "areaM2": 750,
        "dealType": "KAT_KARSILIGI",
        "zoningStatus": "KONUT",
        "offerCount": 3,
        "coverImageUrl": "https://cdn.muteahitt.com/...",
        "createdAt": "2026-06-15T10:00:00Z",
        "owner": {
          "id": "uuid",
          "fullName": "A. Yılmaz",
          "avatarUrl": "https://cdn.muteahitt.com/..."
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 147,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 4. Query Builder (Prisma)

Prisma, karmaşık arama sorgularında `$queryRaw` veya `findMany` + `where`
kombinasyonu ile kullanılır.

```typescript
// listings/listings.service.ts

async search(filters: ListingSearchDto) {
  const { q, city, district, dealType, minArea, maxArea,
          minFloors, maxFloors, zoningStatus, sortBy, order, page, limit } = filters;

  const take = Math.min(limit ?? 20, 50);
  const skip = ((page ?? 1) - 1) * take;

  // Full-text arama varsa $queryRaw kullan (ts_rank için)
  if (q) {
    const tsQuery = q.trim().split(/\s+/).map(w => `${w}:*`).join(' & ');

    const [items, total] = await Promise.all([
      this.prisma.$queryRaw<Listing[]>`
        SELECT l.*, ts_rank(l.search_vector, to_tsquery('turkish', ${tsQuery})) AS rank
        FROM listings l
        WHERE l.status = 'ACTIVE'
          AND l.deleted_at IS NULL
          AND l.search_vector @@ to_tsquery('turkish', ${tsQuery})
          ${city    ? Prisma.sql`AND l.city = ${city}`       : Prisma.empty}
          ${district? Prisma.sql`AND l.district = ${district}`: Prisma.empty}
          ${dealType? Prisma.sql`AND l.deal_type = ${dealType}`: Prisma.empty}
          ${minArea ? Prisma.sql`AND l.area_m2 >= ${minArea}` : Prisma.empty}
          ${maxArea ? Prisma.sql`AND l.area_m2 <= ${maxArea}` : Prisma.empty}
        ORDER BY rank DESC
        LIMIT ${take} OFFSET ${skip}
      `,
      this.prisma.listing.count({
        where: this.buildWhereClause(filters),
      }),
    ]);

    return { items, total, page: page ?? 1, take };
  }

  // Normal filtreleme — Prisma findMany
  const where = this.buildWhereClause(filters);
  const orderBy = {
    createdAt: { createdAt: order ?? 'desc' },
    areaM2:    { areaM2:    order ?? 'desc' },
    offerCount:{ offerCount: order ?? 'desc' },
  }[sortBy ?? 'createdAt'] ?? { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    this.prisma.listing.findMany({ where, orderBy, take, skip, include: { images: { where: { isCover: true }, take: 1 }, owner: { select: { id: true, fullName: true, avatarUrl: true } } } }),
    this.prisma.listing.count({ where }),
  ]);

  return { items, total, page: page ?? 1, take };
}

private buildWhereClause(filters: ListingSearchDto) {
  return {
    status: 'ACTIVE' as const,
    deletedAt: null,
    ...(filters.city     && { city:      filters.city }),
    ...(filters.district && { district:  filters.district }),
    ...(filters.dealType && { dealType:  filters.dealType }),
    ...(filters.zoningStatus && { zoningType: filters.zoningStatus }),
    ...((filters.minArea || filters.maxArea) && {
      areaM2: {
        ...(filters.minArea && { gte: filters.minArea }),
        ...(filters.maxArea && { lte: filters.maxArea }),
      },
    }),
    ...((filters.minFloors || filters.maxFloors) && {
      maxFloors: {
        ...(filters.minFloors && { gte: filters.minFloors }),
        ...(filters.maxFloors && { lte: filters.maxFloors }),
      },
    }),
  };
}
```

---

## 5. Önbellekleme Stratejisi

### 5.1 Ne Önbelleğe Alınır

```
Filtreli liste istekleri → Kısa TTL Redis cache
Filtresiz popüler ilanlar → Uzun TTL Redis cache
Şehir/ilçe listesi → Uzun TTL Redis cache
```

### 5.2 Cache Key Yapısı

```typescript
// Cache key: arama parametrelerinin deterministik hash'i

function buildCacheKey(filters: ListingSearchDto): string {
  const sorted = Object.keys(filters)
    .sort()
    .reduce((acc, key) => {
      acc[key] = filters[key as keyof ListingSearchDto];
      return acc;
    }, {} as Record<string, unknown>);

  const hash = createHash('md5').update(JSON.stringify(sorted)).digest('hex').slice(0, 8);
  return `listings:search:${hash}`;
}

// TTL tablosu
const CACHE_TTL = {
  listingSearch: 60,        // 60 saniye — filtreli arama
  popularListings: 300,     // 5 dakika — ana sayfa listesi
  cityDistricts: 86400,     // 1 gün — lokasyon listesi
};
```

### 5.3 Cache İnvalidasyon

```typescript
// Yeni ilan oluşturulduğunda veya güncellendiğinde
async invalidateListingCache(): Promise<void> {
  // Pattern tabanlı silme
  const keys = await this.redis.keys('listings:search:*');
  if (keys.length > 0) {
    await this.redis.del(...keys);
  }
}
```

**Not:** Pattern tabanlı `KEYS` komutu production'da büyük veritabanlarında
bloklamaya neden olabilir. 100.000+ key olduğunda `SCAN` tabanlı yaklaşıma
geçilmeli. MVP boyutunda güvenli.

---

## 6. Şehir ve İlçe Listesi

Türkiye'nin 81 ili ve ilçeleri statik veri olarak tutulur.
Dinamik sorgulama yerine seed data tercih edilir:

```typescript
// packages/shared/src/data/turkey-locations.ts

export const TURKEY_CITIES = [
  {
    name: 'İstanbul',
    districts: [
      'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar',
      'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş',
      'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca',
      'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih',
      'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal',
      'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
      'Şile', 'Silivri', 'Şişli', 'Sultanbeyli', 'Sultangazi',
      'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu',
    ],
  },
  {
    name: 'Ankara',
    districts: [ /* ... */ ],
  },
  // ... 79 il daha
] as const;
```

**GET /v1/listings/cities** → Şehir listesi (Redis cache 1 gün)
**GET /v1/listings/cities/:city/districts** → İlçe listesi (Redis cache 1 gün)

---

## 7. offer_count Denormalizasyonu

Teklif sayısına göre sıralama için her sorguda COUNT sorgusu çalıştırmak
pahalıdır. `listings` tablosunda `offer_count` kolonu denormalize tutulur:

```sql
-- listings tablosunda
offer_count INTEGER NOT NULL DEFAULT 0
```

```typescript
// Teklif oluşturulduğunda
await this.listingRepo.increment({ id: listingId }, 'offerCount', 1);

// Teklif geri çekildiğinde
await this.listingRepo.decrement({ id: listingId }, 'offerCount', 1);
```

**Tutarlılık riski:** İki işlem arasında crash olursa sayaç kayar.
Günlük cron ile doğrulama yapılır:

```sql
-- Cron: günde bir kez tutarlılık kontrolü
UPDATE listings l
SET offer_count = (
  SELECT COUNT(*) FROM offers o
  WHERE o.listing_id = l.id
  AND o.status NOT IN ('WITHDRAWN', 'REJECTED')
)
WHERE l.offer_count != (
  SELECT COUNT(*) FROM offers o
  WHERE o.listing_id = l.id
  AND o.status NOT IN ('WITHDRAWN', 'REJECTED')
);
```

---

## 8. Pagination Seçimi: Offset vs Cursor

MVP'de **offset pagination** kullanılır (`page` + `limit`).
Basit implementasyon, UI'da "Sayfa 3 / 8" gösterimi mümkün.

**Cursor pagination ne zaman geçilir?**
- 100.000+ ilan olduğunda (offset pahalılaşır)
- Gerçek zamanlı feed gerektiğinde (yeni ilan eklendikçe sayfa kayması)

v2'de cursor tabanlı geçiş yapılabilir; API response'a `nextCursor` alanı
eklenir, `page` parametresi `cursor` ile değiştirilir.

---

## 9. Güvenlik — Arama Injection

Query builder parametre binding kullanır, string concatenation yoktur.
TypeORM parametrik sorgular SQL injection'ı önler.

**Ek önlemler:**

Prisma parametrik sorgular (`$queryRaw` ile tagged template literals)
SQL injection'ı önler. String concatenation hiçbir zaman kullanılmaz.

```typescript
// DTO validasyonu — Zod (packages/shared)
export const ListingSearchSchema = z.object({
  q: z.string().max(200).transform(v => v?.trim().replace(/['";<>]/g, '')).optional(),

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(999999)
  minArea?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  // ...
}
```

---

## 10. v2 — Meilisearch Geçişi

| Kriter                 | PostgreSQL FTS (MVP) | Meilisearch (v2)           |
|------------------------|----------------------|----------------------------|
| Türkçe morfoloji       | Zayıf                | Güçlü (yapılandırılabilir) |
| Typo toleransı         | Hayır                | Evet (levenshtein)         |
| Arama hızı (10k kayıt) | < 100ms              | < 20ms                     |
| Kurulum karmaşıklığı   | Sıfır (PostgreSQL)   | Ek servis gerekir          |
| Veri senkronizasyonu   | Otomatik (trigger)   | Manuel sync gerekir        |
| Aylık maliyet          | $0 (Neon dahil)      | ~$30 (Meilisearch Cloud)   |

**Geçiş stratejisi:**
1. Meilisearch instance'ı kur (Railway veya Meilisearch Cloud)
2. Mevcut ilanları toplu index'e yükle
3. Yeni ilan/güncelleme olaylarında `SearchService.index()` çağır
4. `/v1/listings` endpoint'ini Meilisearch'e yönlendir
5. PostgreSQL FTS trigger'larını kaldır (opsiyonel, boş yer açar)

**Meilisearch index konfigürasyonu:**

```typescript
// v2: search/meilisearch.service.ts

const indexSettings = {
  searchableAttributes: ['title', 'description', 'city', 'district'],
  filterableAttributes: ['city', 'district', 'dealType', 'status', 'zoningStatus'],
  sortableAttributes: ['createdAt', 'areaM2', 'offerCount'],
  rankingRules: [
    'words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'
  ],
  typoTolerance: {
    enabled: true,
    minWordSizeForTypos: { oneTypo: 5, twoTypos: 9 },
  },
};
```

---

## 11. Performans Hedefleri

| Senaryo                              | Hedef    | Ölçüm yöntemi          |
|--------------------------------------|----------|------------------------|
| Filtresiz liste (ilk sayfa)          | < 50ms   | PostgreSQL EXPLAIN      |
| Şehir filtresi + sıralama            | < 80ms   | PostgreSQL EXPLAIN      |
| Full-text arama (10k ilan)           | < 150ms  | k6 load test            |
| Cache hit (Redis)                    | < 5ms    | Redis MONITOR           |
| Şehir/ilçe listesi                   | < 10ms   | Redis cache             |

**PostgreSQL index stratejisi:**

Indexler Prisma schema'da `@@index` direktifi ile tanımlanır.
Full-text search index ve GIN index, `prisma migrate dev` ile oluşturulan
migration dosyasına manuel olarak eklenir:

```sql
-- prisma/migrations/<timestamp>_add_search_indexes/migration.sql

-- Durum + şehir kombinasyonu (en sık filtre)
CREATE INDEX idx_listings_status_city ON listings(status, city)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Sıralama için
CREATE INDEX idx_listings_created_at  ON listings(created_at DESC);
CREATE INDEX idx_listings_area_m2     ON listings(area_m2 DESC);
CREATE INDEX idx_listings_offer_count ON listings(offer_count DESC);

-- Full-text search (search_vector kolonu ayrıca eklenir)
ALTER TABLE listings ADD COLUMN search_vector TSVECTOR;
CREATE INDEX idx_listings_search_vector ON listings USING GIN(search_vector);
```
