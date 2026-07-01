# UI_PAGES.md — Arayüz Sayfaları ve Bileşenleri

Sürüm: 1.1  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Sayfa Mimarisi

```
apps/web/app/
  (public)/                  ← Giriş gerektirmeyen sayfalar
    page.tsx                 ← Ana sayfa
    listings/
      page.tsx               ← İlan listesi
      [id]/
        page.tsx             ← İlan detay
    auth/
      login/page.tsx
      register/page.tsx
      verify-email/page.tsx
      forgot-password/page.tsx
      reset-password/page.tsx
    kvkk/page.tsx
    kullanim-kosullari/page.tsx

  (app)/                     ← Giriş zorunlu (AUTH guard)
    layout.tsx               ← Navbar + bildirim bell
    dashboard/page.tsx
    listings/
      new/page.tsx           ← İlan oluştur
      [id]/edit/page.tsx     ← İlan düzenle
    offers/
      page.tsx               ← Teklif listesi (müteahhit)
    profile/
      page.tsx               ← Profil görüntüle
      edit/page.tsx          ← Profil düzenle
    verification/
      page.tsx               ← Doğrulama durumu
      individual/page.tsx    ← Bireysel doğrulama formu
      company/page.tsx       ← Şirket doğrulama formu
    notifications/page.tsx
    chat/
      page.tsx               ← Konuşma listesi (v1.5)
      [conversationId]/
        page.tsx             ← Konuşma detayı (v1.5)
    settings/page.tsx

  (admin)/                   ← ADMIN rolü zorunlu
    layout.tsx               ← Admin sidebar
    dashboard/page.tsx
    users/
      page.tsx
      [id]/page.tsx
    verifications/
      page.tsx
      [id]/page.tsx
    listings/page.tsx
    payments/page.tsx
    audit-logs/page.tsx
```

---

## 2. Ortak Bileşenler

### 2.1 Navbar

```
┌──────────────────────────────────────────────────────────────────────┐
│  müteahitt          [İlanlar]  [Nasıl Çalışır]     [Giriş] [Kayıt]  │
└──────────────────────────────────────────────────────────────────────┘

Giriş yapılmışsa:
┌──────────────────────────────────────────────────────────────────────┐
│  müteahitt          [İlanlar]  [Dashboard]    🔔3  [A.Y ▼]          │
└──────────────────────────────────────────────────────────────────────┘

Dropdown menü:
  Profilim
  Ayarlar
  ─────────
  Çıkış Yap
```

- `🔔3` — okunmamış bildirim sayısı; tıklayınca `/notifications`
- v1.5'te chat ikonu eklenir: 💬2

### 2.2 Footer

```
┌──────────────────────────────────────────────────────────────────────┐
│  müteahitt                                                           │
│  Arsa sahipleri ve müteahhitleri buluşturan platform                │
│                                                                      │
│  [Hakkında]  [KVKK]  [Kullanım Koşulları]  [Destek]               │
│                                                                      │
│  © 2026 müteahitt.com — Tüm hakları saklıdır                       │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.3 Durum Rozeti (StatusBadge)

Tüm listelerde tutarlı renk kodlaması:

```
ACTIVE        → Yeşil     "Aktif"
PENDING       → Sarı      "Onay Bekliyor"
PENDING_EMAIL → Mavi      "E-posta Doğrulama"
RESTRICTED    → Turuncu   "Kısıtlı"
REJECTED      → Kırmızı   "Reddedildi"
SUSPENDED     → Gri       "Askıya Alındı"
WITHDRAWN     → Gri       "Geri Çekildi"
```

---

## 3. Genel / Herkese Açık Sayfalar

### 3.1 Ana Sayfa

```
┌──────────────────────────────────────────────────────────────────────┐
│  [HERO]                                                              │
│  Arsanız İçin Doğru Müteahhidi Bulun                                │
│  Türkiye'nin dijital inşaat pazaryeri                               │
│  [Şehir seçin ▼]  [İlanları Gör →]                                 │
├──────────────────────────────────────────────────────────────────────┤
│  Nasıl Çalışır?                                                     │
│  1. İlanınızı Oluşturun   2. Teklifleri Alın   3. İletişime Geçin  │
├──────────────────────────────────────────────────────────────────────┤
│  Öne Çıkan İlanlar                                                  │
│  [Kart] [Kart] [Kart]   [Tüm İlanları Gör →]                      │
├──────────────────────────────────────────────────────────────────────┤
│  Sayılar                                                            │
│  847 Aktif Kullanıcı  |  234 Aktif İlan  |  1.200+ Teklif          │
├──────────────────────────────────────────────────────────────────────┤
│  CTA — Siz de Başlayın                                              │
│  [Arsa Sahibiyim →]    [Müteahhidim →]                             │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 İlan Listesi

