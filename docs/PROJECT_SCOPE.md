# PROJECT_SCOPE.md — MVP Kapsam Belgesi

Sürüm: 1.1  
Tarih: 2026-07-01  
Durum: Onaylı

---

## 1. Projenin Amacı

müteahitt.com, Türkiye'deki arsa sahipleri ile müteahhitleri dijital ortamda buluşturan
bir pazaryeridir. Platform; kimlik doğrulamalı üyelik, ilan oluşturma, teklif verme
ve ödeme duvarı arkasında iletişim bilgisi paylaşımı olmak üzere dört temel döngü
üzerine kuruludur.

---

## 2. Kullanıcı Tipleri ve Rolleri

### Kullanıcı Tipleri (user_type)

| Tip          | Kimler                           | Doğrulama                          |
|--------------|----------------------------------|------------------------------------|
| `INDIVIDUAL` | Bireysel arsa sahipleri          | TC kimlik numarası + doğum tarihi  |
| `COMPANY`    | Şirketler ve müteahhitler        | Vergi no, ticaret sicil, belgeler  |

### Roller (role)

| Rol          | Açıklama                                              |
|--------------|-------------------------------------------------------|
| `LAND_OWNER` | Arsa ilanı açar, teklifleri inceler, ödeme yapar      |
| `CONTRACTOR` | İlanları görür, teklif verir, firma profili oluşturur |
| `ADMIN`      | Tüm sistemi yönetir                                   |

---

## 3. Hesap Durumu Sistemi

### Durum Tanımları

| Durum              | Açıklama                                                        |
|--------------------|-----------------------------------------------------------------|
| `PENDING_EMAIL`    | Kayıt tamamlandı, e-posta doğrulanmadı                         |
| `PENDING_APPROVAL` | E-posta doğrulandı, admin onayı bekleniyor                     |
| `RESTRICTED`       | Admin kısıtlı onayladı (ilan görebilir, işlem yapamaz)         |
| `ACTIVE`           | Tam onaylı, tüm işlemler açık                                  |
| `REJECTED`         | Admin reddetti (gerekçe zorunlu)                               |
| `SUSPENDED`        | Admin askıya aldı (gerekçe zorunlu)                            |

### İzin Matrisi

| İşlem                      | PENDING_EMAIL | PENDING_APPROVAL | RESTRICTED | ACTIVE |
|----------------------------|:---:|:---:|:---:|:---:|
| Giriş yapabilir            | ✅  | ✅  | ✅  | ✅  |
| Profil düzenleyebilir      | ✅  | ✅  | ✅  | ✅  |
| Doğrulama belgesi yükleyebilir | ❌ | ✅ | ✅  | ✅  |
| İlanları görebilir         | ❌  | ❌  | ✅  | ✅  |
| İlan açabilir (LAND_OWNER) | ❌  | ❌  | ❌  | ✅  |
| Teklif verebilir (CONTRACTOR) | ❌ | ❌ | ❌  | ✅  |
| İletişim açabilir          | ❌  | ❌  | ❌  | ✅  |

---

## 4. Doğrulama Süreci

### 4.1 Bireysel Kullanıcı Akışı

```
Kayıt → E-posta Doğrulama → TC Kimlik Bilgisi Gir → Belgeler (opsiyonel)
  → status: PENDING_APPROVAL → Admin İnceler → ACTIVE / REJECTED / RESTRICTED
```

**Bireysel için zorunlu bilgiler:**
- TC kimlik numarası (şifreli saklanır)
- Doğum tarihi

**Opsiyonel belgeler:**
- Nüfus cüzdanı ön yüz (ID_CARD_FRONT)
- Nüfus cüzdanı arka yüz (ID_CARD_BACK)

### 4.2 Şirket / Müteahhit Akışı

```
Kayıt → E-posta Doğrulama → Şirket Bilgilerini Gir → Belge Yükle
  → status: PENDING_APPROVAL → Admin İnceler → ACTIVE / REJECTED / RESTRICTED
```

**Şirket için zorunlu bilgiler:**
- Şirket unvanı
- Vergi kimlik numarası
- Bağlı vergi dairesi
- Ticaret sicil numarası
- Yetkili kişi adı

**Zorunlu belgeler:**
- Vergi levhası (TAX_CERTIFICATE)
- Ticaret sicil gazetesi (TRADE_REGISTRY_GAZETTE)

**İsteğe bağlı belgeler:**
- İmza sirküleri (SIGNATURE_CIRCULAR)
- Faaliyet belgesi (ACTIVITY_CERTIFICATE)

