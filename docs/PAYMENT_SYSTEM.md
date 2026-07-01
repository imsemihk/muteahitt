# PAYMENT_SYSTEM.md — Ödeme Sistemi Mimarisi

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Ödeme Modeli

müteahitt.com tek bir ödeme aksiyonu üzerine kurulu gelir modeli işletir:

> **İletişim Açma (Contact Unlock)**
> Arsa sahibi, bir müteahhidin teklifini beğendiğinde
> o müteahhidin iletişim bilgisine erişmek için ödeme yapar.

Bu model kasıtlı olarak basit tutulmuştur:
- Abonelik yok → kullanıcı edinim sürtünmesi düşük
- Gizli ücret yok → güven yüksek
- Tek işlem → geliştirme ve destek maliyeti düşük

---

## 2. Fiyatlandırma

| Ürün                        | Fiyat (KDV Dahil) | KDV Oranı |
|-----------------------------|-------------------|-----------|
| İletişim Açma               | ₺399              | %18       |
| **KDV Hariç**               | **₺338,14**       |           |

**Fiyat Güncelleme Kuralı:**
Fiyat veritabanında veya config dosyasında tutulur.
Kod içine sabit yazılmaz:

```typescript
// config/payment.config.ts
export const CONTACT_UNLOCK_PRICE_TRY = parseInt(
  process.env.CONTACT_UNLOCK_PRICE ?? '399'
);
```

Böylece enflasyon veya strateji değişikliğinde tek yerden güncellenir,
deploy gerekmez.

---

## 3. Ödeme Sağlayıcısı: Iyzico

### 3.1 Neden Iyzico?

| Kriter                     | Iyzico        | Stripe        |
|----------------------------|---------------|---------------|
| Türk bankaları desteği     | Tam           | Kısıtlı       |
| 3D Secure (Yerli)          | Tam           | Ek konfigürasyon |
| TRY işlem                  | Native        | USD → TRY dönüşüm |
| Türkçe destek              | Var           | Yok            |
| Başvuru süreci             | 1-2 hafta     | Daha hızlı    |
| Yerli mevzuat uyumu        | Tam           | Kısmi         |
| Komisyon (2024)            | %2,9 + ₺0,25 | %2,9 + $0,30  |

### 3.2 Iyzico Hesap Kurulumu Önkoşulları

```
Iyzico başvurusu için gerekli belgeler:
  □ Şirket vergi levhası
  □ Ticaret sicil gazetesi
  □ İmza sirküleri
  □ Banka hesap bilgileri (IBAN)
  □ Web sitesi URL (yayında olmalı veya landing page)

Başvuru: iyzico.com/basvuru
Onay süresi: 3-10 iş günü
```

**Kritik:** Iyzico başvurusu Faz 1 ile paralel başlatılmalıdır.
Beklenirse Faz 4 bloke olur.

---

## 4. Teknik Akış

### 4.1 Ödeme Başlatma

```
Kullanıcı → "İletişim Bilgisini Gör ₺399" butonuna basar
      │
      ▼
POST /payments/initiate { offerId: "uuid" }
      │
      ▼
Backend Kontrolleri:
  1. Kullanıcı ACTIVE mi?
  2. Offer var mı ve PENDING / SHORTLISTED mi?
  3. Bu offer için contact_unlock zaten var mı? → 409
  4. Bu offer için PENDING payment zaten var mı (son 10 dk)? → 409
      │
      ▼
payments tablosuna PENDING kayıt oluştur
  { userId, offerId, amount: 399, status: PENDING }
      │
      ▼
Iyzico Initialize Payment API:
  POST https://api.iyzipay.com/payment/iyzipos/checkoutform/initialize/auth/ecom
  {
    "locale": "tr",
    "conversationId": payment.id,   ← kendi UUID'miz
    "price": "338.14",              ← KDV hariç
    "paidPrice": "399.00",          ← KDV dahil
    "currency": "TRY",
    "basketId": payment.id,
    "paymentGroup": "PRODUCT",
    "callbackUrl": "https://api.muteahitt.com/v1/payments/callback",
    "enabledInstallments": [1],     ← taksit yok
    "buyer": {
      "id": user.id,
      "name": user.fullName,
      "email": user.email,
      "identityNumber": "***",      ← Iyzico zorunlu, placeholder kullanılır
      "registrationAddress": "Türkiye",
      "city": "Istanbul",
      "country": "Turkey"
    },
    "basketItems": [{
      "id": offer.id,
      "name": "İletişim Açma Hizmeti",
      "category1": "Dijital Hizmet",
      "itemType": "VIRTUAL",
      "price": "338.14"
    }]
  }
      │
      ▼
Iyzico → { token, checkoutFormContent }
      │
      ▼
Backend → Frontend:
  { paymentId, token, checkoutFormContent, amount: "399.00" }
      │
      ▼
Frontend: Iyzico ödeme formunu modal içinde render eder
```