```
┌──────────────────────────────────────────────────────────────────────┐
│  İlanlar                                               147 sonuç    │
├────────────────────┬─────────────────────────────────────────────────┤
│  FİLTRELER         │  [Sırala: En Yeni ▼]  [Grid / Liste]          │
│  ──────────────    │  ┌──────────────┐ ┌──────────────┐            │
│  Şehir             │  │ [Fotoğraf]   │ │ [Fotoğraf]   │            │
│  [İstanbul    ▼]   │  │ Kadıköy Arsa │ │ Beşiktaş...  │            │
│                    │  │ İstanbul     │ │ İstanbul     │            │
│  İlçe              │  │ 750 m²       │ │ 500 m²       │            │
│  [Kadıköy     ▼]   │  │ Kat Karşılığı│ │ Nakit+Daire  │            │
│                    │  │ 3 teklif     │ │ 7 teklif     │            │
│  Anlaşma Türü      │  │ [İncele →]   │ │ [İncele →]   │            │
│  □ Kat Karşılığı   │  └──────────────┘ └──────────────┘            │
│  □ Nakit + Daire   │                                                │
│  □ Nakit           │  ← Sayfalama →                                │
│  □ Müzakereye Açık │                                                │
│                    │                                                │
│  Alan (m²)         │                                                │
│  [Min] — [Max]     │                                                │
│                    │                                                │
│  [Filtreleri Uygula]│                                               │
│  [Sıfırla]         │                                               │
└────────────────────┴─────────────────────────────────────────────────┘
```

### 3.3 İlan Detay

