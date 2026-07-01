# API_ROUTES.md — API Endpoint Belgesi

Sürüm: 1.1  
Tarih: 2026-07-01  
Base URL: `https://api.muteahitt.com/v1`  
Format: JSON  
Auth: Bearer Token (JWT)

---

## Genel Kurallar

### İstek Başlıkları

```
Content-Type: application/json
Authorization: Bearer <access_token>
```

### Standart Yanıt Yapısı

**Başarılı:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 143, "totalPages": 8 }
}
```

**Hata:**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_PENDING_APPROVAL",
    "message": "Hesabınız admin onayı bekliyor.",
    "statusCode": 403
  }
}
```

### Yetki Kısaltmaları

| Kısaltma     | Anlam                                              |
|--------------|----------------------------------------------------|
| `PUBLIC`     | Token gerekmez                                     |
| `AUTH`       | Geçerli JWT (her durum)                            |
| `ACTIVE`     | `status = ACTIVE` olan kullanıcı                   |
| `RESTRICTED` | `status IN (ACTIVE, RESTRICTED)` olan kullanıcı   |
| `OWNER`      | `LAND_OWNER` rolü + `ACTIVE` status               |
| `CONTRACTOR` | `CONTRACTOR` rolü + `ACTIVE` status               |
| `ADMIN`      | `ADMIN` rolü                                       |
| `SELF`       | Kendi kaydı üzerinde işlem                         |

### Rate Limit

| Grup                  | Limit               |
|-----------------------|---------------------|
| Genel                 | 100 istek / dakika  |
| `POST /auth/login`    | 5 istek / 15 dakika |
| `POST /auth/register` | 10 istek / saat     |
| Dosya yükleme         | 20 istek / dakika   |
| Webhook               | 50 istek / dakika   |

---

## 1. Auth

### POST /auth/register

Yeni kullanıcı kaydı. `user_type = INDIVIDUAL` ise TC kimlik,
`COMPANY` ise şirket bilgileri form adımlarında toplanır.
Kayıt sonrası `status = PENDING_EMAIL` olur.

**Yetki:** `PUBLIC`

**İstek:**
```json
{
  "email": "arif@example.com",
  "password": "Gizli123!",
  "fullName": "Arif Yılmaz",
  "phone": "05321234567",
  "role": "LAND_OWNER",
  "userType": "INDIVIDUAL",
  "kvkkAccepted": true
}
```

**Yanıt: 201**
```json
{
  "success": true,
  "data": {
    "message": "Kayıt başarılı. Lütfen e-postanızı doğrulayın."
  }
}
```

---

### POST /auth/login

**Yetki:** `PUBLIC`

**Hata Durumları:**
- `401` → Hatalı bilgi
- `403 / ACCOUNT_SUSPENDED` → Hesap askıya alındı
- `403 / ACCOUNT_REJECTED` → Hesap reddedildi
- `403 / ACCOUNT_PENDING_EMAIL` → E-posta doğrulanmamış
- `403 / ACCOUNT_PENDING_APPROVAL` → Admin onayı bekleniyor

