# VERIFICATION_SYSTEM.md — Kimlik ve Firma Doğrulama Sistemi

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Sistemin Amacı

Doğrulama sistemi iki temel sorunu çözer:

**Problem 1 — Güven:** Arsa sahipleri yüz binlerce TL değerindeki
arsaları için teklif alacak. Karşılarındaki müteahhidin gerçekten
var olan, kayıtlı bir firma olduğunu bilmek isterler.

**Problem 2 — Kötüye Kullanım:** Doğrulanmamış hesaplar sahte ilan
açabilir, spam teklif verebilir. Doğrulama bu riski minimize eder.

**Çözüm:** Platform, işlem yapabilmek için hesap doğrulamasını
zorunlu kılar. Doğrulama tipi kullanıcı tipine göre farklılaşır.

---

## 2. Doğrulama Mimarisi

```
Kayıt
  │
  ├─── INDIVIDUAL (Bireysel)          ──▶ TC Kimlik Doğrulaması
  │     (Arsa sahibi bireyler)
  │
  └─── COMPANY (Şirket)               ──▶ Ticari Kimlik Doğrulaması
        (Müteahhitler, şirketler)

Her iki tip için ortak akış:
  Kayıt → E-posta Doğrulama → Bilgi Formu → Belge Yükleme
    → PENDING_APPROVAL → Admin İncelemesi → Sonuç
```

### 2.1 Durum Makinesi

```
┌──────────────────┐
│  PENDING_EMAIL   │  Kayıt tamamlandı, e-posta doğrulanmadı
└────────┬─────────┘
         │ e-posta doğrulandı
         ▼
┌──────────────────┐
│PENDING_APPROVAL  │  Bilgi/belge yüklendi, admin incelemesi bekleniyor
└────────┬─────────┘
         │
    ┌────┴──────────────────┐
    │                       │
    ▼                       ▼
┌──────────┐         ┌──────────────┐
│  ACTIVE  │         │  RESTRICTED  │  Kısıtlı erişim
└──────────┘         └──────┬───────┘
                            │ admin kararı
                            ▼
                     ┌──────────────┐
                     │    ACTIVE    │
                     └──────────────┘
    │
    ▼
┌──────────┐
│ REJECTED │  Red — kullanıcı belgeleri güncelleyip tekrar başvurabilir
└────┬─────┘
     │ belge güncellendi
     ▼
┌──────────────────┐
│PENDING_APPROVAL  │  Tekrar incelemeye girer
└──────────────────┘

ACTIVE → SUSPENDED  (admin kararı — kural ihlali)
SUSPENDED → ACTIVE  (admin kararı — inceleme sonrası)
```

---

## 3. Bireysel Kullanıcı Doğrulaması

### 3.1 Kapsam

`user_type = INDIVIDUAL` olan tüm kullanıcılar.
Tipik profil: Kişisel arsasını değerlendirmek isteyen bireyler.

### 3.2 Zorunlu Bilgiler

| Alan               | Kural                                       | Depolama         |
|--------------------|---------------------------------------------|------------------|
| TC Kimlik No       | 11 haneli, algoritma doğrulaması geçmeli    | AES-256-GCM şifreli |
| Doğum Tarihi       | Geçerli tarih, 18 yaş üstü                 | Düz metin        |

### 3.3 TC Kimlik Algoritma Doğrulaması

TC kimlik numarası Türkiye Cumhuriyeti tarafından tanımlı bir kontrol
algoritmasına sahiptir. NVI API'ye gerek kalmadan matematiği doğrulanabilir:

```typescript
// verification/utils/tc-validator.ts

export function validateTcNumber(tc: string): boolean {
  if (!/^\d{11}$/.test(tc)) return false;
  if (tc[0] === '0') return false;

  const digits = tc.split('').map(Number);

  // 10. hane kontrolü
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const d10 = ((oddSum * 7) - evenSum) % 10;
  if (d10 !== digits[9]) return false;

  // 11. hane kontrolü
  const first10Sum = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const d11 = first10Sum % 10;
  if (d11 !== digits[10]) return false;

  return true;
}
```

**Önemli:** Bu doğrulama yalnızca formatın geçerli olduğunu kanıtlar.
TC numarasının gerçek bir kişiye ait olduğunu kanıtlamaz.
Gerçek kimlik eşleşmesi v2'de NVI entegrasyonu ile yapılacaktır.

### 3.4 Opsiyonel Belgeler (Bireysel)

Admin gerekli görürse talep edebilir. Kullanıcı doğrudan yükleyebilir:

| Belge Tipi        | Açıklama                        |
|-------------------|---------------------------------|
| `ID_CARD_FRONT`   | Kimlik ön yüz                   |
| `ID_CARD_BACK`    | Kimlik arka yüz                 |

### 3.5 Admin Değerlendirme Kriterleri (Bireysel)

