# KVKK_AND_LEGAL.md — Kişisel Verilerin Korunması ve Yasal Uyum

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı — Hukuki danışman incelemesi önerilir

> ⚠️ Bu belge teknik gereksinimleri tanımlar. Nihai hukuki metin
> için lisanslı bir avukat onayı zorunludur.

---

## 1. Neden Bu Belge Kritik

müteahitt.com, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK)
kapsamında **Veri Sorumlusu** sıfatını taşır. Aşağıdaki durumlar bu
yükümlülüğü doğurur:

| Durum                               | Yasal Dayanak          |
|-------------------------------------|------------------------|
| TC kimlik numarası işleniyor        | KVKK Md. 6 (özel değil, ancak hassas) |
| Vergi kimliği işleniyor             | KVKK Md. 5              |
| Telefon numarası işleniyor          | KVKK Md. 5              |
| Ödeme verisi işleniyor              | KVKK Md. 5 + 6698       |
| Profil fotoğrafı işleniyor          | KVKK Md. 6 (biyometrik olabilir) |
| Konum / taşınmaz bilgisi            | KVKK Md. 5              |

**Yaptırım:** KVKK ihlali halinde Kişisel Verileri Koruma Kurulu (KVKK Kurulu)
tarafından 2024 tarifesiyle 46.000 TL – 9.200.000 TL arası idari para cezası.

---

## 2. Veri Sorumlusu Yükümlülükleri

### Yapılması Zorunlu Olanlar (Koda Geçmeden Önce)

```
[ ] Veri Sorumlusu tescili — VERBİS (Veri Sorumluları Sicili)'ne kayıt
    Kural: Yıllık 50+ çalışan VEYA yıllık 1M TL+ ciro → ZORUNLU
    Erken kayıt tavsiye edilir (işleme başlamadan)

[ ] Aydınlatma Metni hazırlanması (avukat onayı ile)
[ ] Açık Rıza Metni hazırlanması
[ ] Veri İşleme Envanteri oluşturulması
[ ] İmha Politikası belirlenmesi
```

---

## 3. Veri Kategorileri ve Saklama Süreleri

```
┌─────────────────────────────────┬──────────────────┬────────────────────┬──────────────────┐
│ Veri                            │ Kategori         │ Saklama Süresi     │ Silme Yöntemi    │
├─────────────────────────────────┼──────────────────┼────────────────────┼──────────────────┤
│ Ad, soyad                       │ Kimlik           │ Hesap + 3 yıl      │ Anonymization    │
│ E-posta                         │ İletişim         │ Hesap + 3 yıl      │ Anonymization    │
│ Telefon numarası                │ İletişim         │ Hesap + 3 yıl      │ Anonymization    │
│ TC kimlik numarası              │ Kimlik (hassas)  │ Hesap + 3 yıl      │ Şifreli silme    │
│ Doğum tarihi                    │ Kimlik           │ Hesap + 3 yıl      │ Anonymization    │
│ Vergi kimlik numarası           │ Kimlik           │ Hesap + 10 yıl*    │ Anonymization    │
│ Ticaret sicil bilgisi           │ Kimlik (şirket)  │ Hesap + 10 yıl*    │ Anonymization    │
│ Profil fotoğrafı                │ Görsel           │ Hesap süresi       │ Fiziksel silme   │
│ Doğrulama belgeleri             │ Yasal belge      │ Hesap + 5 yıl      │ R2'den silme     │
│ Arsa ilan bilgileri             │ İşlem            │ İlan + 3 yıl       │ Anonymization    │
│ Teklif bilgileri                │ İşlem            │ Teklif + 3 yıl     │ Anonymization    │
│ Ödeme kayıtları                 │ Finansal         │ 10 yıl (yasal zo.) │ SAKLANIR         │
│ Fatura bilgileri                │ Finansal         │ 10 yıl (VUK)       │ SAKLANIR         │
│ Audit log kayıtları             │ Güvenlik         │ 5 yıl              │ SAKLANIR         │
│ IP adresi logları               │ Teknik           │ 2 yıl              │ Otomatik silme   │
│ Çerez verileri                  │ Teknik           │ 1 yıl              │ Tarayıcı         │
└─────────────────────────────────┴──────────────────┴────────────────────┴──────────────────┘

* Vergi Usul Kanunu (VUK) Md. 253 gereği 10 yıl zorunlu saklama
```

---

## 4. Teknik Uyum Gereksinimleri