### 4.2 Ödeme Tamamlama — Callback

Kullanıcı Iyzico formunu doldurur ve "Öde" basar. Iyzico işlemi
tamamladıktan sonra `callbackUrl`'e POST atar:

```
Iyzico → POST /payments/callback
  { token, status: "success" / "failure" }
      │
      ▼
Backend:
  Iyzico'dan token ile ödeme detayını çek:
  POST https://api.iyzipay.com/payment/iyzipos/checkoutform/auth/ecom/detail
  { "locale": "tr", "token": token }
      │
      ▼
Iyzico → payment detayı (status, conversationId, paymentId...)
      │
      ├── status: SUCCESS
      │     └── contactUnlockService.unlock(conversationId)
      │
      └── status: FAILURE
            └── payment.status = FAILED, hata mesajı frontend'e
```

### 4.3 Webhook (Asenkron Bildirim)

Callback ağ hatası vb. nedenle ulaşmazsa Iyzico webhook ile tekrar bildirir:

```
Iyzico → POST /payments/webhook
  { iyziEventType: "IYZIPOS_PAYMENT_SUCCESS", token }

Backend:
  1. HMAC imza doğrula (bkz. SECURITY.md §6.1)
  2. Token ile ödeme detayını çek
  3. İdempotent işle (aynı token tekrar gelirse sessizce dön)
  4. contact_unlock oluştur
  5. Bildirimleri queue'ya at
  6. 200 "OK" yanıt ver
```

### 4.4 Contact Unlock Oluşturma

```typescript
// contact-unlocks/contact-unlocks.service.ts

async unlock(paymentId: string): Promise<void> {
  const payment = await this.paymentRepository.findOneOrFail({
    where: { id: paymentId },
    relations: ['offer'],
  });

  // İdempotent: zaten açıksa işlem yapma
  const existing = await this.contactUnlockRepository.findOne({
    where: { buyerId: payment.userId, offerId: payment.offerId }
  });
  if (existing) return;

  await this.dataSource.transaction(async (em) => {
    // 1. Ödeme durumunu güncelle
    await em.update(Payment, { id: paymentId }, {
      status: 'COMPLETED',
      updatedAt: new Date(),
    });

    // 2. Contact unlock kaydı oluştur
    await em.insert(ContactUnlock, {
      buyerId: payment.userId,
      offerId: payment.offerId,
      paymentId: payment.id,
      unlockedAt: new Date(),
    });
  });

  // 3. Async bildirimler (transaction dışında — başarısız olsa ödeme etkilenmez)
  await this.notificationQueue.add('contact-unlocked', {
    buyerId: payment.userId,
    contractorId: payment.offer.contractorId,
    offerId: payment.offerId,
  });
}
```

---

## 5. İade (Refund) Politikası

### 5.1 Otomatik İade Yok

Dijital içerik teslim edildikten (iletişim bilgisi açıldıktan) sonra
otomatik iade yapılmaz. Bu kural ödeme öncesi kullanıcıya gösterilir
ve Kullanım Koşulları'nda yer alır.

### 5.2 Admin Tarafından Manuel İade

Aşağıdaki durumlarda admin iade başlatabilir:

| Durum                                     | Aksiyon                           |
|-------------------------------------------|-----------------------------------|
| Müteahhit hesabı askıya alındı            | Tam iade + contact_unlock iptal   |
| Teknik hata (double charge)               | Tam iade                          |
| Kullanıcı şikayeti (değerlendirme sonrası)| Admin kararı                      |

