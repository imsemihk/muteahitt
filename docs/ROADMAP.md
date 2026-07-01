# ROADMAP.md — Ürün ve Teknik Yol Haritası

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Vizyon

**müteahitt.com:** Türkiye'de arsa sahipleri ile müteahhitleri buluşturan,
güven odaklı, dijital inşaat pazaryeri.

**3 yıllık hedef:** Türkiye'nin en büyük arsa-müteahhit eşleştirme platformu.
İlk yıl: ürün-pazar uyumu. İkinci yıl: büyüme. Üçüncü yıl: pazar liderliği.

---

## 2. Faz Özeti

```
Faz 1  — Altyapı Kurulumu          (Hafta 1-2)
Faz 2  — Temel Özellikler          (Hafta 3-5)
Faz 3  — Doğrulama ve Güvenlik     (Hafta 6-7)
Faz 4  — Ödeme ve MVP Lansmanı     (Hafta 8-10)
─────────────────────────────────────────────────── MVP
Faz 5  — Stabilizasyon ve v1.5     (Ay 4-5)
Faz 6  — Büyüme Özellikleri (v2)   (Ay 6-9)
Faz 7  — Ölçekleme (v3)            (Ay 10-18)
```

---

## 3. MVP — Fazlar 1-4 (~10 Hafta)

### Faz 1 — Altyapı Kurulumu (Hafta 1-2)

**Hedef:** Geliştirici çalışabilir, CI/CD çalışıyor, DB şeması hazır.

```
□ Monorepo kurulumu (pnpm workspaces)
    apps/web, apps/api, packages/shared
□ Docker Compose yerel ortam (PostgreSQL, Redis, MinIO)
□ NestJS temel yapı (modules, guards, interceptors, filters)
□ Next.js 14 App Router temel yapı
□ PostgreSQL migration altyapısı (TypeORM)
□ Tüm tabloların ilk migration'ı (14 tablo)
□ GitHub Actions CI pipeline (type-check, lint, unit test)
□ Railway + Vercel deployment pipeline
□ Neon + Upstash + R2 servis bağlantıları
□ Sentry entegrasyonu (API + Web)
□ packages/shared — Zod şemaları taslağı

Çıktı: Boş ama deploy edilebilir uygulama, sağlıklı CI/CD
```

### Faz 2 — Temel Özellikler (Hafta 3-5)

**Hedef:** Kullanıcı kaydı, ilan oluşturma, teklif verme çalışıyor.

```
□ Auth modülü
    Kayıt, e-posta doğrulama, login, logout
    JWT access + refresh token, token rotation
□ Kullanıcı profil sayfası
□ İlan CRUD (oluştur, düzenle, yayınla, sil)
□ Fotoğraf yükleme (R2 presigned URL akışı)
□ Magic bytes doğrulaması
□ İlan listesi + arama + filtreleme
□ PostgreSQL full-text search + GIN index
□ Teklif verme (content-filter dahil)
□ Teklif listeleme (arsa sahibi ve müteahhit görünümü)
□ In-app bildirim sistemi (temel)
□ E-posta bildirimleri (Resend + React Email şablonları)
□ Rate limiting (ThrottlerGuard)

Çıktı: Temel akış çalışıyor, ödeme hariç
```

### Faz 3 — Doğrulama ve Güvenlik (Hafta 6-7)

**Hedef:** Kullanıcı doğrulama sistemi ve admin paneli çalışıyor.

```
□ Doğrulama sistemi
    Bireysel: TC kimlik (AES-256-GCM şifreleme)
    Şirket: Vergi no + ticaret sicil + belgeler
    Belge yükleme (private R2 bucket)
□ Admin paneli
    Kullanıcı listesi, doğrulama kuyruğu
    Onayla / Reddet / Kısıtla / Ek belge iste
    Audit log ekranı
□ Audit log sistemi (append-only)
□ IDOR koruması (ownership filter pattern)
□ Helmet CSP + CORS konfigürasyonu
□ Webhook HMAC guard
□ KVKK: Aydınlatma metni, KVKK talebi endpoint'i
□ Admin seed script'i

Çıktı: Güvenli, doğrulanmış kullanıcı akışı
```

### Faz 4 — Ödeme ve MVP Lansmanı (Hafta 8-10)

**Hedef:** Ödeme çalışıyor, platform yayında.

```
□ Iyzico entegrasyonu
    Ödeme başlatma, callback, webhook
    İdempotency koruması
    Çift ödeme koruması
□ İletişim bilgisi kilit/açma sistemi
□ Admin: manuel kilit aç/kapat, iade
□ Pending ödeme timeout (Bull Queue)
□ E-posta şablonları tamamlama
□ Cron job'lar (ilan süresi, tutarlılık kontrolü)
□ Güvenlik son kontrol (deployment checklist)
□ Staging'de tam akış testi
□ Yük testi (k6) — temel senaryolar
□ DNS + SSL konfigürasyonu
□ VERBİS başvurusu
□ Soft launch (davetli kullanıcılar)
□ 20-30 başlangıç ilanı (kurucudan veya erken kullanıcılar)

Çıktı: Canlı, çalışan, para kazanan platform
```