```
┌──────────────────────────────────────────────────────────────────────┐
│  [← Geri]                                                           │
│                                                                      │
│  [Fotoğraf Galerisi — ana fotoğraf + thumbnail strip]               │
│                                                                      │
│  Kadıköy Köşe Parsel — 750 m²                                       │
│  İstanbul, Kadıköy  |  Oluşturulma: 15 Haziran 2026                │
│                                                                      │
│  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │
│  │ Arsa Bilgileri          │  │ İlan Sahibi                      │  │
│  │ Alan: 750 m²            │  │ [Avatar] A. Yılmaz               │  │
│  │ Kat Hakkı: 5            │  │ Üye: Haziran 2026               │  │
│  │ İmar: Konut             │  │ ✓ Doğrulanmış                   │  │
│  │ Anlaşma: Kat Karşılığı  │  └──────────────────────────────────┘  │
│  │ Cephe: Kuzey + Doğu     │                                       │
│  └─────────────────────────┘                                        │
│                                                                      │
│  Açıklama                                                           │
│  [İlan metni...]                                                    │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  [GİRİŞ YAPMIŞ MÜTEAHHİT GÖRÜNÜMÜ]                                 │
│  Teklifler (3)                              [Teklif Ver +]          │
│  ─────────────────────────────────────────                          │
│  Bu ilanın teklifleri gizlidir.                                     │
│  Teklif verdikten sonra diğer teklifleri göremezsiniz.              │
│                                                                      │
│  [GİRİŞ YAPMIŞ ARSA SAHİBİ GÖRÜNÜMÜ]                               │
│  Teklifler (3)                                                      │
│  ─────────────────────────────────────────                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ABC İnşaat Ltd.  ✓ Doğrulanmış    2 gün önce                 │   │
│  │ "Projeniz için deneyimli ekibimizle..."                      │   │
│  │                              [İletişim Bilgisi Aç — ₺399]   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  [GİRİŞ YAPMAMIŞ ZIYARETÇI]                                        │
│  Teklifleri görmek için giriş yapın veya kayıt olun.               │
│  [Giriş Yap]  [Kayıt Ol]                                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. Auth Sayfaları

### 4.1 Kayıt

```
┌──────────────────────────────────────────┐
│  Hesap Oluştur                           │
│                                          │
│  Ad Soyad *                              │
│  [                                    ]  │
│                                          │
│  E-posta *                               │
│  [                                    ]  │
│                                          │
│  Telefon                                 │
│  [+90                                 ]  │
│                                          │
│  Şifre *  (min 8 karakter)               │
│  [                                  👁]  │
│                                          │
│  Hesap Türü *                            │
│  ○ Arsa Sahibi   ○ Müteahhit            │
│                                          │
│  ☑ KVKK Aydınlatma Metnini okudum       │
│  ☑ Kullanım Koşullarını kabul ediyorum  │
│                                          │
│  [Kayıt Ol]                             │
│                                          │
│  Zaten hesabınız var mı? [Giriş Yap]   │
└──────────────────────────────────────────┘
```

### 4.2 E-posta Doğrulama

```
┌──────────────────────────────────────────┐
│  E-postanızı Doğrulayın                  │
│                                          │
│  test@example.com adresine bir           │
│  doğrulama bağlantısı gönderdik.        │
│                                          │
│  Bağlantı 24 saat geçerlidir.           │
│                                          │
│  [Yeniden Gönder]                       │
│                                          │
│  E-posta gelmediyse spam klasörünü       │
│  kontrol edin.                          │
└──────────────────────────────────────────┘
```

### 4.3 Giriş

```
┌──────────────────────────────────────────┐
│  Giriş Yap                               │
│                                          │
│  E-posta *                               │
│  [                                    ]  │
│                                          │
│  Şifre *                                 │
│  [                                  👁]  │
│                                          │
│  [Şifremi Unuttum]                      │
│                                          │
│  [Giriş Yap]                            │
│                                          │
│  Hesabınız yok mu? [Kayıt Ol]          │
└──────────────────────────────────────────┘
```

---

## 5. Doğrulama Sayfaları

### 5.1 Doğrulama Durumu

Kullanıcı giriş yaptığında hesabı `PENDING_APPROVAL` ise bu sayfaya yönlendirilir.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Hesap Doğrulama                                                     │
│                                                                      │
│  Platformu kullanabilmek için kimliğinizi doğrulamanız gerekmektedir.│
│                                                                      │
│  Durum: ● Belge Bekleniyor                                          │
│                                                                      │
│  ┌────────────────────────────────────────┐                         │
│  │ ✓ E-posta doğrulandı                   │                         │
│  │ ○ Kimlik doğrulaması tamamlanmadı      │                         │
│  └────────────────────────────────────────┘                         │
│                                                                      │
│  [Doğrulama Başvurusu Yap →]                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Durum mesajları:**

| Durum | Gösterim |
|---|---|
| `PENDING_APPROVAL` + belge yok | "Başvuru yapılmadı — Başvuru Yap" |
| `PENDING_APPROVAL` + belge var | "Başvurunuz inceleniyor (24 saat içinde)" |
| `REQUIRES_MORE_INFO` | "Ek belge istendi — [Admin Notu görünür]" |
| `REJECTED` | "Başvuru reddedildi — [Sebep] — Yeniden Başvur" |
| `ACTIVE` | "✓ Doğrulandı" (bu sayfa gösterilmez) |
| `RESTRICTED` | "Hesabınız kısıtlandı — Destek ile iletişime geçin" |

### 5.2 Bireysel Doğrulama Formu

```
┌──────────────────────────────────────────────────────────────────────┐
│  Bireysel Kimlik Doğrulama                                           │
│                                                                      │
│  TC Kimlik Numarası *                                                │
│  [           ]   ← 11 haneli, gerçek zamanlı checksum doğrulama    │
│                                                                      │
│  Doğum Tarihi *                                                      │
│  [GG / AA / YYYY]                                                   │
│                                                                      │
│  Kimlik Belgesi *                                                    │
│  Nüfus cüzdanı veya pasaport yükleyin                               │
│  ┌────────────────────────────────────┐                             │
│  │   [📎 Kimlik Ön Yüz]              │  ✓ Yüklendi                 │
│  │   [📎 Kimlik Arka Yüz]            │  ✗ Bekleniyor               │
│  └────────────────────────────────────┘                             │
│  Desteklenen: JPG, PNG, PDF | Maks: 10MB                           │
│                                                                      │
│  ☑ TC kimlik numaram KVKK kapsamında işlenecektir.                 │
│    Aydınlatma metni için tıklayın.                                  │
│                                                                      │
│  [Başvuruyu Gönder]   [İptal]                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Şirket Doğrulama Formu