```typescript
// admin/payments.service.ts

async refundPayment(paymentId: string, adminId: string, reason: string) {
  const payment = await this.paymentRepository.findOneOrFail({
    where: { id: paymentId, status: 'COMPLETED' }
  });

  // Iyzico iade isteği
  await this.iyzicoService.refund({
    locale: 'tr',
    conversationId: `refund_${paymentId}`,
    paymentTransactionId: payment.providerRef,
    price: payment.amount.toString(),
    currency: 'TRY',
    ip: adminIp,
  });

  await this.dataSource.transaction(async (em) => {
    // Ödemeyi REFUNDED yap
    await em.update(Payment, { id: paymentId }, { status: 'REFUNDED' });

    // Contact unlock'u iptal et
    await em.update(ContactUnlock,
      { paymentId },
      { revokedAt: new Date(), revokedBy: adminId }
    );
  });

  // Audit log
  await this.auditLogsService.log({
    adminId,
    entityType: 'PAYMENT',
    entityId: paymentId,
    action: 'PAYMENT_REFUNDED',
    note: reason,
  });

  // Kullanıcıya bildirim
  await this.notificationQueue.add('payment-refunded', {
    userId: payment.userId,
    amount: payment.amount,
    reason,
  });
}
```

---

## 6. Hata Senaryoları ve Yönetimi

```
┌─────────────────────────────────────────────────────────────────┐
│  Senaryo               │  Durum              │  Kullanıcı Görür │
├────────────────────────┼─────────────────────┼──────────────────┤
│ Kart reddi             │ FAILED              │ "Ödeme başarısız,│
│                        │                     │ kartınızı kontrol│
│                        │                     │ edin."           │
├────────────────────────┼─────────────────────┼──────────────────┤
│ 3D Secure onaysız      │ FAILED              │ "3D doğrulama    │
│                        │                     │ tamamlanmadı."   │
├────────────────────────┼─────────────────────┼──────────────────┤
│ Callback ulaşmadı      │ PENDING (timeout)   │ Sayfa yenilenince│
│                        │ Webhook kurtarır    │ bilgi açılmış    │
│                        │                     │ görünür          │
├────────────────────────┼─────────────────────┼──────────────────┤
│ Webhook gecikmeli      │ PENDING → COMPLETED │ "Ödemeniz onay-  │
│ (Iyzico tarafı)        │ (webhook gelince)   │ lanıyor, lütfen  │
│                        │                     │ bekleyin."       │
├────────────────────────┼─────────────────────┼──────────────────┤
│ Çift ödeme denemesi    │ 409 Conflict        │ "Bu teklif için  │
│                        │                     │ ödeme yapıldı."  │
├────────────────────────┼─────────────────────┼──────────────────┤
│ Iyzico servis hatası   │ FAILED + alert      │ "Ödeme servisi   │
│                        │                     │ geçici hatalı,   │
│                        │                     │ tekrar deneyin." │
└─────────────────────────────────────────────────────────────────┘
```

### 6.1 Bekleyen Ödeme Timeout

```
Kullanıcı ödeme sayfasını kapatırsa veya callback gelmezse:

Bull Queue Job: 'expire-pending-payments'
  Çalışma sıklığı: Her 15 dakika
  Mantık:
    payments WHERE status = PENDING
      AND created_at < NOW() - INTERVAL '30 minutes'
    → status = FAILED

Bu sayede PENDING kalan "hayalet" ödeme kayıtları temizlenir
ve çift ödeme koruması düzgün çalışır.
```

---

## 7. Fatura ve Muhasebe

### 7.1 MVP — Makbuz

MVP'de tam fatura entegrasyonu yoktur.
Ödeme sonrası kullanıcıya makbuz içerikli e-posta gönderilir:

```
Konu: Ödeme Onayı — müteahitt.com

Ödeme Özeti:
─────────────────────────────
İşlem No : {payment.id}
Tarih    : {payment.createdAt}
Hizmet   : İletişim Açma Hizmeti
Tutar    : ₺399,00 (KDV Dahil)
─────────────────────────────
Ödeme yöntemi: Kredi Kartı
İşlem referans: {payment.providerRef}
```

### 7.2 v2 — e-Arşiv Fatura

v2'de Iyzico üzerinden GİB e-Arşiv entegrasyonu:

```
Ödeme tamamlandı
      │
      ▼
Kullanıcı kurumsal mı? (company_verification mevcut)
  │
  ├── Evet → e-Fatura kesebilir miyiz?
  │           VKN var mı? → e-Fatura
  │           VKN yok   → e-Arşiv fatura
  │
  └── Hayır → e-Arşiv fatura (bireysel)
```

**KDV Yönetimi:**
- ₺399 KDV dahil fiyat (KDV: ₺60,86, matrah: ₺338,14)
- %18 KDV oranı (2024 dijital hizmet oranı)
- Muhasebeci / Mali Müşavir ile teyit edilmeli

---

## 8. Raporlama