### 4.1 Kayıt Akışında Zorunlu Adımlar

```
Kullanıcı kayıt formunda şunlar ZORUNLU:

1. Aydınlatma Metni linki ve checkbox:
   ☐ Aydınlatma metnini okudum ve anladım.
   (onaysız form gönderilemez)

2. Açık Rıza metni ve checkbox (pazarlama için ayrı):
   ☐ Kampanya ve duyurular için e-posta/SMS almak istiyorum.
   (bu opsiyonel — zorla işaretlenemez)

3. Kullanım Koşulları linki ve checkbox:
   ☐ Kullanım koşullarını kabul ediyorum.
```

**Teknik Kayıt:**
```sql
users.kvkk_accepted_at TIMESTAMPTZ   -- Aydınlatma onayı zamanı
-- Ayrı tablo (v1.5):
-- marketing_consent (user_id, accepted, accepted_at, ip_address)
```

### 4.2 Aydınlatma Metni Kapsamı

Aydınlatma metni aşağıdaki başlıkları içermelidir:

```
1. Veri Sorumlusunun Kimliği
   Şirket adı, adresi, VKN, iletişim

2. İşlenen Kişisel Veriler
   (Kategori bazında — her birini ayrı listele)

3. Kişisel Verilerin İşlenme Amacı
   - Hizmet sunumu
   - Kimlik doğrulama
   - Yasal yükümlülüklerin yerine getirilmesi
   - Güvenlik

4. Hukuki Dayanak (KVKK Md. 5/2)
   a) Kanunlarda açıkça öngörülmesi
   b) Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili
   c) Veri sorumlusunun meşru menfaati

5. Aktarım (Üçüncü Taraflar)
   - Iyzico (ödeme işleme)
   - Resend / e-posta sağlayıcısı
   - Cloudflare (CDN, güvenlik)
   - Railway / Neon / Upstash (altyapı)
   Aktarım ülkesi: TR + ABD (Standart Sözleşme Maddelerine göre)

6. Saklama Süreleri
   (Tablo 3.1'deki süreler)

7. Veri Sahibinin Hakları (KVKK Md. 11)
   - Verilerinin işlenip işlenmediğini öğrenme
   - İşlenmişse bilgi talep etme
   - Amacını ve amaca uygunluğunu öğrenme
   - Yurt içi / yurt dışı aktarımı öğrenme
   - Eksik / yanlış işlenmişse düzeltme talep etme
   - Silinmesini / imhasını talep etme
   - Otomatik sistemler vasıtasıyla aleyhine sonuç doğurmama
   - Zarara uğranılmışsa tazminat talep etme

8. Hakların Kullanım Yöntemi
   kvkk@muteahitt.com adresine yazılı başvuru
   Yanıt süresi: 30 gün
```

### 4.3 KVKK Başvuru Endpoint'i

```typescript
// POST /users/kvkk-request
// KVKK Md. 11 kapsamındaki veri sahibi başvuruları

interface KvkkRequest {
  type: 'ACCESS'         // Verilerime erişim
    | 'CORRECTION'       // Düzeltme
    | 'DELETION'         // Silme / unutulma hakkı
    | 'PORTABILITY'      // Veri taşınabilirliği (JSON export)
    | 'OBJECTION';       // İşlemeye itiraz
  description: string;
}

// Yanıt süresi: 30 takvim günü (yasal zorunluluk)
// Yanıt yöntemi: e-posta veya yazılı
```

---

## 5. Çerez (Cookie) Politikası

### 5.1 Çerez Kategorileri

```
Zorunlu Çerezler (onay gerekmez):
  - session (JWT refresh token — httpOnly, secure, sameSite: strict)
  - csrf-token

Tercih Çerezleri (onay gerekir):
  - theme (açık/koyu mod)
  - locale (dil tercihi)

Analitik Çerezler (onay gerekir):
  - Plausible Analytics (cookie-free alternatif — öneri)
  - Google Analytics KAÇINILMALI (KVKK + GDPR uyum zorluğu)

Pazarlama Çerezleri (onay gerekir):
  - MVP'de yok
```

### 5.2 Teknik Çerez Ayarları

```typescript
// Refresh token cookie ayarları
res.cookie('refreshToken', token, {
  httpOnly: true,       // JS erişimi yok — XSS koruması
  secure: true,         // Yalnızca HTTPS
  sameSite: 'strict',   // CSRF koruması
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 gün
  domain: '.muteahitt.com',
  path: '/auth/refresh',  // Yalnızca refresh endpoint'inde gönderilir
});
```

