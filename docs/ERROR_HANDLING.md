# ERROR_HANDLING.md — Hata Yönetimi Standartları

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Felsefe

> **Kullanıcıya:** Ne yapması gerektiğini söyle.  
> **Geliştiriciye:** Neyin yanlış gittiğini söyle.  
> **Dışarıya:** Hiçbir şey söyleme.

Hata yönetimi üç kitleye ayrı bilgi sunar:
- Kullanıcı mesajı: insanın anlayacağı, eyleme yönlendiren Türkçe metin
- Log mesajı: stack trace, context, request ID içeren yapılandırılmış JSON
- API yanıtı: iç sistem detayı içermeyen standart format

---

## 2. Hata Yanıt Formatı

Tüm hata yanıtları bu yapıya uyar:

```json
{
  "success": false,
  "error": {
    "code": "OFFER_CONTAINS_CONTACT_INFO",
    "message": "Teklif metninizde iletişim bilgisi tespit edildi.",
    "statusCode": 422,
    "requestId": "req_01J4XY..."
  }
}
```

| Alan        | Açıklama                                            |
|-------------|-----------------------------------------------------|
| `code`      | Makine tarafından okunabilir sabit string (SCREAMING_SNAKE_CASE) |
| `message`   | İnsan tarafından okunabilir Türkçe mesaj            |
| `statusCode`| HTTP durum kodu (body'de de tekrar eder — mobil kolaylık için) |
| `requestId` | Her isteğe atanan UUID — destek ve log eşleştirme için |

**Validation hataları** (çoklu alan) için ek `details` alanı:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Gönderilen veriler geçersiz.",
    "statusCode": 400,
    "requestId": "req_01J4XY...",
    "details": [
      { "field": "areaM2", "message": "Alan (m²) pozitif bir sayı olmalıdır." },
      { "field": "city",   "message": "İl seçimi zorunludur." }
    ]
  }
}
```

---

## 3. HTTP Durum Kodu Standardı

| Kod | Ne Zaman Kullanılır                                          |
|-----|--------------------------------------------------------------|
| 200 | Başarılı GET, PUT, PATCH                                    |
| 201 | Başarılı POST (kayıt oluşturuldu)                           |
| 204 | Başarılı DELETE (dönüş içeriği yok)                         |
| 400 | Validasyon hatası, bozuk istek                              |
| 401 | Token yok veya geçersiz                                     |
| 403 | Token geçerli ama yetki yok (rol veya sahiplik)             |
| 404 | Kayıt bulunamadı                                            |
| 409 | Çakışma (unique ihlali, tekrar ödeme vb.)                   |
| 422 | İş kuralı ihlali (format geçerli ama mantık engeli)         |
| 429 | Rate limit aşıldı                                           |
| 500 | Beklenmeyen sunucu hatası                                   |
| 503 | Servis geçici olarak kullanılamıyor (Iyzico down vb.)       |

**400 ile 422 ayrımı:**
- `400`: Gelen veri teknik olarak geçersiz (tip hatası, format hatası)
- `422`: Format geçerli ama iş kuralına aykırı (örn. pasif ilana teklif verme)

---

## 4. Hata Kodu Kataloğu

### 4.1 Auth Hataları

| Kod                          | HTTP | Açıklama                                    |
|------------------------------|------|---------------------------------------------|
| `AUTH_INVALID_CREDENTIALS`   | 401  | E-posta veya şifre hatalı                   |
| `AUTH_EMAIL_NOT_VERIFIED`    | 403  | E-posta doğrulanmamış                       |
| `AUTH_ACCOUNT_PENDING`       | 403  | Admin onayı bekleniyor                      |
| `AUTH_ACCOUNT_REJECTED`      | 403  | Hesap reddedildi                            |
| `AUTH_ACCOUNT_SUSPENDED`     | 403  | Hesap askıya alındı                         |
| `AUTH_TOKEN_EXPIRED`         | 401  | Access token süresi doldu                   |
| `AUTH_TOKEN_INVALID`         | 401  | Token imzası geçersiz                       |
| `AUTH_REFRESH_TOKEN_REUSE`   | 401  | Refresh token tekrar kullanım tespit edildi |

### 4.2 Kullanıcı / Doğrulama Hataları

| Kod                              | HTTP | Açıklama                              |
|----------------------------------|------|---------------------------------------|
| `USER_EMAIL_ALREADY_EXISTS`      | 409  | Bu e-posta zaten kayıtlı              |
| `USER_PHONE_ALREADY_EXISTS`      | 409  | Bu telefon numarası zaten kayıtlı     |
| `TC_INVALID_FORMAT`              | 400  | TC kimlik numarası geçersiz           |
| `TAX_NUMBER_INVALID_FORMAT`      | 400  | Vergi numarası geçersiz               |
| `VERIFICATION_MISSING_DOCUMENT`  | 422  | Zorunlu belge eksik                   |
| `VERIFICATION_ALREADY_PENDING`   | 409  | Bekleyen başvuru var                  |
| `VERIFICATION_RESUBMIT_LIMIT`    | 429  | Günlük tekrar başvuru limiti aşıldı   |
| `KVKK_CONSENT_REQUIRED`          | 422  | KVKK onayı zorunlu                    |

### 4.3 İlan Hataları

| Kod                          | HTTP | Açıklama                                        |
|------------------------------|------|-------------------------------------------------|
| `LISTING_NOT_FOUND`          | 404  | İlan bulunamadı                                 |
| `LISTING_NOT_OWNED`          | 403  | Bu ilan size ait değil                          |
| `LISTING_NOT_ACTIVE`         | 422  | İlan aktif değil                                |
| `LISTING_SUSPENDED`          | 403  | İlan admin tarafından askıya alındı             |
| `LISTING_IMAGE_LIMIT`        | 422  | Maksimum fotoğraf sayısına ulaşıldı (10)        |
| `LISTING_PUBLISH_NO_IMAGE`   | 422  | Yayınlamak için en az 1 fotoğraf gerekli        |
| `LISTING_EXPIRED`            | 422  | İlan süresi dolmuş, önce yenileme gerekli       |

### 4.4 Teklif Hataları

| Kod                              | HTTP | Açıklama                                    |
|----------------------------------|------|---------------------------------------------|
| `OFFER_NOT_FOUND`                | 404  | Teklif bulunamadı                           |
| `OFFER_ALREADY_EXISTS`           | 409  | Bu ilana zaten teklif verdiniz              |
| `OFFER_NOT_OWNED`                | 403  | Bu teklif size ait değil                    |
| `OFFER_WITHDRAWN`                | 422  | Geri çekilmiş teklif güncellenemez          |
| `OFFER_CONTAINS_CONTACT_INFO`    | 422  | Teklif metni iletişim bilgisi içeriyor      |
| `OFFER_LISTING_NOT_ACTIVE`       | 422  | İlan aktif değil, teklif verilemez          |

### 4.5 Ödeme Hataları

| Kod                              | HTTP | Açıklama                                    |
|----------------------------------|------|---------------------------------------------|
| `PAYMENT_ALREADY_UNLOCKED`       | 409  | Bu teklif için zaten ödeme yapıldı          |
| `PAYMENT_ALREADY_PENDING`        | 409  | Ödeme işlemi devam ediyor                   |
| `PAYMENT_OFFER_WITHDRAWN`        | 422  | Geri çekilmiş teklife ödeme yapılamaz       |
| `PAYMENT_PROVIDER_ERROR`         | 503  | Ödeme servisi geçici olarak kullanılamıyor  |
| `PAYMENT_WEBHOOK_INVALID_SIG`    | 401  | Webhook imzası geçersiz                     |
| `CONTACT_NOT_UNLOCKED`           | 403  | İletişim bilgisi için önce ödeme yapılmalı  |

### 4.6 Dosya Yükleme Hataları

| Kod                              | HTTP | Açıklama                                    |
|----------------------------------|------|---------------------------------------------|
| `UPLOAD_FILE_TOO_LARGE`          | 400  | Dosya boyutu limiti aşıldı                  |
| `UPLOAD_INVALID_TYPE`            | 400  | Geçersiz dosya türü                         |
| `UPLOAD_MAGIC_BYTES_MISMATCH`    | 400  | Dosya içeriği beyan edilen türle eşleşmiyor |
| `UPLOAD_PRESIGN_EXPIRED`         | 400  | Yükleme izni süresi dolmuş                  |
| `UPLOAD_KEY_NOT_FOUND`           | 400  | Yükleme anahtarı geçersiz                   |

### 4.7 Genel Sistem Hataları

| Kod                    | HTTP | Açıklama                             |
|------------------------|------|--------------------------------------|
| `VALIDATION_ERROR`     | 400  | Giriş verisi doğrulama hatası        |
| `NOT_FOUND`            | 404  | Genel kayıt bulunamadı               |
| `FORBIDDEN`            | 403  | Genel yetki hatası                   |
| `RATE_LIMIT_EXCEEDED`  | 429  | Rate limit aşıldı                    |
| `INTERNAL_ERROR`       | 500  | Beklenmeyen sunucu hatası            |
| `SERVICE_UNAVAILABLE`  | 503  | Harici servis kullanılamıyor         |

---

## 5. NestJS Global Exception Filter

```typescript
// common/filters/global-exception.filter.ts

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = request.headers['x-request-id'] as string
      ?? `req_${randomUUID().replace(/-/g, '').slice(0, 20)}`;

    let statusCode = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
    let details: unknown[] | undefined;

    if (exception instanceof AppException) {
      // Özel uygulama hataları
      statusCode = exception.statusCode;
      code = exception.code;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse() as any;
      code = res.code ?? this.httpStatusToCode(statusCode);
      message = res.message ?? exception.message;

      // class-validator hataları
      if (Array.isArray(res.message)) {
        code = 'VALIDATION_ERROR';
        message = 'Gönderilen veriler geçersiz.';
        details = res.message.map(this.formatValidationError);
      }
    } else if (exception instanceof QueryFailedError) {
      // TypeORM unique constraint
      if ((exception as any).code === '23505') {
        statusCode = 409;
        code = 'CONFLICT';
        message = 'Bu kayıt zaten mevcut.';
      }
    }

    // Production'da 5xx'lerin detayını gizle
    const isInternalError = statusCode >= 500;
    if (isInternalError && process.env.NODE_ENV === 'production') {
      // Stack trace'i loga yaz, kullanıcıya gösterme
      this.logger.error({
        requestId,
        path: request.url,
        method: request.method,
        statusCode,
        exception: exception instanceof Error ? {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        } : String(exception),
      });

      // Sentry'ye gönder
      Sentry.withScope(scope => {
        scope.setTag('requestId', requestId);
        scope.setContext('request', {
          url: request.url,
          method: request.method,
          userId: request.user?.id,
        });
        Sentry.captureException(exception);
      });
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        statusCode,
        requestId,
        ...(details ? { details } : {}),
      },
    });
  }
}
```

---

## 6. AppException Sınıfı

Tüm iş mantığı hataları bu sınıftan türetilir:

```typescript
// common/exceptions/app.exception.ts

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    statusCode: number = 422,
  ) {
    super({ code, message }, statusCode);
    this.statusCode = statusCode;
  }

  readonly statusCode: number;
}