---

## 4. v1.5 — Stabilizasyon ve İlk Büyüme (Ay 4-5)

MVP lansmanından sonra ilk 1-2 ay kullanıcı geri bildirimleri toplanır.
v1.5 kritik iyileştirmeleri ve erken talep gören özellikleri kapsar.

```
Stabilizasyon:
  □ MVP'de tespit edilen hataların giderilmesi
  □ Performans optimizasyonu (yavaş sorgu analizi)
  □ Kullanıcı geri bildirimlerine göre UX düzeltmeleri
  □ A/B test: ₺399 fiyat noktası doğrulama

Yeni özellikler:
  □ Chat sistemi (yalnızca contact_unlock sonrası)
      WebSocket + Redis Pub/Sub
      Mesaj geçmişi
      Okunmamış bildirim
  □ İlan yenileme / uzatma
  □ Teklif durumu zaman çizelgesi (arsa sahibi görünümü)
  □ AI içerik moderasyonu (asenkron, Bull Queue)
  □ Admin: CSV dışa aktarma, toplu işlem
  □ Gelir raporu iyileştirmeleri
  □ Şehir bazlı istatistikler (ilan yoğunluğu haritası)

Teknik:
  □ Integration test coverage artırımı
  □ E2E test suite genişletme (Playwright)
  □ Railway Pro plan değerlendirmesi (trafik büyüdüyse)
```

---

## 5. v2 — Büyüme Özellikleri (Ay 6-9)

```
Ürün:
  □ Expo React Native mobil uygulama
      iOS App Store + Google Play (Apple hukuki inceleme sonrası)
      expo-secure-store auth, Expo Notifications
  □ İlan yazma AI asistanı (Claude Sonnet)
  □ Teklif yazma AI asistanı
  □ Akıllı ilan önerileri (müteahhitlere)
  □ Kullanıcı değerlendirme sistemi
      Arsa sahibi → müteahhidi değerlendirir (iş bittikten sonra)
      Doğrulanmış değerlendirmeler (contact_unlock şartı)
  □ İlan öne çıkarma (ücretli — v2 gelir modeli)
  □ Bildirim tercihleri (KVKK pazarlama rızası ile)

Teknik:
  □ Meilisearch entegrasyonu (Türkçe morfoloji)
  □ pgvector kurulumu (v3 semantik arama hazırlığı)
  □ packages/ui/native — React Native bileşen kütüphanesi
  □ API v2 namespace hazırlığı (/v2/)
  □ Logtail log aggregation (hacim büyüdüyse)
  □ NVI KPS API başvurusu (2-4 ay süreç — şimdiden başla)

Büyüme:
  □ SEO optimizasyonu (şehir + ilçe ilan sayfaları)
  □ Google Ads pilot (Kadıköy arsa, Şişli müteahhit vb.)
  □ Sektör dernekleri ile ortaklık görüşmeleri
```

---

## 6. v3 — Ölçekleme (Ay 10-18)

```
Ürün:
  □ Kredi paketi sistemi (10 kilit = ₺3.500 vb.)
  □ Müteahhit abonelik planı (aylık sınırsız kilit)
  □ MERSİS entegrasyonu (şirket doğrulama otomasyonu)
  □ NVI KPS entegrasyonu (TC kimlik anlık doğrulama)
  □ Proje takip modülü (sözleşme → tamamlanma)
  □ Referans proje portföyü (müteahhit profili zenginleştirme)
  □ İlçe bazlı müteahhit yoğunluk haritası

Teknik:
  □ pgvector semantik arama (embedding tabanlı eşleştirme)
  □ Meilisearch → fine-tuned Türkçe arama
  □ Read replica (PostgreSQL okuma yükü ayrıştırma)
  □ Redis Cluster (yatay ölçekleme)
  □ CDN genişletme (Cloudflare Image Resizing Pro)
  □ API rate limit kişiselleştirme (plan bazlı)

Mimari değerlendirme (Ay 12):
  □ Monolith → servis ayrıştırma kararı
      Ayrıştırma kriteri: Tek modül > %30 CPU veya ekip > 8 kişi
      Adaylar: payments-service, notifications-service
```

---

## 7. Gelir Modeli Evrimi

| Versiyon | Model                              | Hedef Aylık Gelir |
|----------|------------------------------------|-------------------|
| MVP      | Kilit başına ₺399                  | ₺5.000–₺20.000    |
| v1.5     | ₺399 + öne çıkarma ücreti          | ₺20.000–₺60.000   |
| v2       | ₺399 + kredi paketleri + abonelik  | ₺60.000–₺200.000  |
| v3       | Çoklu gelir akışı + kurumsal       | ₺200.000+         |

**Fiyat esnekliği:** `CONTACT_UNLOCK_PRICE` environment variable'dan okunur.
A/B test veya pazar koşullarına göre kod değişikliği olmadan güncellenebilir.

---

## 8. Risk ve Azaltma Stratejileri