### 4.3 Admin Onay Seçenekleri

| Karar            | Status Değişimi         | Bildirim Gönderilir      |
|------------------|------------------------|--------------------------|
| Onayla           | → ACTIVE               | "Hesabınız onaylandı"    |
| Kısıtlı Onayla   | → RESTRICTED           | "Kısıtlı erişim verildi" |
| Reddet           | → REJECTED             | Red nedeni ile birlikte  |
| Ek Belge İste    | Değişmez               | İstenen belgeler listesi |
| Askıya Al        | → SUSPENDED            | Askıya alma nedeni       |

---

## 5. Admin Yetki Kapsamı

### 5.1 Kullanıcı Üzerinde

- Onaylama, reddetme, kısıtlı onaylama
- Ek belge talep etme (bildirimli)
- Askıya alma ve aktifleştirme
- Rol değiştirme (`ADMIN` rolüne geçiş hariç)
- Herhangi bir kullanıcı veya doğrulama alanını manuel düzenleme
- Tüm işlem geçmişini görüntüleme

### 5.2 İlan Üzerinde

- Askıya alma, aktifleştirme, silme
- Herhangi bir ilan alanını manuel düzenleme
- İlan işlem geçmişini görüntüleme

### 5.3 Teklif Üzerinde

- Herhangi bir teklifi geri çekme
- Teklif alanlarını düzenleme
- Teklif işlem geçmişini görüntüleme

### 5.4 Ödeme Üzerinde

- İade başlatma (Iyzico üzerinden)
- Ödeme durumunu manuel güncelleme (webhook gecikmesi vb.)
- Ödeme geçmişini ve gelir raporunu görüntüleme

### 5.5 İletişim Erişimi Üzerinde

- Ödeme olmaksızın iletişim erişimi açma (teknik sorun telafisi)
- Açılmış erişimi iptal etme

---

## 6. İşlem Geçmişi (Audit Log) Sistemi

Her admin işlemi için otomatik olarak şu bilgiler kaydedilir:

| Alan         | Açıklama                                       |
|--------------|------------------------------------------------|
| `admin_id`   | İşlemi yapan admin'in UUID'si                  |
| `entity_type`| İşlem yapılan kayıt tipi (USER, LISTING vb.)   |
| `entity_id`  | İşlem yapılan kaydın UUID'si                   |
| `action`     | Yapılan işlemin kodu (USER_APPROVED vb.)       |
| `field_name` | Değiştirilen alan adı (field edit'lerde)       |
| `old_value`  | Eski değer                                     |
| `new_value`  | Yeni değer                                     |
| `note`       | Admin'in açıklaması / gerekçesi                |
| `ip_address` | Admin'in IP adresi                             |
| `created_at` | İşlem zamanı                                   |

**Kurallar:**
- `audit_logs` tablosuna yalnızca INSERT yapılır; UPDATE ve DELETE yoktur.
- Geçmiş kayıtlar hiçbir koşulda değiştirilemez veya silinemez.
- Toplu bildirim ve broadcast işlemleri loglanmaz (kişisel veri değil).

---

## 7. İş Kuralları

### 7.1 Kayıt ve Doğrulama

- E-postası doğrulanmamış hesap (`PENDING_EMAIL`) giriş yapabilir
  ama hiçbir içeriğe erişemez.
- `PENDING_APPROVAL` durumundaki kullanıcı doğrulama belgesi yükleyebilir,
  ancak ilan göremez, ilan açamaz, teklif veremez.
- `RESTRICTED` durumundaki kullanıcı ilan listesini ve detaylarını görebilir;
  ilan açamaz, teklif veremez, iletişim açamaz.
- Doğrulanmış (`ACTIVE`) olmayan kullanıcının teklifi veya ilanı işlem yapılamaz
  olarak işaretlenir.

### 7.2 İlan Kuralları

- Sadece `ACTIVE` durumundaki `LAND_OWNER` ilan açabilir.
- İlan 90 gün sonra otomatik olarak `PASSIVE` durumuna geçer.
- Silinen ilanlar soft delete ile işaretlenir; ödeme ve iletişim kayıtları korunur.

### 7.3 Teklif Kuralları

- Sadece `ACTIVE` durumundaki `CONTRACTOR` teklif verebilir.
- Bir müteahhit aynı ilana yalnızca 1 teklif verebilir.
- Teklif metni iletişim bilgisi içeremez (backend regex kontrolü).
- Müteahhit hesabı askıya alınırsa aktif teklifleri otomatik `WITHDRAWN` olmaz;
  admin manuel karar verir.

### 7.4 Ödeme Kuralları

- Ödeme yalnızca `ACTIVE` `LAND_OWNER` yapabilir.
- Aynı teklif için iki kez ödeme yapılamaz.
- Webhook HMAC imzası doğrulanmadan `contact_unlock` oluşturulmaz.
- İletişim açıldıktan sonra otomatik iade yoktur; admin manuel iade başlatabilir.

---

## 8. Kapsam Dışı (v1'de Yok)

| Özellik                          | Neden Dışarıda                                       |
|----------------------------------|------------------------------------------------------|
| NVI (TC kimlik) API doğrulaması  | Entegrasyon süreci uzun; v2'de                      |
| Gerçek zamanlı chat              | WebSocket altyapısı overkill                         |
| Google / Apple ile giriş         | Rol seçimi akışını karmaşıklaştırır                  |
| Harita entegrasyonu              | MVP değer önermesini etkilemiyor                     |
| React Native uygulama            | Web MVP stabil olduktan sonra                        |
| Puanlama / yorum sistemi         | Yeterli işlem hacmi gerektirir                       |
| Müteahhit portföy sayfası        | v2'de gelir modeline bağlanacak                      |
| Genel inşaat ilanları            | İkinci ilan tipi, ayrı akış gerektirir               |
| SMS bildirimi                    | E-posta yeterli                                      |
| Fatura / e-arşiv entegrasyonu    | Muhasebe altyapısı v2'de                             |
| Kredi paketi / abonelik          | Tekil açma modeli önce test edilecek                 |

---

## 9. Geliştirme Fazları

### Faz 1 — Altyapı & Auth (1.5 hafta)
- NestJS monorepo kurulumu
- PostgreSQL + TypeORM entity'ler ve migration altyapısı
- Auth modülü: register, login, refresh, logout, email verify, forgot/reset password
- Rol ve durum tabanlı Guard sistemi (`ACTIVE`, `RESTRICTED`, vs.)
- Dosya yükleme servisi (Cloudflare R2, presigned URL)
- E-posta servisi (Resend + React Email şablonları)
- Next.js App Router kurulumu, auth sayfaları, KVKK checkbox
- Rate limiting, Helmet, CORS

### Faz 2 — Doğrulama Sistemi (1.5 hafta)
- `individual_verifications` ve `company_verifications` entity'leri
- `verification_documents` entity'si ve belge yükleme endpoint'leri
- `audit_logs` entity'si ve AuditService
- TC numarası şifreleme servisi (AES-256-GCM)
- Kullanıcı doğrulama akışı UI (bireysel ve şirket formları)
- Doğrulama durumu sayfası (kullanıcı tarafı)

### Faz 3 — İlan Sistemi (1.5 hafta)
- Listing, ListingImage, ListingDocument entity'leri
- İlan CRUD API endpoint'leri
- Fotoğraf yükleme (client-side compress + R2 presigned upload)
- İlan listeleme (filtre, sıralama, sayfalama)
- İlan detay sayfası
- Arsa sahibi panosu

### Faz 4 — Teklif Sistemi (1 hafta)
- Offer entity ve CRUD API
- Teklif formu (regex içerik filtresi)
- Teklif listesi + karşılaştırma tablosu
- Kilitli iletişim alanı UI

### Faz 5 — Ödeme & Contact Unlock (1.5 hafta)
- Payment ve ContactUnlock entity'leri
- Iyzico entegrasyonu (sandbox → prod)
- Webhook + HMAC imza doğrulama
- Ödeme sonrası iletişim açma UI

### Faz 6 — Bildirimler (1 hafta)
- Notification entity ve servis
- E-posta şablonları (tüm bildirim tipleri)
- In-app bildirim listesi bileşeni
- Doğrulama durumu bildirim akışları

### Faz 7 — Admin Panel (2 hafta)
- Admin guard ve tüm admin endpoint'leri
- Kullanıcı yönetimi: liste, detay, onay/red/kısıtlı onay akışları
- Doğrulama başvuruları inceleme arayüzü
- Manuel düzenleme formları
- Audit log görüntüleme bileşeni
- İlan, teklif, ödeme, iletişim yönetim sayfaları
- Dashboard KPI kartları

### Faz 8 — Canlıya Alma (1 hafta)
- İlan 90 gün süresi + cron job (oto-pasif)
- Vercel, Railway, Neon deployment konfigürasyonu
- Environment değişkeni doğrulama (Zod + @nestjs/config)
- Smoke test ve UAT

**Toplam: ~11 hafta** (1 full-stack geliştirici)