Admin panelinde erişilebilecek finansal raporlar:

### 8.1 Günlük Rapor

```
Bugün:
  Tamamlanan ödeme sayısı: 12
  Toplam gelir (KDV dahil): ₺4.788
  Toplam gelir (KDV hariç): ₺4.059,36
  Başarısız ödeme sayısı: 3
  Başarısız ödeme oranı: %20
  İade sayısı: 0
```

### 8.2 Gelir Sorgusu

```sql
-- Aylık gelir raporu
SELECT
  DATE_TRUNC('month', created_at) AS ay,
  COUNT(*) FILTER (WHERE status = 'COMPLETED') AS tamamlanan,
  COUNT(*) FILTER (WHERE status = 'FAILED') AS basarisiz,
  COUNT(*) FILTER (WHERE status = 'REFUNDED') AS iade,
  SUM(amount) FILTER (WHERE status = 'COMPLETED') AS brut_gelir,
  SUM(amount) FILTER (WHERE status = 'REFUNDED') AS iade_tutari,
  SUM(amount) FILTER (WHERE status = 'COMPLETED')
    - SUM(amount) FILTER (WHERE status = 'REFUNDED') AS net_gelir
FROM payments
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY ay DESC;
```

---

## 9. v2 Ödeme Modeli Genişletmesi

MVP'de yalnızca tekil iletişim açma desteklenir.
v2'de aşağıdaki modeller değerlendirilecektir:

### 9.1 Kredi Paketi

```
Paket        Kredi  Fiyat    Kredi Başına
─────────────────────────────────────────
Tekil        1      ₺399     ₺399
Küçük Paket  3      ₺999     ₺333  (%16 indirim)
Orta Paket   5      ₺1.499   ₺300  (%25 indirim)
Büyük Paket  10     ₺2.499   ₺250  (%37 indirim)
```

**Teknik etki:**
- `user_credits` tablosu gerekir
- Ödeme → kredi ekleme → iletişim açmada kredi düşme
- Kullanılmayan krediler için süre ve iade politikası tanımlanmalı

### 9.2 Müteahhit Aboneliği

```
Plan          Fiyat/Ay   Özellikler
────────────────────────────────────────────────────
Standart      ₺999       Aylık 5 iletişim açma hakkı
Profesyonel   ₺1.999     Aylık 15 iletişim açma + öne çıkar
Kurumsal      ₺3.999     Sınırsız iletişim + tüm özellikler
```

**Teknik etki:**
- `subscriptions` tablosu
- Stripe Billing veya Iyzico Recurring Payment entegrasyonu
- Abonelik yönetimi (upgrade/downgrade/cancel) akışları

---

## 10. Güvenlik Özeti

Detaylar [SECURITY.md](./SECURITY.md) §6'da.

```
Ödeme güvenliği kontrol listesi:
  ✅ HMAC-SHA256 webhook imza doğrulama
  ✅ İdempotent webhook işleme (tekrar gelirse işlem yapma)
  ✅ Çift ödeme koruması (contact_unlock unique constraint)
  ✅ Bekleyen ödeme timeout (30 dakika sonra FAILED)
  ✅ Kart bilgisi sunucuda saklanmaz (Iyzico PCI-DSS)
  ✅ Ödeme miktarı frontend'den değil config'den okunur
  ✅ providerRef (Iyzico ID) audit trail için saklanır
  ✅ Tüm ödeme işlemleri audit_logs'a yazılır
```

---

## 11. Test Stratejisi

### 11.1 Sandbox Ortamı

```
Iyzico Sandbox:
  URL: https://sandbox-api.iyzipay.com
  Test kart: 5528790000000008 / 12/30 / 123
  3D Secure: Otomatik onay (sandbox)

Environment değişkeni:
  IYZICO_BASE_URL=https://sandbox-api.iyzipay.com  ← staging
  IYZICO_BASE_URL=https://api.iyzipay.com          ← production
```

### 11.2 Test Senaryoları

```
[ ] Başarılı ödeme → contact_unlock oluştu
[ ] Başarısız ödeme → payment FAILED, contact_unlock YOK
[ ] Webhook gecikmeli geldi → idempotent işleme
[ ] Aynı offer için ikinci ödeme denemesi → 409
[ ] Admin iade → payment REFUNDED, contact_unlock iptal
[ ] Timeout → 30 dakika sonra PENDING → FAILED
[ ] Iyzico servis hatası → graceful error, kullanıcıya mesaj
```