**Yanıt: 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": {
      "id": "uuid",
      "email": "arif@example.com",
      "fullName": "Arif Yılmaz",
      "role": "LAND_OWNER",
      "userType": "INDIVIDUAL",
      "status": "ACTIVE"
    }
  }
}
```

---

### POST /auth/refresh
**Yetki:** `PUBLIC`

### POST /auth/logout
**Yetki:** `AUTH`

### GET /auth/me
**Yetki:** `AUTH`

### POST /auth/verify-email
**Yetki:** `PUBLIC`

`token` işlenince `status: PENDING_EMAIL → PENDING_APPROVAL` olur.

### POST /auth/forgot-password
**Yetki:** `PUBLIC`

### POST /auth/reset-password
**Yetki:** `PUBLIC`

---

## 2. Verification (Doğrulama Başvurusu)

### POST /verification/individual

TC kimlik bilgisi gönderme. `user_type = INDIVIDUAL` olan kullanıcılar için.

**Yetki:** `AUTH` (status: PENDING_APPROVAL veya üstü)

**İstek:**
```json
{
  "tcNumber": "12345678901",
  "dateOfBirth": "1990-05-15"
}
```

**Yanıt: 200**
```json
{
  "success": true,
  "data": {
    "message": "Kimlik bilgileriniz kaydedildi. Admin incelemesine alındı."
  }
}
```

---

### POST /verification/company

Şirket bilgileri gönderme. `user_type = COMPANY` olan kullanıcılar için.

**Yetki:** `AUTH` (status: PENDING_APPROVAL veya üstü)

**İstek:**
```json
{
  "companyTitle": "Yılmaz İnşaat A.Ş.",
  "taxNumber": "1234567890",
  "taxOffice": "Kadıköy",
  "tradeRegistryNumber": "123456",
  "tradeRegistryOffice": "İstanbul Ticaret Sicili",
  "companyType": "ANONIM",
  "address": "Moda Cad. No:1 Kadıköy/İstanbul",
  "city": "İstanbul",
  "authorizedPersonName": "Mehmet Yılmaz",
  "authorizedPersonTitle": "Genel Müdür",
  "authorizedPersonPhone": "05321234567",
  "authorizedPersonEmail": "mehmet@yilmazinsaat.com",
  "companyPhone": "02161234567",
  "companyWebsite": "https://yilmazinsaat.com",
  "foundedYear": 2005,
  "employeeCount": 45
}
```

**Yanıt: 200** → başarı mesajı

---

### POST /verification/documents

Doğrulama belgesi yükleme. Multipart form-data.

**Yetki:** `AUTH`

**İstek:** `Content-Type: multipart/form-data`
- `file` → max 10MB, PDF/JPEG/PNG
- `type` → belge tipi (aşağıda)

**Bireysel için geçerli tipler:**
`ID_CARD_FRONT`, `ID_CARD_BACK`

**Şirket için geçerli tipler:**
`TAX_CERTIFICATE`, `TRADE_REGISTRY_GAZETTE`, `SIGNATURE_CIRCULAR`,
`ACTIVITY_CERTIFICATE`, `OTHER`

**Yanıt: 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "TAX_CERTIFICATE",
    "fileName": "vergi_levhasi.pdf",
    "uploadedAt": "2026-07-01T10:00:00Z"
  }
}
```

---

### DELETE /verification/documents/:id

**Yetki:** `AUTH` + `SELF`

Yalnızca `PENDING_APPROVAL` durumundaki başvurularda silinebilir.

**Yanıt: 204**

---

### GET /verification/status

Kullanıcının doğrulama durumunu döner.

**Yetki:** `AUTH`

**Yanıt: 200**
```json
{
  "success": true,
  "data": {
    "accountStatus": "PENDING_APPROVAL",
    "userType": "COMPANY",
    "hasCompanyInfo": true,
    "documents": [
      {
        "id": "uuid",
        "type": "TAX_CERTIFICATE",
        "fileName": "vergi_levhasi.pdf",
        "uploadedAt": "2026-07-01T10:00:00Z"
      }
    ],
    "rejectionReason": null,
    "adminNote": null
  }
}
```

---

## 3. Users (Profil)

### GET /users/profile
**Yetki:** `AUTH`

### PUT /users/profile
**Yetki:** `AUTH` + `SELF`

### POST /users/change-password
**Yetki:** `AUTH`

### POST /users/avatar
**Yetki:** `AUTH`

---

## 4. Listings

### GET /listings
**Yetki:** `RESTRICTED` (status ACTIVE veya RESTRICTED)

Misafir ve `PENDING_*` durumundaki kullanıcılar erişemez.

**Query:** `city`, `district`, `dealType`, `minArea`, `maxArea`, `sortBy`, `page`, `limit`

