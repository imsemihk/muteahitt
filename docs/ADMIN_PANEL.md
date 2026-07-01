# ADMIN_PANEL.md — Yönetim Paneli

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Genel Bakış

Admin paneli ayrı bir uygulama değildir. `apps/web` içinde `/admin` route
grubu olarak konumlanır. Next.js App Router layout sistemi sayesinde
admin sayfaları kendi layout'larını, navigation'larını ve auth guard'larını
paylaşır.

```
apps/web/app/
  (public)/           ← Giriş yapmamış ziyaretçi sayfaları
  (app)/              ← Giriş yapmış kullanıcı sayfaları
  (admin)/            ← Admin-only sayfalar (ayrı layout)
    layout.tsx        ← Admin sidebar + header
    dashboard/
    users/
    verifications/
    listings/
    offers/
    payments/
    audit-logs/
```

**Erişim:** Yalnızca `role = ADMIN` kullanıcılar.
Admin layout'unda middleware rol kontrolü yapar; yetersiz rol → 403.

---

## 2. Admin Kullanıcı Yönetimi

### 2.1 İlk Admin Ataması

Admin kullanıcısı uygulama içinden oluşturulamaz.
İlk admin doğrudan veritabanı veya seed script ile oluşturulur:

```typescript
// scripts/create-admin.ts
// Railway'de bir kez çalıştırılır: pnpm ts-node scripts/create-admin.ts

async function createAdmin() {
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD!, 12);
  await db.insert(users).values({
    email: process.env.ADMIN_EMAIL!,
    passwordHash: hash,
    role: 'ADMIN',
    status: 'ACTIVE',
    fullName: 'Platform Admin',
  });
}
```

**Kural:** Admin hesabı kayıt akışından geçmez, doğrulama beklemez.
Yeni admin atama yalnızca mevcut bir admin tarafından API üzerinden yapılır:
`POST /admin/users/:id/change-role` — audit log yazılır.

---

## 3. Ekranlar ve Yetenekler

### 3.1 Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                           2026-07-01 │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Bekleyen     │ Aktif        │ Bugün        │ Bu Ay              │
│ Doğrulama    │ Kullanıcı    │ Yeni Kayıt   │ Gelir              │
│     12       │    847       │     8        │   ₺12.750          │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│  Son 7 Gün — Kayıt / Ödeme Grafiği                             │
│  [Bar chart — her gün kayıt + ödeme sayısı]                    │
├─────────────────────────────────────────────────────────────────┤
│  Bekleyen Doğrulama Listesi (ilk 5)                            │
│  ─────────────────────────────────                             │
│  • Ahmet Yılmaz   BIREYSEL  2 saat önce   [İncele]            │
│  • ABC İnşaat     ŞİRKET    5 saat önce   [İncele]            │
│  • ...                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**API çağrıları:**
- `GET /admin/stats` → sayaçlar
- `GET /admin/verifications?status=PENDING&limit=5` → bekleyen liste

### 3.2 Kullanıcı Listesi

```
┌────────────────────────────────────────────────────────────────────────┐
│  Kullanıcılar                            [Arama: ad, e-posta, TC...]   │
│  [Filtre: Rol ▼] [Filtre: Durum ▼] [Filtre: Tarih aralığı]           │
├──────────┬─────────────────┬───────────┬────────────┬─────────────────┤
│  Ad      │  E-posta        │  Rol      │  Durum     │  İşlem          │
├──────────┼─────────────────┼───────────┼────────────┼─────────────────┤
│  A. Yılmaz│ a@example.com  │ LAND_OWN  │ ACTIVE     │ [Görüntüle]    │
│  B. Demir │ b@example.com  │ CONTRACTR │ PENDING    │ [Görüntüle]    │
└──────────┴─────────────────┴───────────┴────────────┴─────────────────┘
```

Arama: ad, soyad, e-posta, TC son 4 hane (tam TC aranamaz — güvenlik).

### 3.3 Kullanıcı Detay Sayfası