```
┌──────────────────────────────────────────────────────────────────────┐
│  Şirket Doğrulama                                                    │
│                                                                      │
│  ── Şirket Bilgileri ──────────────────────────────────────────     │
│                                                                      │
│  Vergi Kimlik Numarası *                                             │
│  [          ]   ← 10 haneli, algoritma doğrulaması                 │
│                                                                      │
│  Şirket Unvanı *                                                     │
│  [                                                                ]  │
│                                                                      │
│  Ticaret Sicil Numarası *                                            │
│  [                                                                ]  │
│                                                                      │
│  ── Yetkili Kişi Bilgileri ────────────────────────────────────     │
│                                                                      │
│  Ad Soyad *                                                          │
│  [                                                                ]  │
│                                                                      │
│  TC Kimlik Numarası *                                                │
│  [           ]                                                       │
│                                                                      │
│  Görevi *                                                            │
│  [                                                                ]  │
│                                                                      │
│  ── Belgeler ──────────────────────────────────────────────────     │
│                                                                      │
│  Zorunlu belgeler:                                                   │
│  [📎 Vergi Levhası]         ✗ Bekleniyor                           │
│  [📎 Ticaret Sicil Belgesi] ✗ Bekleniyor                           │
│  [📎 İmza Sirküleri]        ✗ Bekleniyor                           │
│  [📎 Faaliyet Belgesi]      ✗ Bekleniyor                           │
│                                                                      │
│  Desteklenen: JPG, PNG, PDF | Maks: 10MB/belge                     │
│                                                                      │
│  [Başvuruyu Gönder]   [İptal]                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.4 Ek Belge İstendi

Admin ek belge istediğinde kullanıcı bu banner'ı görür:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚠  Ek Belge Gerekmektedir                                          │
│                                                                      │
│  Admin notu: "Faaliyet belgesi güncel değil, 2026 tarihli           │
│  belge yükleyin."                                                   │
│                                                                      │
│  [📎 Belge Ekle]                                                    │
│  [Güncellemeyi Gönder]                                              │
│                                                                      │
│  Kalan günlük başvuru hakkı: 2/3                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Dashboard

### 6.1 Arsa Sahibi Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│  Hoş geldiniz, Ahmet Bey                                            │
│                                                                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                    │
│  │ Aktif İlan │  │ Toplam     │  │ Bu Ay      │                    │
│  │     3      │  │ Teklif: 12 │  │ Kilit: 4   │                    │
│  └────────────┘  └────────────┘  └────────────┘                    │
│                                                                      │
│  İlanlarım                            [+ Yeni İlan]                 │
│  ─────────────────────────────────────────────────                  │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Kadıköy Arsa        Aktif   12 teklif   Bitiş: 14 Ağu        │ │
│  │                     [Teklifleri Gör] [Düzenle] [Kapat]        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Şişli Parsel        Aktif    3 teklif   Bitiş: 20 Ağu  ⚠ 3g  │ │
│  │                     [Teklifleri Gör] [Düzenle] [Kapat]        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Son Bildirimler                                                    │
│  • Kadıköy Arsa ilanınıza yeni teklif   2 saat önce               │
│  • Şişli Parsel ilanınız 3 gün içinde dolacak   5 saat önce       │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Müteahhit Dashboard

```
┌──────────────────────────────────────────────────────────────────────┐
│  Hoş geldiniz, ABC İnşaat                                           │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │ Aktif Teklifim │  │ İletişim       │  │ Toplam         │        │
│  │      7         │  │ Görüntülendi:3 │  │ Teklif: 24     │        │
│  └────────────────┘  └────────────────┘  └────────────────┘        │
│                                                                      │
│  Önerilen İlanlar — Size Uygun                                      │
│  ─────────────────────────────────────────────────────────          │
│  [İlan Kartı]  [İlan Kartı]  [İlan Kartı]                          │
│                                                                      │
│  Tekliflerim                                                        │
│  ─────────────────────────────────────────────────────────          │
│  Kadıköy Arsa     Beklemede    [Detay]                             │
│  Beşiktaş Parsel  Beklemede    [Detay]                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 7. İlan Oluştur / Düzenle