```
Admin şunları kontrol eder:
  □ TC numarası algoritma kontrolünden geçti mi? (otomatik)
  □ Kullanıcı 18 yaş üstü mü?
  □ Yüklendiyse: kimlik fotoğrafı okunabilir mi?
  □ Kimlik bilgileri birbirleriyle tutarlı mı?

Onay kriteri: TC formatı geçerli + yaş uygun = onay verilebilir
              (V1'de gerçek NVI eşleşmesi yoktur)
```

---

## 4. Şirket / Müteahhit Doğrulaması

### 4.1 Kapsam

`user_type = COMPANY` olan tüm kullanıcılar.
Tipik profil: İnşaat firmaları, müteahhitler, yapı kooperatifleri.

### 4.2 Zorunlu Bilgiler

| Alan                      | Kural                                        |
|---------------------------|----------------------------------------------|
| Şirket Unvanı             | Ticaret sicilindeki tam unvan, min 5 karakter |
| Vergi Kimlik Numarası     | 10 haneli, format kontrolü                   |
| Bağlı Vergi Dairesi       | Serbest metin, min 3 karakter                |
| Ticaret Sicil Numarası    | Serbest metin                                |
| Yetkili Kişi Adı Soyadı   | Min 5 karakter                               |

### 4.3 Vergi Numarası Doğrulaması

```typescript
// Vergi numarası format kontrolü (Türkiye 10 haneli)
export function validateTaxNumber(vkn: string): boolean {
  if (!/^\d{10}$/.test(vkn)) return false;

  const digits = vkn.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    const tmp = (digits[i] + (9 - i)) % 10;
    const val = tmp === 0 ? 9 : (tmp * Math.pow(2, 9 - i)) % 9;
    sum += val;
  }

  const checkDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);
  return checkDigit === digits[9];
}
```

### 4.4 Zorunlu Belgeler (Şirket)

| Belge Tipi                  | Açıklama                                         | Zorunlu |
|-----------------------------|--------------------------------------------------|---------|
| `TAX_CERTIFICATE`           | Vergi levhası (son 1 yıla ait)                  | ✅ Evet |
| `TRADE_REGISTRY_GAZETTE`    | Ticaret sicil gazetesi (kuruluş veya güncel)    | ✅ Evet |
| `SIGNATURE_CIRCULAR`        | İmza sirküleri (noter onaylı)                   | opsiyonel |
| `ACTIVITY_CERTIFICATE`      | Ticaret odası faaliyet belgesi (son 6 ay)       | opsiyonel |

**Belge Gerekliliği Kuralı:**
`TAX_CERTIFICATE` ve `TRADE_REGISTRY_GAZETTE` olmadan başvuru
`submit` edilemez. Backend bu kontrolü yapar:

```typescript
async submitVerification(userId: string): Promise<void> {
  const docs = await this.verificationDocRepository.find({
    where: { userId }
  });

  const hasRequired = (type: string) =>
    docs.some(d => d.type === type);

  if (!hasRequired('TAX_CERTIFICATE')) {
    throw new UnprocessableEntityException({
      code: 'MISSING_TAX_CERTIFICATE',
      message: 'Vergi levhası yüklenmeden başvuru gönderilemez.',
    });
  }

  if (!hasRequired('TRADE_REGISTRY_GAZETTE')) {
    throw new UnprocessableEntityException({
      code: 'MISSING_TRADE_REGISTRY',
      message: 'Ticaret sicil gazetesi yüklenmeden başvuru gönderilemez.',
    });
  }

  await this.userRepository.update(userId, {
    status: 'PENDING_APPROVAL',
  });
}
```

### 4.5 Admin Değerlendirme Kriterleri (Şirket)

```
Admin şunları kontrol eder:
  □ Vergi numarası algoritma kontrolünden geçti mi? (otomatik)
  □ Vergi levhası okunabilir mi? Süresi geçmemiş mi?
  □ Ticaret sicil gazetesi: unvan VKN ile eşleşiyor mu?
  □ Yetkili kişi bilgisi makul görünüyor mu?
  □ Şirket adresi Türkiye'de mi?

Ek kontrol (opsiyonel, admin kararına bırakıldı):
  □ MERSİS üzerinden şirketin aktif olduğu doğrulanabilir
    (https://mersis.gov.tr — ücretsiz, public sorgu)
```

---

## 5. Admin İnceleme Arayüzü (Teknik Tasarım)

### 5.1 Başvuru Sıralaması

Admin panelinde başvurular şu sıraya göre listelenir:

```
1. PENDING_APPROVAL + COMPANY tipi (öncelikli — ticari risk daha yüksek)
2. PENDING_APPROVAL + INDIVIDUAL tipi
3. REJECTED sonrası tekrar başvuranlar (eski başvuru tarihi bazlı)

Sıralama: created_at ASC (ilk gelen ilk işlem görür — FIFO)
```