```
┌──────────────────────────────────────────────────────────────────┐
│  Kullanıcı: Ahmet Yılmaz                     ID: uuid-truncated  │
├─────────────────────────┬────────────────────────────────────────┤
│  Hesap Bilgileri        │  Doğrulama Durumu                      │
│  ─────────────────────  │  ─────────────────────────────────     │
│  E-posta: a@...         │  Tip: BİREYSEL                         │
│  Tel: +905...           │  Durum: PENDING_APPROVAL               │
│  Rol: LAND_OWNER        │  Başvuru: 2026-06-30 14:22             │
│  Durum: PENDING         │  TC (son 4): *******1234               │
│  Kayıt: 2026-06-30      │                                        │
├─────────────────────────┴────────────────────────────────────────┤
│  Belgeler                                                        │
│  • kimlik_on.jpg    [Görüntüle]  2026-06-30                      │
│  • kimlik_arka.jpg  [Görüntüle]  2026-06-30                      │
├──────────────────────────────────────────────────────────────────┤
│  Admin Notları                                                   │
│  [Textarea — sadece adminler görür]                              │
├──────────────────────────────────────────────────────────────────┤
│  İşlemler                                                        │
│  [Onayla ✓]  [Reddet ✗]  [Kısıtla ⚠]  [Ek Belge İste 📎]      │
│  [Rolü Değiştir]  [Hesabı Düzenle]                              │
├──────────────────────────────────────────────────────────────────┤
│  Audit Log (bu kullanıcıya ait)                                  │
│  2026-07-01 09:00  admin@... → STATUS: PENDING→ACTIVE           │
│  2026-06-30 14:22  SYSTEM   → VERIFICATION_SUBMITTED             │
└──────────────────────────────────────────────────────────────────┘
```

### 3.4 Doğrulama Kuyruğu

```
GET /admin/verifications?status=PENDING&sortBy=createdAt&order=ASC
```

Doğrulama kuyruğu ilk girilen ilk incelenir (FIFO) prensibiyle sıralanır.
24 saat hedefi için renk kodlaması:

```
< 8 saat     → Yeşil arka plan
8–24 saat    → Sarı arka plan
> 24 saat    → Kırmızı arka plan (SLA ihlali)
```

### 3.5 İlan Yönetimi

| İşlem            | Endpoint                               | Audit Log |
|------------------|----------------------------------------|-----------|
| Listele          | `GET /admin/listings`                  | Hayır     |
| Detay            | `GET /admin/listings/:id`              | Hayır     |
| Askıya Al        | `PATCH /admin/listings/:id/suspend`    | Evet      |
| Yeniden Aktifleştir | `PATCH /admin/listings/:id/activate` | Evet    |
| Sil (hard)       | `DELETE /admin/listings/:id`           | Evet      |

**Admin ilan silme:** Soft-delete yerine hard-delete yapabilir.
30 günlük dosya silme toleransı yine de uygulanır.

### 3.6 Ödeme Yönetimi

| İşlem              | Endpoint                              | Not                         |
|--------------------|---------------------------------------|-----------------------------|
| Listele            | `GET /admin/payments`                 | Filtre: durum, tarih, tutar |
| Detay              | `GET /admin/payments/:id`             | Iyzico referans ID dahil    |
| Manuel İade        | `POST /admin/payments/:id/refund`     | Iyzico API çağrısı          |
| Manuel Kilit Aç    | `POST /admin/contact-unlocks/grant`   | Ödeme olmadan erişim ver    |
| Manuel Kilit Kapat | `POST /admin/contact-unlocks/revoke`  | Erişimi geri al             |

İade akışı: bkz. PAYMENT_SYSTEM.md §Refund.

### 3.7 Audit Log Ekranı

```
┌────────────────────────────────────────────────────────────────────────┐
│  Audit Log                  [Filtre: Kullanıcı] [Aksiyon] [Tarih]     │
├──────────────┬────────────┬──────────────┬────────────┬───────────────┤
│  Zaman       │ Admin      │ Hedef        │ Aksiyon    │  Detay        │
├──────────────┼────────────┼──────────────┼────────────┼───────────────┤
│ 01.07 09:15  │ admin@..   │ User:uuid    │ APPROVED   │ —             │
│ 01.07 09:10  │ admin@..   │ User:uuid    │ RESTRICTED │ "Sahte belge" │
│ 01.07 09:05  │ admin@..   │ Payment:uuid │ REFUNDED   │ "Kullanıcı    │
│              │            │              │            │  talebi"      │
└──────────────┴────────────┴──────────────┴────────────┴───────────────┘
```