**Yanıt: 200** → ilan listesi

---

### GET /listings/:id
**Yetki:** `RESTRICTED`

---

### POST /listings
**Yetki:** `OWNER`

**Hata:** `403 / ACCOUNT_NOT_ACTIVE` → status ACTIVE değilse

---

### PUT /listings/:id
**Yetki:** `OWNER` + `SELF`

### PATCH /listings/:id/publish
**Yetki:** `OWNER` + `SELF`

### PATCH /listings/:id/pause
**Yetki:** `OWNER` + `SELF`

### PATCH /listings/:id/renew
**Yetki:** `OWNER` + `SELF`

### DELETE /listings/:id
**Yetki:** `OWNER` + `SELF`

### GET /listings/my
**Yetki:** `OWNER`

### POST /listings/:id/images
**Yetki:** `OWNER` + `SELF`

### DELETE /listings/:id/images/:imageId
**Yetki:** `OWNER` + `SELF`

### PATCH /listings/:id/images/:imageId/cover
**Yetki:** `OWNER` + `SELF`

### PATCH /listings/:id/images/reorder
**Yetki:** `OWNER` + `SELF`

---

## 5. Offers

### POST /listings/:listingId/offers
**Yetki:** `CONTRACTOR`

**Hata Durumları:**
- `403 / ACCOUNT_NOT_ACTIVE` → müteahhit ACTIVE değil
- `409` → aynı ilana zaten teklif verilmiş
- `422` → ilan aktif değil
- `422` → içerik iletişim bilgisi içeriyor

### GET /listings/:listingId/offers
**Yetki:** `OWNER` + `SELF`

### GET /offers/my
**Yetki:** `CONTRACTOR`

### GET /offers/:id
**Yetki:** `CONTRACTOR` (kendi) veya `OWNER` (ilan sahibi)

### PUT /offers/:id
**Yetki:** `CONTRACTOR` + `SELF`

### PATCH /offers/:id/withdraw
**Yetki:** `CONTRACTOR` + `SELF`

### PATCH /offers/:id/shortlist
**Yetki:** `OWNER` (ilan sahibi)

---

## 6. Payments

### POST /payments/initiate
**Yetki:** `OWNER`

### POST /payments/webhook
**Yetki:** `PUBLIC` (HMAC imza doğrulamalı)

### GET /payments/history
**Yetki:** `AUTH`

---

## 7. Contact Unlocks

### GET /contact-unlocks/:offerId
**Yetki:** `OWNER` + `SELF` (ödeme yapmış)

### GET /contact-unlocks
**Yetki:** `OWNER`

---

## 8. Notifications

### GET /notifications
**Yetki:** `AUTH`

### PATCH /notifications/:id/read
**Yetki:** `AUTH` + `SELF`

### PATCH /notifications/read-all
**Yetki:** `AUTH`

---

## 9. Admin — Kullanıcı Yönetimi

> Tüm admin endpoint'leri `ADMIN` rolü gerektirir.
> Her başarılı işlem otomatik olarak `audit_logs` tablosuna yazılır.

---

### GET /admin/users

Tüm kullanıcılar.

**Query:** `role`, `userType`, `status`, `search`, `page`, `limit`

**Yanıt: 200** → kullanıcı listesi

---

### GET /admin/users/:id

Kullanıcı detayı. Doğrulama bilgileri ve belgeler dahil.