### 5.2 Başvuru Detay Sayfası Bileşenleri

```
┌─────────────────────────────────────────────────────┐
│  Kullanıcı Özeti                                    │
│  Ad: Mehmet Yılmaz  |  E-posta: ...  |  Kayıt: ... │
│  Tip: COMPANY       |  Rol: CONTRACTOR              │
├─────────────────────────────────────────────────────┤
│  Şirket Bilgileri                   [Düzenle]       │
│  Unvan: Yılmaz İnşaat A.Ş.                          │
│  VKN: 123456****  (maskelenmiş)                     │
│  Vergi D.: Kadıköy | Sicil No: 12345               │
│  Yetkili: Mehmet Yılmaz (Genel Müdür)               │
├─────────────────────────────────────────────────────┤
│  Belgeler                                           │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │  vergi_levhasi.pdf   │  │  ticaret_sicil.pdf   │ │
│  │  [Görüntüle]         │  │  [Görüntüle]         │ │
│  └──────────────────────┘  └──────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  Admin Notu (dahili, kullanıcı görmez)              │
│  [_________________________________]                │
├─────────────────────────────────────────────────────┤
│  Karar                                              │
│  [✅ Onayla] [⚠️ Kısıtlı Onayla] [📎 Belge İste] [❌ Reddet] │
└─────────────────────────────────────────────────────┘
```

### 5.3 Karar Akışları

**Onayla:**
```
Admin "Onayla" tıklar
  → users.status = ACTIVE
  → users.approved_at = NOW()
  → users.approved_by = admin.id
  → audit_logs INSERT (action: USER_APPROVED)
  → notification INSERT (type: VERIFICATION_APPROVED)
  → e-posta gönderilir (async queue)
```

**Kısıtlı Onayla:**
```
Admin "Kısıtlı Onayla" tıklar + neden yazar
  → users.status = RESTRICTED
  → users.rejection_reason = neden
  → audit_logs INSERT (action: USER_RESTRICTED)
  → notification INSERT (type: ACCOUNT_RESTRICTED)
  → e-posta: "Hesabınız kısıtlı erişimle açıldı. İlanlara bakabilirsiniz..."
```

**Ek Belge İste:**
```
Admin talep edilen belgeleri seçer + mesaj yazar
  → users.status DEĞİŞMEZ (hâlâ PENDING_APPROVAL)
  → notification INSERT (type: VERIFICATION_EXTRA_DOCUMENT)
  → e-posta: istenen belgeler listesi + admin mesajı
  → audit_logs INSERT (action: USER_EXTRA_DOCUMENT_REQUESTED)
```

**Reddet:**
```
Admin red nedenini yazar (zorunlu, min 20 karakter)
  → users.status = REJECTED
  → users.rejection_reason = neden
  → audit_logs INSERT (action: USER_REJECTED)
  → notification INSERT (type: VERIFICATION_REJECTED)
  → e-posta: red nedeni + tekrar başvuru talimatı
```

---

## 6. Tekrar Başvuru Süreci

Reddedilen kullanıcı belgelerini güncelleyerek tekrar başvurabilir.

```typescript
// Tekrar başvuru kısıtları:
// - Aynı gün 3'ten fazla başvuru yapılamaz (spam önleme)
// - Her tekrar başvuruda audit_logs'a kayıt düşer
// - Admin hangi versiyonun reddedildiğini görebilir

async resubmitVerification(userId: string): Promise<void> {
  const user = await this.findActiveUser(userId);

  if (user.status !== 'REJECTED') {
    throw new UnprocessableEntityException('Yalnızca reddedilen hesaplar tekrar başvurabilir.');
  }

  // Günlük başvuru sayısı kontrolü
  const todayCount = await this.auditLogsService.countTodayResubmissions(userId);
  if (todayCount >= 3) {
    throw new TooManyRequestsException('Günlük başvuru limitine ulaştınız.');
  }

  await this.userRepository.update(userId, {
    status: 'PENDING_APPROVAL',
    rejectionReason: null,
  });

  await this.auditLogsService.log({
    adminId: null,           // Kullanıcı aksiyonu
    entityType: 'USER',
    entityId: userId,
    action: 'USER_RESUBMITTED',
    note: 'Kullanıcı tekrar başvuru yaptı',
  });
}
```

---

## 7. NVI Entegrasyonu (v2 Planı)

MVP'de TC kimlik numarası format kontrolüyle kabul edilir,
gerçek eşleşme yapılmaz. v2'de NVI KPS API ile entegrasyon:

### 7.1 NVI KPS API Hakkında

- **Sağlayıcı:** T.C. İçişleri Bakanlığı Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü
- **Erişim:** Resmî başvuru gerektirir (2-4 ay sürebilir)
- **Başvuru yeri:** nvi.gov.tr veya yetkili e-Devlet kapısı
- **Maliyet:** Kurumsal kullanım için anlaşma gereklidir