```
┌──────────────────────────────────────────────────────────────────────┐
│  Yeni İlan Oluştur                                                   │
│                                                                      │
│  ── Temel Bilgiler ─────────────────────────────────────────────    │
│                                                                      │
│  İlan Başlığı *                                                      │
│  [                                                                ]  │
│  Örn: Kadıköy Merkezi Köşe Arsa — 750 m²                           │
│                                                                      │
│  Şehir *          İlçe *                                            │
│  [İstanbul  ▼]    [Kadıköy  ▼]                                     │
│                                                                      │
│  Alan (m²) *      Talep Edilen Kat Sayısı                           │
│  [       ]        [      ]                                          │
│                                                                      │
│  İmar Durumu      Anlaşma Türü *                                     │
│  [Konut     ▼]    [Kat Karşılığı  ▼]                               │
│                                                                      │
│  ── Açıklama ───────────────────────────────────────────────────    │
│                                                                      │
│  İlan Açıklaması *                                                   │
│  [                                                                ]  │
│  [                                                                ]  │
│  [                                                                ]  │
│  ⚠ Telefon, e-posta veya sosyal medya bilgisi ekleyemezsiniz.      │
│                                                                      │
│  [✨ AI ile Geliştir]   ← v2 özelliği                              │
│                                                                      │
│  ── Fotoğraflar ────────────────────────────────────────────────    │
│                                                                      │
│  [+ Fotoğraf Ekle]   (Maks 10, min 1 yayın için)                  │
│  [🖼] [🖼] [🖼]   ← Sürükle-bırak sıralama                       │
│                                                                      │
│  ── Yayın Süresi ───────────────────────────────────────────────    │
│                                                                      │
│  ○ 30 gün   ○ 60 gün   ● 90 gün                                    │
│                                                                      │
│  [Taslak Kaydet]     [Yayınla]                                     │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Ödeme Sayfası — İletişim Bilgisi Kilidi Açma

```
┌──────────────────────────────────────────────────────────────────────┐
│  İletişim Bilgisini Aç                                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Teklif Sahibi: ABC İnşaat Ltd.  ✓ Doğrulanmış Şirket         │ │
│  │ İlan: Kadıköy Merkezi Arsa                                    │ │
│  │ Teklif Özeti: "Projeniz için deneyimli ekibimizle..."         │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Bu ödemeyle şunlara erişeceksiniz:                                 │
│  ✓ Telefon numarası                                                  │
│  ✓ E-posta adresi                                                    │
│  ✓ Şirket adresi (varsa)                                            │
│                                                                      │
│  ─────────────────────────────────────────────────                  │
│  Toplam: ₺399                                                        │
│  ─────────────────────────────────────────────────                  │
│                                                                      │
│  [Güvenli Ödemeye Geç — ₺399]                                      │
│                                                                      │
│  🔒 Iyzico güvencesiyle ödeme                                       │
│  Ödeme bilgileriniz tarafımızda saklanmaz.                          │
└──────────────────────────────────────────────────────────────────────┘
```

**Ödeme sonrası iletişim bilgisi görünümü:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✓ İletişim Bilgisi Açıldı                                          │
│                                                                      │
│  ABC İnşaat Ltd.                                                    │
│  ─────────────────────────                                          │
│  📞 +90 532 123 45 67         [Kopyala]                            │
│  ✉  info@abcinsaat.com       [Kopyala]                             │
│  📍 Kadıköy, İstanbul                                               │
│                                                                      │
│  [Mesaj Gönder →]   ← v1.5: chat açılır                           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 9. Chat Sayfaları (v1.5)

### 9.1 Konuşma Listesi

```
┌──────────────────────────────────────────────────────────────────────┐
│  Mesajlar                                                            │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ [Avatar] ABC İnşaat              10:30   ● 2 okunmamış        │ │
│  │          Kadıköy Arsa — "Evet, proje..."                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ [Avatar] XYZ Yapı               Dün                            │ │
│  │          Beşiktaş Parsel — "Merhaba, teklifimiz..."           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  Konuşma açmak için önce iletişim bilgisi satın alınmalıdır.       │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 Konuşma Detayı