### 5.3 Çerez Onay Bileşeni

```
İlk ziyarette banner gösterilir:
  "Bu site zorunlu çerezler kullanmaktadır.
   Daha iyi deneyim için tercih çerezlerine de izin verebilirsiniz."

  [Yalnızca Zorunlu]  [Tümünü Kabul Et]  [Detaylı Ayarlar]

Tercih kaydedilir: localStorage (çerez değil — ironi olmaması için)
```

---

## 6. Veri İşleyenler (Üçüncü Taraflar)

Her veri işleyenle **Veri İşleme Sözleşmesi (DPA)** imzalanmalıdır.

| Sağlayıcı       | Ülke        | Aktarılan Veri                   | DPA Durumu           |
|-----------------|-------------|----------------------------------|----------------------|
| Iyzico          | Türkiye     | Ad, e-posta, ödeme bilgisi      | Iyzico DPA imzalanır |
| Cloudflare      | ABD         | IP, User-Agent, trafik          | Cloudflare DPA mevcut|
| Resend          | ABD         | Ad, e-posta                      | Resend DPA imzalanır |
| Railway         | ABD         | Tüm uygulama verisi             | Railway DPA mevcut   |
| Neon            | ABD         | Tüm veritabanı verisi           | Neon DPA imzalanır   |
| Upstash Redis   | ABD         | Cache, oturum verisi            | Upstash DPA mevcut   |
| Cloudflare R2   | ABD/EU      | Belgeler, fotoğraflar           | Cloudflare DPA mevcut|

**ABD Transferi Hukuki Dayanağı:**
- EU-US Data Privacy Framework benzeri yaklaşım (Türkiye için KVKK Md. 9)
- Standart Sözleşme Maddeleri (SCC) veya açık rıza ile transfer

**Önerilen R2 Bölgesi:** `eu-west-1` (Avrupa) — verinin Türkiye/AB'ye yakın kalması için.

---

## 7. Güvenlik İhlali (Data Breach) Bildirimi

**KVKK Zorunluluğu:** İhlal fark edilmesinden itibaren **72 saat** içinde
Kişisel Verileri Koruma Kurulu'na bildirim.

```
İhlal Tespiti
      │
      ▼
İç değerlendirme: Kişisel veri etkilendi mi?
      │
      ├── EVET
      │     │
      │     ▼
      │   72 saat içinde KVKK Kurulu bildirimi
      │   (online.kvkk.gov.tr üzerinden)
      │     │
      │     ▼
      │   Etkilenen kullanıcılara bildirim
      │   (e-posta + platform bildirimi)
      │     │
      │     ▼
      │   İhlal raporu hazırlanması
      │   (ne, ne zaman, nasıl, kaç kişi etkilendi)
      │
      └── HAYIR
            │
            ▼
          İç log + düzeltici aksiyon
```

**Acil İletişim:**
- Teknik ekip: `security@muteahitt.com`
- Hukuki danışman: [kurucu tarafından atanacak]
- KVKK Kurulu: `https://kvkk.gov.tr` / 0312 216 50 00

---

## 8. Veri Silme ve Anonymization Teknik Detayı

### 8.1 "Unutulma Hakkı" Akışı

```typescript
// POST /users/kvkk-request  { type: 'DELETION' }
// Admin onayından sonra çalışır (otomatik değil — hukuki inceleme gerekli)

async anonymizeUser(userId: string, adminId: string): Promise<void> {
  await this.dataSource.transaction(async (em) => {

    // 1. Kullanıcı bilgilerini anonimleştir
    await em.update(User, { id: userId }, {
      email: `deleted_${userId}@anon.muteahitt.com`,
      fullName: '[Kullanıcı Silindi]',
      phone: null,
      avatarUrl: null,
      deletedAt: new Date(),
    });

    // 2. TC kimlik şifreli verisini sil
    await em.delete(IndividualVerification, { userId });

    // 3. Şirket bilgilerini anonimleştir
    await em.update(CompanyVerification, { userId }, {
      companyTitle: '[Şirket Silindi]',
      taxNumber: 'DELETED',
      authorizedPersonName: '[Silindi]',
      authorizedPersonPhone: null,
      authorizedPersonEmail: null,
    });

    // 4. Belgeleri R2'den fiziksel sil
    const docs = await em.find(VerificationDocument, { where: { userId } });
    for (const doc of docs) {
      await this.r2Service.delete(doc.fileUrl);
    }
    await em.delete(VerificationDocument, { userId });

    // 5. Profil fotoğrafını sil
    // (avatarUrl'deki R2 kaydı silinir)

    // KORUNACAKLAR:
    // - payments (VUK gereği 10 yıl)
    // - audit_logs (güvenlik, 5 yıl)
    // - contact_unlocks (ödeme kanıtı)

    // 6. Audit log: anonymization işlemi
    await this.auditLogsService.log({
      adminId,
      entityType: 'USER',
      entityId: userId,
      action: 'USER_ANONYMIZED',
      note: 'KVKK Md. 11 - Veri sahibi talebi',
    });
  });
}
```