**Yanıt: 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "arif@example.com",
    "fullName": "Arif Yılmaz",
    "phone": "05321234567",
    "role": "CONTRACTOR",
    "userType": "COMPANY",
    "status": "PENDING_APPROVAL",
    "adminNote": null,
    "createdAt": "2026-07-01T09:00:00Z",
    "companyVerification": {
      "companyTitle": "Yılmaz İnşaat A.Ş.",
      "taxNumber": "1234567890",
      "taxOffice": "Kadıköy",
      "tradeRegistryNumber": "123456",
      "authorizedPersonName": "Mehmet Yılmaz"
    },
    "documents": [
      {
        "id": "uuid",
        "type": "TAX_CERTIFICATE",
        "fileUrl": "https://cdn.muteahitt.com/docs/uuid.pdf",
        "fileName": "vergi_levhasi.pdf",
        "uploadedAt": "2026-07-01T09:30:00Z"
      }
    ],
    "stats": {
      "listingCount": 0,
      "offerCount": 2,
      "paymentCount": 0
    }
  }
}
```

---

### PATCH /admin/users/:id/approve

Kullanıcıyı onayla. `status → ACTIVE`.

**İstek:**
```json
{
  "note": "Tüm belgeler eksiksiz. Onaylandı."
}
```

**Yanıt: 200**
```json
{
  "success": true,
  "data": { "status": "ACTIVE", "approvedAt": "2026-07-01T12:00:00Z" }
}
```

**Yan Etki:**
- Kullanıcıya "Hesabınız onaylandı" bildirimi gönderilir.
- `audit_logs`'a `USER_APPROVED` kaydı eklenir.

---

### PATCH /admin/users/:id/reject

Kullanıcıyı reddet. `status → REJECTED`.

**İstek:**
```json
{
  "reason": "Yüklenen vergi levhası güncel değil. Lütfen son 1 yıla ait belge yükleyin."
}
```

**Yanıt: 200**

**Yan Etki:**
- Kullanıcıya red nederiyle birlikte bildirim gönderilir.
- `audit_logs`'a `USER_REJECTED` kaydı eklenir.

---

### PATCH /admin/users/:id/restrict

Kullanıcıyı kısıtlı onayla. `status → RESTRICTED`.

Kısıtlı kullanıcı: ilan görebilir, profil düzenleyebilir.
İlan açamaz, teklif veremez, iletişim açamaz.

**İstek:**
```json
{
  "reason": "Firma bilgileri eksik, tamamlanması bekleniyor."
}
```

**Yanıt: 200**

**Yan Etki:**
- Kullanıcıya "Hesabınız kısıtlı onaylandı" bildirimi gönderilir.
- `audit_logs`'a `USER_RESTRICTED` kaydı eklenir.

---

### PATCH /admin/users/:id/request-document

Ek belge talep et. `status` değişmez; kullanıcıya bildirim gider.

**İstek:**
```json
{
  "requestedDocuments": ["SIGNATURE_CIRCULAR", "ACTIVITY_CERTIFICATE"],
  "message": "İmza sirküleri eksik. Lütfen noterce onaylı kopya ekleyin."
}
```

**Yanıt: 200**

**Yan Etki:**
- Kullanıcıya `VERIFICATION_EXTRA_DOCUMENT` bildirimi + e-posta.
- `audit_logs`'a `USER_EXTRA_DOCUMENT_REQUESTED` kaydı eklenir.

---

### PATCH /admin/users/:id/suspend

Kullanıcıyı askıya al. `status → SUSPENDED`.

**İstek:**
```json
{
  "reason": "Kural ihlali: teklif metninde iletişim bilgisi paylaşımı."
}
```

**Yanıt: 200**

---

### PATCH /admin/users/:id/activate

Askıdaki veya reddedilen kullanıcıyı aktifleştir. `status → ACTIVE`.

**İstek:**
```json
{
  "note": "Kullanıcı itiraz etti, inceleme sonrası onaylandı."
}
```

**Yanıt: 200**

---

### PATCH /admin/users/:id/change-role

Kullanıcı rolünü değiştir.

**İstek:**
```json
{
  "role": "CONTRACTOR",
  "note": "Kullanıcı müteahhit olarak devam etmek istediğini bildirdi."
}
```

**Validasyon:**
- `ADMIN` rolüne geçiş bu endpoint'ten yapılamaz.
- Rol değişince ilgili doğrulama kaydı güncellenmez; admin ayrıca kontrol etmeli.

**Yanıt: 200**

**Yan Etki:**
- `audit_logs`'a `USER_ROLE_CHANGED` (fieldName: role, oldValue, newValue) kaydı.

---

### PUT /admin/users/:id/edit

Kullanıcı veya doğrulama bilgilerini manuel düzenleme.

**İstek:**
```json
{
  "fields": {
    "fullName": "Arif Mehmet Yılmaz",
    "phone": "05331234567",
    "companyVerification.companyTitle": "Yılmaz İnşaat ve Yapı A.Ş.",
    "companyVerification.taxOffice": "Üsküdar"
  },
  "note": "Kullanıcı telefon hatasını bildirdi."
}
```

**Yanıt: 200** → güncellenmiş kullanıcı nesnesi

**Yan Etki:**
- Her değiştirilen alan için ayrı `audit_logs` kaydı eklenir
  (`USER_FIELD_EDITED`, `fieldName`, `oldValue`, `newValue`).

---

### GET /admin/users/:id/audit-logs

Kullanıcıya ait tüm admin işlem geçmişi.

**Yanıt: 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "admin": { "id": "uuid", "fullName": "Süleyman Admin" },
      "action": "USER_APPROVED",
      "fieldName": null,
      "oldValue": null,
      "newValue": null,
      "note": "Tüm belgeler eksiksiz.",
      "createdAt": "2026-07-01T12:00:00Z"
    },
    {
      "id": "uuid",
      "admin": { "id": "uuid", "fullName": "Süleyman Admin" },
      "action": "USER_FIELD_EDITED",
      "fieldName": "phone",
      "oldValue": "05321234567",
      "newValue": "05331234567",
      "note": "Kullanıcı telefon hatasını bildirdi.",
      "createdAt": "2026-07-02T09:00:00Z"
    }
  ]
}
```