// Kullanım örnekleri:
export class OfferContainsContactInfoException extends AppException {
  constructor() {
    super(
      'OFFER_CONTAINS_CONTACT_INFO',
      'Teklif metninizde iletişim bilgisi tespit edildi.',
      422,
    );
  }
}

export class PaymentAlreadyUnlockedException extends AppException {
  constructor() {
    super(
      'PAYMENT_ALREADY_UNLOCKED',
      'Bu teklif için zaten ödeme yapıldı.',
      409,
    );
  }
}
```

---

## 7. Request ID Yönetimi

Her istek için benzersiz ID atanır ve response'a eklenir:

```typescript
// common/middleware/request-id.middleware.ts

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string
    ?? `req_${randomUUID().replace(/-/g, '').slice(0, 20)}`;

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  next();
}
```

**Değer:** Kullanıcı destek bildirdiğinde "X-Request-Id: req_abc123"
verirse log'da tam akışı tek sorguda bulunabilir.

---

## 8. Yapılandırılmış Log Formatı

Tüm loglar JSON formatında yazılır:

```json
{
  "timestamp": "2026-07-01T10:30:00.000Z",
  "level": "error",
  "requestId": "req_01J4XYZ",
  "userId": "uuid-or-null",
  "method": "POST",
  "path": "/v1/payments/initiate",
  "statusCode": 503,
  "durationMs": 2341,
  "service": "PaymentsService",
  "action": "initiatePayment",
  "error": {
    "name": "IyzicoServiceError",
    "message": "Connection timeout after 2000ms",
    "stack": "..."
  }
}
```

**Loglanmayacak alanlar:**
`password`, `passwordHash`, `tcNumber`, `token`, `refreshToken`,
`cardNumber`, `cvv`, `providerPayload`

---

## 9. Retry Stratejisi

### 9.1 Iyzico API

```typescript
// Üstel geri çekilme (exponential backoff)
const iyzicoRetryConfig = {
  retries: 3,
  factor: 2,
  minTimeout: 1000,   // 1 saniye
  maxTimeout: 8000,   // 8 saniye
  retryableErrors: [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED',
  ],
  retryableStatusCodes: [429, 502, 503, 504],
};