Audit log salt okunur. Filtreleme: admin kullanıcıya göre, entity türüne göre,
aksiyon türüne göre, tarih aralığına göre.

---

## 4. Admin API Endpoint Özeti

Tüm endpoint'ler `ADMIN` rolü gerektirir. Her mutasyon audit log yazar.

### Kullanıcı İşlemleri

```
GET    /v1/admin/users                         → Kullanıcı listesi (sayfalı)
GET    /v1/admin/users/:id                     → Kullanıcı detay
PATCH  /v1/admin/users/:id/approve             → Hesap onayla
PATCH  /v1/admin/users/:id/reject              → Hesap reddet
PATCH  /v1/admin/users/:id/restrict            → Kısıtla (RESTRICTED)
PATCH  /v1/admin/users/:id/suspend             → Askıya al (SUSPENDED)
PATCH  /v1/admin/users/:id/activate            → Yeniden aktifleştir
PATCH  /v1/admin/users/:id/change-role         → Rol değiştir
PATCH  /v1/admin/users/:id/edit                → Temel bilgi düzenle
```

### Doğrulama İşlemleri

```
GET    /v1/admin/verifications                 → Kuyruk listesi
GET    /v1/admin/verifications/:id             → Doğrulama detay
PATCH  /v1/admin/verifications/:id/approve     → Onayla
PATCH  /v1/admin/verifications/:id/reject      → Reddet
PATCH  /v1/admin/verifications/:id/request-docs → Ek belge iste
```

### İlan İşlemleri

```
GET    /v1/admin/listings                      → Liste
GET    /v1/admin/listings/:id                  → Detay
PATCH  /v1/admin/listings/:id/suspend          → Askıya al
PATCH  /v1/admin/listings/:id/activate         → Aktifleştir
DELETE /v1/admin/listings/:id                  → Sil
```

### Ödeme ve Kilit İşlemleri

```
GET    /v1/admin/payments                      → Ödeme listesi
GET    /v1/admin/payments/:id                  → Detay
POST   /v1/admin/payments/:id/refund           → İade
POST   /v1/admin/contact-unlocks/grant         → Manuel kilit aç
POST   /v1/admin/contact-unlocks/revoke        → Manuel kilit kapat
```

### Raporlama

```
GET    /v1/admin/stats                         → Dashboard sayaçları
GET    /v1/admin/audit-logs                    → Audit log listesi
GET    /v1/admin/reports/revenue               → Gelir raporu (tarih aralığı)
```

---

## 5. Admin İşlem Akışları

### 5.1 Onaylama Akışı

```
Admin [Onayla] butonuna tıklar
        │
        ▼
PATCH /admin/users/:id/approve
        │
        ├── users.status = ACTIVE
        ├── individual_verifications.status = APPROVED (veya company_verifications)
        ├── audit_logs INSERT: { adminId, entityType: USER, action: APPROVED, userId }
        └── NotificationService.dispatch({ type: 'ACCOUNT_APPROVED', userId })
                │
                ├── notifications tablosuna kayıt
                └── emailQueue.add('account-approved')
```

### 5.2 Reddetme Akışı

```
Admin [Reddet] butonuna tıklar
        │
        ▼
Modal: "Red sebebi (zorunlu)" [Textarea] [Gönder]
        │
        ▼
PATCH /admin/users/:id/reject { reason: "..." }
        │
        ├── users.status = REJECTED
        ├── verifications.status = REJECTED
        ├── verifications.admin_note = reason
        ├── audit_logs INSERT
        └── NotificationService.dispatch({ type: 'ACCOUNT_REJECTED', reason })
```

### 5.3 Kısıtlama Akışı

```
Admin [Kısıtla] butonuna tıklar
        │
        ▼
Modal: "Kısıtlama sebebi (zorunlu)" [Textarea] [Gönder]
        │
        ▼
PATCH /admin/users/:id/restrict { reason: "..." }
        │
        ├── users.status = RESTRICTED
        ├── audit_logs INSERT
        └── NotificationService.dispatch({ type: 'ACCOUNT_RESTRICTED' })
                │
                └── Kullanıcı artık yalnızca profil sayfasını görebilir
```

### 5.4 Ek Belge İsteme Akışı