---

## 10. Admin — İlan Yönetimi

### GET /admin/listings

**Query:** `status`, `city`, `ownerId`, `page`, `limit`

---

### GET /admin/listings/:id

İlan detayı + tüm teklifler + audit log özeti.

---

### PATCH /admin/listings/:id/suspend

**İstek:**
```json
{
  "reason": "Sahte ilan şüphesi bildirimi üzerine incelemeye alındı."
}
```

**Yan Etki:** `audit_logs`'a `LISTING_SUSPENDED` kaydı.

---

### PATCH /admin/listings/:id/activate

Askıdaki ilanı aktifleştir.

**Yan Etki:** `audit_logs`'a `LISTING_ACTIVATED` kaydı.

---

### DELETE /admin/listings/:id

Soft delete.

**İstek:**
```json
{
  "reason": "Kullanıcı talebi."
}
```

**Yan Etki:** `audit_logs`'a `LISTING_DELETED` kaydı.

---

### PUT /admin/listings/:id/edit

İlan alanlarını manuel düzenle.

**İstek:**
```json
{
  "fields": {
    "title": "Kadıköy 450m² Arsa (Düzeltildi)",
    "areaM2": 452
  },
  "note": "Arsa sahibi m² bilgisinin hatalı girildiğini bildirdi."
}
```

**Yan Etki:** Her alan için `audit_logs`'a `LISTING_FIELD_EDITED` kaydı.

---

### GET /admin/listings/:id/audit-logs

İlana ait admin işlem geçmişi.

---

## 11. Admin — Teklif Yönetimi

### GET /admin/offers

**Query:** `listingId`, `contractorId`, `status`, `page`, `limit`

---

### PATCH /admin/offers/:id/withdraw

Teklifi admin olarak geri çek.

**İstek:**
```json
{
  "reason": "Müteahhit hesabı askıya alındı."
}
```

**Yan Etki:** `audit_logs`'a `OFFER_WITHDRAWN` kaydı.

---

### GET /admin/offers/:id/audit-logs

---

## 12. Admin — Ödeme Yönetimi

### GET /admin/payments