// Denemeler: 1s → 2s → 4s → hata
```

### 9.2 E-posta Gönderimi (Bull Queue)

```typescript
// Bull queue retry konfigürasyonu
const emailQueueOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000,    // 5s → 10s → 20s
  },
  removeOnComplete: 100,  // Son 100 tamamlanan job'ı sakla
  removeOnFail: 50,       // Son 50 başarısız job'ı sakla (debug için)
};
```

### 9.3 Webhook İşleme

Webhook `PENDING` kalırsa Iyzico kendi retry mekanizmasını çalıştırır
(15dk aralıklarla 3 kez). Backend idempotent olduğundan çift işleme riski yok.

---

## 10. Frontend Hata Yönetimi

### 10.1 React Query Error Boundary

```typescript
// lib/api/query-client.ts

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 4xx hatalarda retry yok
        if (error instanceof ApiError && error.statusCode < 500) return false;
        return failureCount < 2;
      },
      staleTime: 2 * 60 * 1000,
    },
    mutations: {
      onError: (error) => {
        if (error instanceof ApiError) {
          // 401 → login sayfasına yönlendir
          if (error.statusCode === 401) {
            authStore.getState().logout();
            router.push('/login');
            return;
          }
          // 429 → rate limit toast
          if (error.statusCode === 429) {
            toast.error('Çok fazla deneme yaptınız. Lütfen bekleyin.');
            return;
          }
        }
        // Diğer hatalar için genel toast
        toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
      },
    },
  },
});
```

### 10.2 Hata Kodu → Kullanıcı Mesajı Haritası

```typescript
// lib/errors/error-messages.ts