### 7.2 v2 Teknik Tasarımı

```
Kullanıcı TC + doğum tarihi gönderir
      │
      ▼
NVI KPS Sorgusu:
  POST https://api.nvi.gov.tr/kps/verify
  {
    "tcKimlikNo": "12345678901",
    "ad": "MEHMET",
    "soyad": "YILMAZ",
    "dogumYili": 1985
  }
      │
      ├── true  → TC kimlik doğrulandı, kullanıcıya bilgi
      └── false → Bilgiler eşleşmiyor, tekrar dene
```

**v2 Durum Geçişi:**
- NVI doğrulanmış kullanıcı: admin incelemesi kısalır.
- `individual_verifications.nvi_verified = true` işaretlenir.
- Admin hâlâ son karar yetkisine sahiptir.

### 7.3 MERSİS Entegrasyonu (Şirketler için v2)

```
Şirket VKN ile MERSİS sorgulama:
  GET https://mersis.gov.tr/api/v1/company/{vkn}

Dönen bilgi: şirket unvanı, durum (aktif/pasif), sicil no
Bu bilgi admin ekranında "MERSİS Doğrulandı ✅" rozeti gösterir.
```

---

## 8. Bildirim İçerikleri

### Onay E-postası (VERIFICATION_APPROVED)

```
Konu: Hesabınız Onaylandı — müteahitt.com

Sayın {fullName},

Hesabınız başarıyla doğrulandı. Artık platformun tüm özelliklerinden
yararlanabilirsiniz.

• İlanları inceleyin ve teklif verin
• Arsa ilanı oluşturun
• İletişim bilgilerine erişin

[Platforma Git →]

Saygılarımızla,
müteahitt.com Ekibi
```

### Red E-postası (VERIFICATION_REJECTED)

```
Konu: Doğrulama Başvurunuz Hakkında — müteahitt.com

Sayın {fullName},

Doğrulama başvurunuz şu nedenle reddedilmiştir:

"{rejectionReason}"

Belgelerinizi güncelleyerek tekrar başvurabilirsiniz:
[Tekrar Başvur →]

Sorularınız için: destek@muteahitt.com
```

### Ek Belge Talebi (VERIFICATION_EXTRA_DOCUMENT)

```
Konu: Ek Belge Talebi — müteahitt.com

Sayın {fullName},

Doğrulama sürecinizi tamamlamak için aşağıdaki belgeleri
yüklemeniz gerekmektedir:

{requestedDocuments listesi}

Notumuz: {adminMessage}

[Belge Yükle →]
```

---

## 9. Güvenlik Notları

### 9.1 Belge Erişim Kontrolü

Doğrulama belgeleri (`verification_documents.file_url`) herkese
açık URL değildir. R2'de `public: false` bucket'ta saklanır.

```typescript
// Admin belge görüntülemek istediğinde:
async getDocumentViewUrl(documentId: string, adminId: string) {
  const doc = await this.verificationDocRepo.findOne({
    where: { id: documentId }
  });

  // Admin değilse erişim yok
  // (OwnershipGuard'dan geçemez — sadece ADMIN rolü)

  // 15 dakika geçerli presigned GET URL
  const signedUrl = await this.r2Service.getSignedUrl(
    doc.fileUrl,
    15 * 60  // saniye
  );

  await this.auditLogsService.log({
    adminId,
    entityType: 'VERIFICATION_DOCUMENT',
    entityId: documentId,
    action: 'DOCUMENT_VIEWED',
  });

  return { url: signedUrl, expiresIn: 900 };
}
```

### 9.2 TC Numarası Erişim Kısıtı

```
TC numarasına kimler erişebilir:
  ✅ Encryption service (şifreleme/çözme için)
  ✅ Admin (yalnızca son 4 hane: *******8901)
  ✅ Kullanıcının kendisi (format: görüntüleme yok — sadece "kayıtlı" gösterilir)
  ❌ Diğer kullanıcılar
  ❌ Müteahhitler
  ❌ API yanıtlarında hiçbir zaman tam TC
  ❌ Log dosyaları
```

---

## 10. Doğrulama Sistemi Metrikleri

Admin panelinde izlenecek metrikler:

| Metrik                              | Hedef         |
|-------------------------------------|---------------|
| Ortalama inceleme süresi            | < 24 saat     |
| Bekleyen başvuru sayısı             | < 20          |
| Onay oranı                          | İzleme        |
| Tekrar başvuru oranı                | < %20         |
| Doğrulanmış kullanıcı oranı         | > %80 (aktif) |

Doğrulama süresi 24 saati aşan başvurular admin panelinde
**sarı** ile işaretlenir. 48 saati aşanlar **kırmızı** ile.