**Query:** `status`, `startDate`, `endDate`, `userId`, `page`, `limit`

---

### PATCH /admin/payments/:id/refund

Ödemeyi iade et.

**İstek:**
```json
{
  "reason": "Müteahhit hesabı askıya alındı, kullanıcı talebi."
}
```

**Yan Etki:**
- Iyzico üzerinden iade başlatılır.
- `contact_unlocks` kaydı varsa iptal edilir.
- `audit_logs`'a `PAYMENT_REFUNDED` kaydı.

---

### PATCH /admin/payments/:id/status

Ödeme durumunu manuel güncelle.

**İstek:**
```json
{
  "status": "COMPLETED",
  "note": "Iyzico webhook gecikmeli geldi, manuel tamamlandı."
}
```

**Yan Etki:** `audit_logs`'a `PAYMENT_STATUS_CHANGED` kaydı.

---

## 13. Admin — İletişim Erişim Yönetimi

### POST /admin/contact-unlocks/grant

Ödeme olmaksızın iletişim erişimi aç (örn. teknik sorun, iade sonrası telafi).

**İstek:**
```json
{
  "buyerId": "uuid",
  "offerId": "uuid",
  "note": "Ödeme webhook hatası nedeniyle manuel açıldı."
}
```

**Yan Etki:** `audit_logs`'a `CONTACT_UNLOCK_GRANTED` kaydı.

---

### DELETE /admin/contact-unlocks/:id/revoke

Açık iletişim erişimini iptal et.

**İstek:**
```json
{
  "reason": "Sahte ödeme tespiti."
}
```

**Yan Etki:** `audit_logs`'a `CONTACT_UNLOCK_REVOKED` kaydı.

---

## 14. Admin — Genel

### GET /admin/stats
Dashboard özet istatistikleri.