| Risk                              | Olasılık | Etki  | Azaltma                                        |
|-----------------------------------|----------|-------|------------------------------------------------|
| Tavuk-yumurta problemi            | Yüksek   | Yüksek| 20-30 başlangıç ilanı; ilk 3 ay ücretsiz kilit|
| Ödeme bypass (iletişim kaçakçılığı)| Orta    | Yüksek| Regex + AI filtre; chat yokken daha az kaçış  |
| Iyzico onay gecikmesi             | Orta     | Yüksek| Faz 1'de başvur, 3-10 iş günü beklentisi      |
| Apple %30 komisyon sorunu         | Orta     | Orta  | v2 öncesi hukuki danışmanlık                   |
| NVI API bekleme süresi            | Yüksek   | Düşük | MVP manuel doğrulama; v2'de API (şimdiden başvur)|
| Rakip kopya                       | Orta     | Orta  | Network efekti + güven markası öne çıkar       |
| Veri ihlali                       | Düşük    | Yüksek| AES-256-GCM, audit log, 72s KVKK bildirimi    |

---

## 9. Başarı Metrikleri

### 9.1 MVP (İlk 3 Ay)

```
Kullanıcı:
  □ 100 aktif arsa sahibi
  □ 200 aktif müteahhit
  □ 50 aktif ilan

Gelir:
  □ Aylık 20+ ödeme (₺7.980+/ay)
  □ Dönüşüm: İlan başına ortalama 1+ kilit açma

Kalite:
  □ Doğrulama ortalama süresi < 24 saat
  □ API p95 yanıt süresi < 500ms
  □ Uptime > %99.5
```

### 9.2 v1.5 (Ay 6)

```
  □ 500 aktif arsa sahibi
  □ 1.000 aktif müteahhit
  □ Aylık 100+ ödeme (₺39.900+/ay)
  □ Chat mesaj hacmi: 500+/gün (eşleşme kalitesi göstergesi)
  □ NPS skoru > 40
```

### 9.3 v2 (Ay 12)

```
  □ 2.000+ aktif kullanıcı
  □ App Store + Google Play yayında
  □ Mobil trafik > %50
  □ Aylık ₺100.000+ gelir
  □ Organik büyüme > %20/ay (ücretli kanal olmadan)
```

---

## 10. Teknik Borç Politikası

Her sprint'in %20'si teknik borç ödemesine ayrılır.

```
Kabul edilebilir teknik borç (MVP'de kasıtlı):
  ✓ PostgreSQL FTS yerine Meilisearch (v2'de çözülür)
  ✓ Manuel doğrulama yerine NVI API (v3'te çözülür)
  ✓ Kural tabanlı moderasyon yerine AI (v1.5'te çözülür)
  ✓ Web Push yerine native push (v2'de çözülür)

Kabul edilemez teknik borç:
  ✗ Güvenlik açıkları (IDOR, injection) — anlık çözüm
  ✗ Şifreleme eksikliği (TC kimlik vb.) — hiç ertelenmez
  ✗ KVKK ihlalleri — hiç ertelenmez
  ✗ Veri kaybı riski taşıyan migration'lar — hiç ertelenmez
```

---

## 11. Dokümantasyon Durumu

Bu ROADMAP.md ile tüm teknik dokümantasyon tamamlanmıştır.

| Dosya                    | Sürüm | Durum    |
|--------------------------|-------|----------|
| README.md                | 1.0   | ✅       |
| PROJECT_SCOPE.md         | 1.1   | ✅       |
| DATABASE_SCHEMA.md       | 1.1   | ✅       |
| API_ROUTES.md            | 1.1   | ✅       |
| UI_PAGES.md              | 1.0   | ✅ *     |
| ARCHITECTURE.md          | 1.0   | ✅       |
| SECURITY.md              | 1.0   | ✅       |
| KVKK_AND_LEGAL.md        | 1.0   | ✅       |
| VERIFICATION_SYSTEM.md   | 1.0   | ✅       |
| PAYMENT_SYSTEM.md        | 1.0   | ✅       |
| FILE_STORAGE.md          | 1.0   | ✅       |
| ERROR_HANDLING.md        | 1.0   | ✅       |
| NOTIFICATION_SYSTEM.md   | 1.0   | ✅       |
| ADMIN_PANEL.md           | 1.0   | ✅       |
| SEARCH_AND_FILTERING.md  | 1.0   | ✅       |
| INFRASTRUCTURE.md        | 1.0   | ✅       |
| CHAT_SYSTEM.md           | 1.0   | ✅       |
| AI_FEATURES.md           | 1.0   | ✅       |
| MOBILE_APP.md            | 1.1   | ✅       |
| TESTING_STRATEGY.md      | 1.0   | ✅       |
| MONITORING_AND_LOGGING.md| 1.0   | ✅       |
| ROADMAP.md               | 1.0   | ✅       |

`*` UI_PAGES.md chat ve doğrulama sayfaları ile güncellenmesi önerilir (v1.5 öncesi).

**Toplam:** 22 teknik doküman — geliştirici işe başlamaya hazır.