```
┌──────────────────────────────────────────────────────────────────────┐
│  [← Geri]  ABC İnşaat Ltd.  ✓  |  Kadıköy Arsa                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                          1 Temmuz 2026                              │
│                                                                      │
│  ┌─────────────────────────────────────────────────┐               │
│  │ Merhaba, projeniz için görüşmek isteriz.        │               │
│  │                                      10:15 ✓✓  │               │
│  └─────────────────────────────────────────────────┘               │
│                                                                      │
│       ┌───────────────────────────────────────────┐                │
│       │ Merhaba, ne zaman uygun olursunuz?        │                │
│       │ 10:30 ✓✓                                  │                │
│       └───────────────────────────────────────────┘                │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  [Mesajınızı yazın...                        ] [Gönder →]          │
└──────────────────────────────────────────────────────────────────────┘
```

- Sağ balonlar: gönderen (aktif kullanıcı)
- Sol balonlar: karşı taraf
- `✓✓` — okundu işareti
- Tarih ayraçları otomatik

---

## 10. Bildirimler Sayfası

```
┌──────────────────────────────────────────────────────────────────────┐
│  Bildirimler          [Tümünü Okundu İşaretle]                      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ● [🏠] Yeni Teklif Aldınız                        2 saat önce │ │
│  │   "Kadıköy Arsa" ilanınıza yeni bir teklif geldi.             │ │
│  │   [İlanı Gör →]                                               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ ● [✓] Hesabınız Onaylandı                         5 saat önce │ │
│  │   Hesabınız doğrulandı. Artık tüm özelliklere erişebilirsiniz.│ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │   [⏰] İlanınız 3 Gün İçinde Dolacak               1 gün önce │ │
│  │   "Şişli Parsel" ilanınızın süresi 3 gün içinde dolacak.      │ │
│  │   [İlanı Uzat →]                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 11. Profil ve Ayarlar

### 11.1 Profil Sayfası

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Avatar]  Ahmet Yılmaz                                             │
│            Arsa Sahibi  |  ✓ Doğrulanmış  |  Üye: Haziran 2026    │
│                                            [Profili Düzenle]       │
│                                                                      │
│  ─────────────────────────────────────────────────────────          │
│  İlanlarım (3 aktif)                                                │
│  [İlan Kartı]  [İlan Kartı]  [İlan Kartı]                          │
└──────────────────────────────────────────────────────────────────────┘
```

### 11.2 Ayarlar

```
┌──────────────────────────────────────────────────────────────────────┐
│  Ayarlar                                                             │
│                                                                      │
│  [Hesap Bilgileri]  [Güvenlik]  [Bildirimler]  [Gizlilik]          │
│                                                                      │
│  ── Hesap Bilgileri ────────────────────────────────────────────    │
│  Ad Soyad:   Ahmet Yılmaz           [Düzenle]                      │
│  E-posta:    a@example.com          [Düzenle]                      │
│  Telefon:    +90 532 ...            [Düzenle]                      │
│                                                                      │
│  ── Güvenlik ───────────────────────────────────────────────────    │
│  Şifre:      ••••••••               [Değiştir]                     │
│                                                                      │
│  ── Gizlilik ───────────────────────────────────────────────────    │
│  [Verilerimi İndir]                                                 │
│  [Hesabımı Sil]                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 12. Hata Sayfaları

```
404:
  "Sayfa Bulunamadı"
  Bu sayfa mevcut değil veya kaldırılmış olabilir.
  [Ana Sayfaya Dön]

403:
  "Erişim Reddedildi"
  Bu sayfayı görüntüleme yetkiniz yok.
  [Geri Dön]

Hesap Beklemede (PENDING):
  "Hesabınız İnceleniyor"
  Başvurunuz 24 saat içinde değerlendirilecektir.
  [Bildirimleri Aç]

Hesap Kısıtlı (RESTRICTED):
  "Hesabınız Kısıtlandı"
  Detaylı bilgi için: destek@muteahitt.com
```

---

## 13. Responsive Davranış

| Sayfa                  | Mobil Öncelik | Masaüstü Farkı                    |
|------------------------|---------------|-----------------------------------|
| İlan listesi           | Tek sütun     | 2-3 sütun grid                    |
| İlan detay             | Stack layout  | İki sütun (bilgi + sahip kartı)   |
| İlan oluştur           | Tek sütun     | İki sütunlu form                  |
| Dashboard              | Kart stack    | Yan yana kartlar                  |
| Chat                   | Full screen   | Split panel (liste + detay)       |
| Doğrulama formu        | Tek sütun     | Ortalanmış, max-width: 640px      |
| Admin panel            | Gizli (tablet+) | Sidebar + içerik                |