**Yanıt: 200**
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 312,
      "pendingApproval": 14,
      "active": 276,
      "restricted": 8,
      "rejected": 7,
      "suspended": 7
    },
    "listings": { "active": 87, "suspended": 3 },
    "pendingVerifications": 14,
    "revenue": {
      "thisMonth": "42750.00",
      "total": "187320.00"
    }
  }
}
```

---

### GET /admin/audit-logs

Tüm sistemdeki admin işlem geçmişi.

**Query:** `adminId`, `entityType`, `entityId`, `action`, `startDate`, `endDate`, `page`, `limit`

---

### POST /admin/notifications/broadcast

**İstek:**
```json
{
  "title": "Yeni Özellik Duyurusu",
  "body": "Platform güncellendi.",
  "targetRoles": ["LAND_OWNER", "CONTRACTOR"],
  "targetStatuses": ["ACTIVE", "RESTRICTED"],
  "sendEmail": false
}
```

---

## Endpoint Özet Tablosu

| Method | Endpoint                                         | Yetki              |
|--------|--------------------------------------------------|--------------------|
| POST   | /auth/register                                   | PUBLIC             |
| POST   | /auth/login                                      | PUBLIC             |
| POST   | /auth/refresh                                    | PUBLIC             |
| POST   | /auth/logout                                     | AUTH               |
| GET    | /auth/me                                         | AUTH               |
| POST   | /auth/verify-email                               | PUBLIC             |
| POST   | /auth/forgot-password                            | PUBLIC             |
| POST   | /auth/reset-password                             | PUBLIC             |
| POST   | /verification/individual                         | AUTH               |
| POST   | /verification/company                            | AUTH               |
| POST   | /verification/documents                          | AUTH               |
| DELETE | /verification/documents/:id                      | AUTH + SELF        |
| GET    | /verification/status                             | AUTH               |
| GET    | /users/profile                                   | AUTH               |
| PUT    | /users/profile                                   | AUTH               |
| POST   | /users/change-password                           | AUTH               |
| POST   | /users/avatar                                    | AUTH               |
| GET    | /listings                                        | RESTRICTED         |
| GET    | /listings/my                                     | OWNER              |
| GET    | /listings/:id                                    | RESTRICTED         |
| POST   | /listings                                        | OWNER              |
| PUT    | /listings/:id                                    | OWNER + SELF       |
| PATCH  | /listings/:id/publish                            | OWNER + SELF       |
| PATCH  | /listings/:id/pause                              | OWNER + SELF       |
| PATCH  | /listings/:id/renew                              | OWNER + SELF       |
| DELETE | /listings/:id                                    | OWNER + SELF       |
| POST   | /listings/:id/images                             | OWNER + SELF       |
| DELETE | /listings/:id/images/:imageId                    | OWNER + SELF       |
| PATCH  | /listings/:id/images/:imageId/cover              | OWNER + SELF       |
| PATCH  | /listings/:id/images/reorder                     | OWNER + SELF       |
| POST   | /listings/:listingId/offers                      | CONTRACTOR         |
| GET    | /listings/:listingId/offers                      | OWNER + SELF       |
| GET    | /offers/my                                       | CONTRACTOR         |
| GET    | /offers/:id                                      | CONTRACTOR / OWNER |
| PUT    | /offers/:id                                      | CONTRACTOR + SELF  |
| PATCH  | /offers/:id/withdraw                             | CONTRACTOR + SELF  |
| PATCH  | /offers/:id/shortlist                            | OWNER              |
| POST   | /payments/initiate                               | OWNER              |
| POST   | /payments/webhook                                | SYSTEM             |
| GET    | /payments/history                                | AUTH               |
| GET    | /contact-unlocks                                 | OWNER              |
| GET    | /contact-unlocks/:offerId                        | OWNER + SELF       |
| GET    | /notifications                                   | AUTH               |
| PATCH  | /notifications/:id/read                          | AUTH + SELF        |
| PATCH  | /notifications/read-all                          | AUTH               |
| GET    | /admin/stats                                     | ADMIN              |
| GET    | /admin/audit-logs                                | ADMIN              |
| GET    | /admin/users                                     | ADMIN              |
| GET    | /admin/users/:id                                 | ADMIN              |
| GET    | /admin/users/:id/audit-logs                      | ADMIN              |
| PATCH  | /admin/users/:id/approve                         | ADMIN              |
| PATCH  | /admin/users/:id/reject                          | ADMIN              |
| PATCH  | /admin/users/:id/restrict                        | ADMIN              |
| PATCH  | /admin/users/:id/request-document                | ADMIN              |
| PATCH  | /admin/users/:id/suspend                         | ADMIN              |
| PATCH  | /admin/users/:id/activate                        | ADMIN              |
| PATCH  | /admin/users/:id/change-role                     | ADMIN              |
| PUT    | /admin/users/:id/edit                            | ADMIN              |
| GET    | /admin/listings                                  | ADMIN              |
| GET    | /admin/listings/:id                              | ADMIN              |
| GET    | /admin/listings/:id/audit-logs                   | ADMIN              |
| PATCH  | /admin/listings/:id/suspend                      | ADMIN              |
| PATCH  | /admin/listings/:id/activate                     | ADMIN              |
| DELETE | /admin/listings/:id                              | ADMIN              |
| PUT    | /admin/listings/:id/edit                         | ADMIN              |
| GET    | /admin/offers                                    | ADMIN              |
| PATCH  | /admin/offers/:id/withdraw                       | ADMIN              |
| GET    | /admin/offers/:id/audit-logs                     | ADMIN              |
| GET    | /admin/payments                                  | ADMIN              |
| PATCH  | /admin/payments/:id/refund                       | ADMIN              |
| PATCH  | /admin/payments/:id/status                       | ADMIN              |
| POST   | /admin/contact-unlocks/grant                     | ADMIN              |
| DELETE | /admin/contact-unlocks/:id/revoke                | ADMIN              |
| POST   | /admin/notifications/broadcast                   | ADMIN              |