### 8.2 Veri Taşınabilirliği (Portability)

```typescript
// GET /users/kvkk-export
// Kullanıcının tüm verilerini JSON olarak indirir

interface KvkkExport {
  personalInfo: { name, email, phone, createdAt };
  verificationInfo: { type, submittedAt, status };  // TC numarası dahil edilmez
  listings: Listing[];
  offers: Offer[];
  payments: PaymentSummary[];  // Kart numarası dahil edilmez
  notifications: Notification[];
  exportedAt: string;
}
```

---

## 9. Platform'a Özgü Hukuki Riskler

### 9.1 Arsa Bilgisi Sorumluluğu

Arsa sahipleri tapu bilgisi yüklüyor. Platform bu bilginin
doğruluğunu garanti etmez. Kullanım koşullarında açıkça belirtilmeli:

> "müteahitt.com, kullanıcılar tarafından paylaşılan arsa bilgilerinin
> doğruluğunu taahhüt etmez. Kullanıcılar paylaştıkları bilgilerden
> hukuki olarak sorumludur."

### 9.2 Teklif ve Sözleşme Sorumluluğu

Platformdaki teklifler bağlayıcı hukuki sözleşme değildir.
Kullanım koşullarında:

> "Platform üzerindeki teklifler bir ön görüşme niteliğindedir.
> Bağlayıcı anlaşma, taraflar arasında ayrıca imzalanacak sözleşme
> ile kurulur. müteahitt.com taraf değildir."

### 9.3 Ödeme ve Cayma Hakkı

Mesafeli satış yönetmeliği kapsamında:

> Dijital içerik (iletişim bilgisi) teslim edildikten sonra
> cayma hakkı kullanılamaz. KVKK Md. 48/f bendi.
> Bu husus ödeme öncesi kullanıcıya açıkça gösterilmelidir.

**Teknik Uygulama:**
```
Ödeme modal'ında — "Satın Al" butonundan önce:
"İletişim bilgisine erişim sağlandıktan sonra iade yapılamamaktadır.
 Bu koşulları kabul ediyorum. [Satın Al ₺399]"
```

### 9.4 Vergi Sorumluluğu

Platform aracılık hizmeti sunmaktadır. Arsa sahipleri ve müteahhitler
arasındaki ticari işlem platformun dışında gerçekleşir.
Platformun geliri: iletişim açma hizmeti bedeli.

KDV: %18 dahil mi, hariç mi → Muhasebeci/Mali Müşavir kararı.

---

## 10. Geliştirici Kontrol Listesi (KVKK Uyum)

```
Kod Yazılmadan Önce:
[ ] Aydınlatma metni avukat onaylı ve /kvkk sayfasında yayında
[ ] VERBİS kaydı yapılmış veya başvuru yapılmış
[ ] Üçüncü taraflarla DPA sözleşmeleri imzalanmış

Kayıt Akışı:
[ ] KVKK checkbox zorunlu (false ile gönderilemiyor)
[ ] Pazarlama izni ayrı checkbox (zorunlu değil)
[ ] kvkk_accepted_at timestamp kaydediliyor

Veri İşleme:
[ ] TC numarası AES-256-GCM ile şifreli
[ ] TC numarası hiçbir API yanıtında tam dönmüyor
[ ] Hassas alanlar loglanmıyor
[ ] Anonymization endpoint çalışıyor

Saklama:
[ ] Cron job: süresi dolan veriler için imha uyarısı
[ ] 10 yıl saklanacak finansal kayıtlar ayrı işaretlenmiş

Kullanıcı Hakları:
[ ] /users/kvkk-request endpoint aktif
[ ] /users/kvkk-export endpoint aktif
[ ] 30 gün yanıt SLA tanımlanmış
[ ] kvkk@muteahitt.com posta kutusu aktif
```