```
Admin [Ek Belge İste] butonuna tıklar
        │
        ▼
Modal: "Hangi belge isteniyor?" [Textarea] [Gönder]
        │
        ▼
PATCH /admin/verifications/:id/request-docs { note: "..." }
        │
        ├── verifications.status = REQUIRES_MORE_INFO
        ├── verifications.admin_note = note
        ├── audit_logs INSERT
        └── NotificationService.dispatch({ type: 'EXTRA_DOCS_REQUIRED', note })
```

---

## 6. Güvenlik Katmanları

Admin endpoint'leri standart 9 güvenlik katmanının üstüne ek kontroller içerir:

```typescript
// admin/guards/admin.guard.ts

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Admin yetkisi gereklidir.');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Admin hesabı aktif değil.');
    }
    return true;
  }
}
```

**Rate limit — admin endpoint'leri:**

```
/admin/* → 200 istek/dakika/IP
(normal kullanıcı rate limit'lerinden bağımsız)
```

**Admin log zorunluluğu:** Her `POST`, `PATCH`, `DELETE` isteği
`AuditLogInterceptor` tarafından otomatik yakalanır:

```typescript
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const adminId = request.user.id;

    return next.handle().pipe(
      tap(() => {
        // Route'tan entity bilgisi parse edilir
        // Her admin mutasyon endpoint'i @AuditAction() decorator taşır
      }),
    );
  }
}
```

---

## 7. Admin Panel Frontend Gereksinimleri

### 7.1 Teknoloji

Admin panel ayrı bir SPA değildir. Next.js App Router içinde `(admin)` route
grubu. `app/(admin)/layout.tsx` içindeki sidebar tüm admin sayfalarında ortak
kullanılır.

### 7.2 Erişim Kontrolü — Middleware

```typescript
// middleware.ts (Next.js)
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('access_token')?.value;
    if (!token) return NextResponse.redirect('/login');

    const payload = verifyToken(token);
    if (payload.role !== 'ADMIN') {
      return NextResponse.redirect('/dashboard');
    }
  }
}
```

### 7.3 Tablo Bileşeni

Admin listeleri için TanStack Table (headless) kullanılır:
- Sütun sıralama
- Sayfalama (server-side)
- Filtreler
- Satır seçimi (toplu işlem için — v2)

### 7.4 Belge Görüntüleyici

Doğrulama belgelerini görüntülemek için:
1. Admin "Görüntüle" butonuna tıklar
2. Frontend: `GET /v1/admin/verifications/:verificationId/documents/:docId/url`
3. API: R2 presigned URL üretir (15 dakika geçerli) + audit log yazar
4. Frontend: Yeni sekmede açar veya modal içinde gösterir

Hassas belge görüntüleme her seferinde audit log'a işlenir.

---

## 8. Raporlama

### 8.1 Gelir Raporu

```sql
-- GET /admin/reports/revenue?from=2026-07-01&to=2026-07-31
SELECT
  DATE_TRUNC('day', completed_at) AS day,
  COUNT(*)                        AS payment_count,
  SUM(amount_try)                 AS total_revenue,
  AVG(amount_try)                 AS avg_revenue
FROM payments
WHERE status = 'COMPLETED'
  AND completed_at BETWEEN :from AND :to
GROUP BY 1
ORDER BY 1;
```

### 8.2 Dashboard Sayaçları

```typescript
// GET /admin/stats
{
  pendingVerifications: 12,
  activeUsers: 847,
  todayRegistrations: 8,
  monthRevenue: 12750,     // TRY kuruş cinsinden değil, tam TRY
  activeListings: 234,
  pendingOffers: 89,
}
```

---

## 9. MVP Sonrası Roadmap

| Özellik                        | Versiyon | Açıklama                                    |
|--------------------------------|----------|---------------------------------------------|
| Toplu kullanıcı işlemi         | v1.5     | Çoklu seçim → toplu onayla/reddet           |
| CSV dışa aktarma               | v1.5     | Kullanıcı ve ödeme raporları                |
| Admin aktivite özeti           | v2       | Adminlerin işlem istatistikleri             |
| İçerik moderasyon kuyruğu      | v2       | AI bayrakladığı ilanlar + manuel inceleme   |
| Çok adminli rol yapısı         | v2       | SUPER_ADMIN / MODERATOR / SUPPORT ayırımı   |