export const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS:      'E-posta veya şifreniz hatalı.',
  AUTH_EMAIL_NOT_VERIFIED:       'E-posta adresinizi doğrulamanız gerekiyor.',
  AUTH_ACCOUNT_PENDING:          'Hesabınız onay bekliyor.',
  AUTH_ACCOUNT_REJECTED:         'Hesabınız onaylanmadı. Detay için destek@muteahitt.com',
  AUTH_ACCOUNT_SUSPENDED:        'Hesabınız askıya alındı. Destek için destek@muteahitt.com',
  OFFER_ALREADY_EXISTS:          'Bu ilana zaten teklif verdiniz.',
  OFFER_CONTAINS_CONTACT_INFO:   'Teklif metninizde iletişim bilgisi bulunamaz.',
  PAYMENT_ALREADY_UNLOCKED:      'Bu müteahhidin iletişim bilgisi zaten açık.',
  PAYMENT_PROVIDER_ERROR:        'Ödeme servisi şu an erişilemiyor. Lütfen birkaç dakika sonra tekrar deneyin.',
  LISTING_IMAGE_LIMIT:           'Bir ilana en fazla 10 fotoğraf ekleyebilirsiniz.',
  UPLOAD_FILE_TOO_LARGE:         'Dosya boyutu 2MB limitini aşıyor.',
  UPLOAD_INVALID_TYPE:           'Bu dosya türü desteklenmiyor.',
  RATE_LIMIT_EXCEEDED:           'Çok fazla işlem yaptınız. Lütfen biraz bekleyin.',
  INTERNAL_ERROR:                'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
};

export function getErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.INTERNAL_ERROR;
}
```

---

## 11. Kritik Hata Akışları

### 11.1 Ödeme Başarılı ama Callback Gelmedi

```
Kullanıcı ödedi → Callback timeout
      │
      ▼
Frontend: "Ödemeniz onaylanıyor..." loading ekranı
(5 saniye polling: GET /payments/{id}/status)
      │
      ▼
Webhook 30 saniye içinde gelirse:
  → contact_unlock oluştu → sayfa yenilenir → bilgi açılır

Webhook 30 saniye içinde gelmezse:
  → "Ödemeniz alındı, iletişim bilgisi birkaç dakika içinde açılacak."
  → Kullanıcı e-posta bildirimi alır (webhook geldiğinde)

Webhook 30 dakika sonra hâlâ gelmezse:
  → Admin'e alert → Manuel inceleme
```

### 11.2 Iyzico Servis Kesintisi

```
Iyzico DOWN
      │
      ▼
POST /payments/initiate
  → Iyzico'ya bağlanılamıyor
  → 3 retry (exponential backoff, max 8 sn)
  → Hâlâ başarısız
  → 503 SERVICE_UNAVAILABLE döner
      │
      ▼
Frontend: "Ödeme servisi şu an erişilemiyor.
           Lütfen birkaç dakika sonra tekrar deneyin."

Sentry: alert tetiklenir
Admin: e-posta bildirimi
```
