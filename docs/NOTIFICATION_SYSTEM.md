# NOTIFICATION_SYSTEM.md — Bildirim Sistemi

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Mimari Genel Bakış

```
Olay kaynağı (Service katmanı)
        │
        ▼
NotificationService.dispatch(event)
        │
        ├─── In-App Bildirim → PostgreSQL (notifications tablosu)
        │                   → WebSocket push (bağlı kullanıcıya anlık)
        │
        └─── E-posta Bildirim → Bull Queue (email-queue)
                             → Resend API
                             → Kullanıcı e-posta kutusu
```

**İki kanal, iki altyapı:**
- **In-app:** Anlık, veritabanı kayıtlı, kullanıcı okuyabilir/silebilir
- **E-posta:** Asenkron, Bull Queue üzerinden, Resend ile gönderim

E-posta gönderimi asla HTTP isteğinin içinde yapılmaz.
Servis job ekler → queue işler → gönderim gerçekleşir.
Böylece Resend geçici olarak erişilemez olsa bile iş akışı durmaz.

---

## 2. Bildirim Olayları Kataloğu

### 2.1 Arsa Sahibi (LAND_OWNER) Bildirimleri

| Olay                        | In-App | E-posta | Tetikleyen                        |
|-----------------------------|--------|---------|-----------------------------------|
| İlana yeni teklif geldi     | ✅     | ✅      | Müteahhit teklif verdiğinde       |
| Teklifin durumu değişti     | ✅     | ❌      | (Bilgi amaçlı, e-posta gereksiz)  |
| Hesap onaylandı             | ✅     | ✅      | Admin onayladığında               |
| Hesap reddedildi            | ✅     | ✅      | Admin reddettiğinde               |
| Ek belge istendi            | ✅     | ✅      | Admin ek belge talep ettiğinde    |
| İletişim bilgisi açıldı     | ✅     | ✅      | Ödeme tamamlandığında             |
| İlan süresi doluyor (3 gün) | ✅     | ✅      | Cron job (günlük kontrol)         |
| İlan süresi doldu           | ✅     | ✅      | Cron job                          |

### 2.2 Müteahhit (CONTRACTOR) Bildirimleri

| Olay                             | In-App | E-posta | Tetikleyen                        |
|----------------------------------|--------|---------|-----------------------------------|
| Hesap onaylandı                  | ✅     | ✅      | Admin onayladığında               |
| Hesap reddedildi                 | ✅     | ✅      | Admin reddettiğinde               |
| Ek belge istendi                 | ✅     | ✅      | Admin ek belge talep ettiğinde    |
| İletişim bilgin görüntülendi     | ✅     | ❌      | Arsa sahibi ödeme yaptığında      |
| Yeni ilana yakın ilan yayınlandı | ✅     | ❌      | (v2 — tercih tabanlı)             |

### 2.3 Sistem Bildirimleri (her iki rol)

| Olay                    | In-App | E-posta | Tetikleyen                  |
|-------------------------|--------|---------|-----------------------------|
| E-posta doğrulama       | ❌     | ✅      | Kayıt sonrası               |
| Şifre sıfırlama         | ❌     | ✅      | Kullanıcı talep ettiğinde   |
| Hesap kısıtlandı        | ✅     | ✅      | Admin kısıtladığında        |
| Yeni mesaj alındı       | ✅     | ❌      | Chat mesajı geldiğinde      |

---

## 3. Veritabanı — notifications Tablosu

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(80) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,                    -- Bağlantı ve metadata
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- updated_at yok: bildirimler güncellenmez
);

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
```

**`data` alanı örnekleri:**

```json
{ "type": "NEW_OFFER", "listingId": "uuid", "offerId": "uuid" }
{ "type": "ACCOUNT_APPROVED" }
{ "type": "CONTACT_UNLOCKED", "offerId": "uuid", "buyerId": "uuid" }
{ "type": "LISTING_EXPIRING", "listingId": "uuid", "expiresAt": "2026-07-04T00:00:00Z" }
```

---

## 4. NotificationService

```typescript
// notifications/notification.service.ts

export type NotificationEvent =
  | { type: 'NEW_OFFER';           userId: string; listingId: string; offerId: string; offerTitle: string }
  | { type: 'ACCOUNT_APPROVED';    userId: string; role: UserRole }
  | { type: 'ACCOUNT_REJECTED';    userId: string; reason: string }
  | { type: 'EXTRA_DOCS_REQUIRED'; userId: string; note: string }
  | { type: 'CONTACT_UNLOCKED';    contractorId: string; offerId: string; buyerName: string }
  | { type: 'LISTING_EXPIRING';    userId: string; listingId: string; listingTitle: string; daysLeft: number }
  | { type: 'LISTING_EXPIRED';     userId: string; listingId: string; listingTitle: string }
  | { type: 'PAYMENT_COMPLETED';   userId: string; offerId: string; contractorName: string };

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectQueue('email') private emailQueue: Queue,
    private readonly wsGateway: NotificationsGateway,
  ) {}

  async dispatch(event: NotificationEvent): Promise<void> {
    const payload = this.buildPayload(event);

    // 1. Veritabanına kaydet
    const notification = await this.notifRepo.save({
      userId: payload.userId,
      type: event.type,
      title: payload.title,
      body: payload.body,
      data: payload.data,
    });

    // 2. WebSocket ile anlık bildirim gönder (bağlıysa)
    this.wsGateway.sendToUser(payload.userId, {
      event: 'notification',
      data: notification,
    });

    // 3. E-posta gerekiyorsa kuyruğa ekle
    if (payload.email) {
      await this.emailQueue.add('send-notification-email', {
        to: payload.email.to,
        template: payload.email.template,
        variables: payload.email.variables,
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }
  }
}
```

---

## 5. Bildirim Payload'ları

```typescript
// notifications/notification.payloads.ts

private buildPayload(event: NotificationEvent): NotificationPayload {
  switch (event.type) {

    case 'NEW_OFFER':
      return {
        userId: event.userId,
        title: 'Yeni Teklif Aldınız',
        body: `"${event.offerTitle}" ilanınıza yeni bir teklif geldi.`,
        data: { type: 'NEW_OFFER', listingId: event.listingId, offerId: event.offerId },
        email: {
          to: /* user email from DB */,
          template: 'new-offer',
          variables: { offerTitle: event.offerTitle, listingId: event.listingId },
        },
      };

    case 'ACCOUNT_APPROVED':
      return {
        userId: event.userId,
        title: 'Hesabınız Onaylandı',
        body: 'Hesabınız doğrulandı. Artık tüm özelliklere erişebilirsiniz.',
        data: { type: 'ACCOUNT_APPROVED' },
        email: {
          to: /* user email */,
          template: 'account-approved',
          variables: { role: event.role },
        },
      };

    case 'ACCOUNT_REJECTED':
      return {
        userId: event.userId,
        title: 'Hesap Doğrulaması Reddedildi',
        body: event.reason,
        data: { type: 'ACCOUNT_REJECTED' },
        email: {
          to: /* user email */,
          template: 'account-rejected',
          variables: { reason: event.reason },
        },
      };

    case 'EXTRA_DOCS_REQUIRED':
      return {
        userId: event.userId,
        title: 'Ek Belge Gerekmektedir',
        body: event.note,
        data: { type: 'EXTRA_DOCS_REQUIRED' },
        email: {
          to: /* user email */,
          template: 'extra-docs-required',
          variables: { note: event.note },
        },
      };

    case 'CONTACT_UNLOCKED':
      return {
        userId: event.contractorId,
        title: 'İletişim Bilginiz Görüntülendi',
        body: `${event.buyerName} teklifinizi inceledi ve iletişim bilgilerinize erişti.`,
        data: { type: 'CONTACT_UNLOCKED', offerId: event.offerId },
        // E-posta gönderilmez — arsa sahibine sms yoksa değeri düşük
      };

    case 'LISTING_EXPIRING':
      return {
        userId: event.userId,
        title: `İlanınız ${event.daysLeft} Gün İçinde Dolacak`,
        body: `"${event.listingTitle}" ilanınızın süresi ${event.daysLeft} gün içinde dolacak. Uzatmak ister misiniz?`,
        data: { type: 'LISTING_EXPIRING', listingId: event.listingId },
        email: {
          to: /* user email */,
          template: 'listing-expiring',
          variables: { listingTitle: event.listingTitle, daysLeft: event.daysLeft },
        },
      };

    case 'PAYMENT_COMPLETED':
      return {
        userId: event.userId,
        title: 'İletişim Bilgisi Açıldı',
        body: `${event.contractorName} müteahhidinin iletişim bilgilerine erişebilirsiniz.`,
        data: { type: 'PAYMENT_COMPLETED', offerId: event.offerId },
        email: {
          to: /* user email */,
          template: 'payment-completed',
          variables: { contractorName: event.contractorName, offerId: event.offerId },
        },
      };
  }
}
```

---

## 6. E-posta Şablonları (React Email)

### 6.1 Şablon Yapısı

```
packages/emails/
  src/
    templates/
      account-approved.tsx
      account-rejected.tsx
      extra-docs-required.tsx
      new-offer.tsx
      listing-expiring.tsx
      payment-completed.tsx
      email-verification.tsx
      password-reset.tsx
    components/
      Header.tsx         ← Logo + marka rengi
      Footer.tsx         ← Adres + KVKK metni + abonelik iptali
      Button.tsx         ← CTA butonu
    utils/
      render.ts          ← renderToStaticMarkup wrapper
```

### 6.2 Örnek Şablon — Yeni Teklif

```tsx
// packages/emails/src/templates/new-offer.tsx

import {
  Body, Button, Container, Head, Heading,
  Html, Preview, Section, Text
} from '@react-email/components';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

interface NewOfferEmailProps {
  recipientName: string;
  offerTitle: string;
  listingUrl: string;
}

export function NewOfferEmail({ recipientName, offerTitle, listingUrl }: NewOfferEmailProps) {
  return (
    <Html lang="tr">
      <Head />
      <Preview>İlanınıza yeni bir teklif geldi</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Inter, sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Header />
          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '8px' }}>
            <Heading style={{ color: '#111827', fontSize: '24px' }}>
              Yeni Teklif Aldınız
            </Heading>
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              Sayın {recipientName},
            </Text>
            <Text style={{ color: '#374151', lineHeight: '1.6' }}>
              <strong>{offerTitle}</strong> ilanınıza yeni bir teklif geldi.
              Teklifi incelemek için aşağıdaki bağlantıya tıklayın.
            </Text>
            <Button
              href={listingUrl}
              style={{
                backgroundColor: '#f97316',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                fontWeight: 'bold',
              }}
            >
              Teklifi İncele
            </Button>
          </Section>
          <Footer />
        </Container>
      </Body>
    </Html>
  );
}
```

### 6.3 Zorunlu Footer İçeriği (KVKK)

Her e-posta footer'ında bulunması zorunlu:

```
müteahitt.com | [Şirket Adresi]
Bu e-postayı aldınız çünkü muteahitt.com'a kayıt oldunuz.
E-posta bildirimlerini durdurmak için: [Abonelik iptali linki]
Kişisel verileriniz hakkında bilgi: muteahitt.com/kvkk
```

---

## 7. Resend Entegrasyonu

```typescript
// email/email.service.ts
import { Resend } from 'resend';
import { renderAsync } from '@react-email/render';

@Injectable()
export class EmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);

  async send(dto: SendEmailDto): Promise<void> {
    const { to, template, variables } = dto;

    const html = await this.renderTemplate(template, variables);

    await this.resend.emails.send({
      from: 'müteahitt <bildirim@muteahitt.com>',
      to,
      subject: EMAIL_SUBJECTS[template],
      html,
    });
  }

  private async renderTemplate(template: string, variables: Record<string, unknown>) {
    const Component = TEMPLATE_MAP[template];
    return renderAsync(<Component {...variables} />);
  }
}

const EMAIL_SUBJECTS: Record<string, string> = {
  'account-approved':      'Hesabınız Onaylandı — müteahitt',
  'account-rejected':      'Hesap Doğrulaması Hakkında — müteahitt',
  'extra-docs-required':   'Ek Belge Gerekmektedir — müteahitt',
  'new-offer':             'İlanınıza Yeni Teklif Geldi — müteahitt',
  'listing-expiring':      'İlanınızın Süresi Doluyor — müteahitt',
  'listing-expired':       'İlanınızın Süresi Doldu — müteahitt',
  'payment-completed':     'İletişim Bilgisi Açıldı — müteahitt',
  'email-verification':    'E-posta Adresinizi Doğrulayın — müteahitt',
  'password-reset':        'Şifre Sıfırlama — müteahitt',
};
```

---

## 8. Bull Queue — E-posta Kuyruğu

```typescript
// email/email.processor.ts
@Processor('email')
export class EmailProcessor {
  constructor(private emailService: EmailService) {}

  @Process('send-notification-email')
  async handleNotificationEmail(job: Job<SendEmailDto>) {
    await this.emailService.send(job.data);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    // Son denemede de başarısız olursa Sentry'ye gönder
    if (job.attemptsMade >= job.opts.attempts) {
      Sentry.captureException(error, {
        extra: { jobId: job.id, template: job.data.template, to: job.data.to },
      });
    }
  }
}
```

**Queue konfigürasyonu:**

```typescript
BullModule.registerQueue({
  name: 'email',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})
```

---

## 9. WebSocket — Anlık In-App Bildirim

```typescript
// notifications/notifications.gateway.ts

@WebSocketGateway({ namespace: '/notifications', cors: { origin: process.env.WEB_URL } })
export class NotificationsGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  private userSockets = new Map<string, Set<string>>(); // userId → socketId[]

  handleConnection(socket: Socket) {
    const userId = this.extractUserId(socket); // JWT doğrulama
    if (!userId) { socket.disconnect(); return; }

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    socket.on('disconnect', () => {
      this.userSockets.get(userId)?.delete(socket.id);
    });
  }

  sendToUser(userId: string, payload: unknown) {
    const socketIds = this.userSockets.get(userId);
    if (!socketIds?.size) return; // Kullanıcı bağlı değil, sadece DB kaydı yeterli

    socketIds.forEach(socketId => {
      this.server.to(socketId).emit('notification', payload);
    });
  }
}
```

**Multi-instance notu:** Railway'de yatay ölçeklemede
her instance farklı socket bağlantılarını tutar.
Redis Pub/Sub ile instance'lar arası mesaj iletimi gerekir.
Detay: bkz. ARCHITECTURE.md §WebSocket.

---

## 10. API Endpoint'leri

```
GET  /v1/notifications              → Bildirim listesi (sayfalı, son 50)
GET  /v1/notifications/unread-count → Okunmamış sayısı (badge için)
POST /v1/notifications/:id/read     → Tek bildirimi okundu işaretle
POST /v1/notifications/read-all     → Tümünü okundu işaretle
DEL  /v1/notifications/:id          → Bildirimi sil
```

**Response örneği — liste:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "NEW_OFFER",
        "title": "Yeni Teklif Aldınız",
        "body": "\"Kadıköy Arsa\" ilanınıza yeni bir teklif geldi.",
        "data": { "listingId": "uuid", "offerId": "uuid" },
        "isRead": false,
        "createdAt": "2026-07-01T10:00:00Z"
      }
    ],
    "unreadCount": 3,
    "total": 47
  }
}
```

---

## 11. Bildirim Tercihleri (v2)

MVP'de kullanıcıların tüm bildirimleri açıktır.
v2'de tercih tablosu:

```sql
CREATE TABLE notification_preferences (
  user_id          UUID PRIMARY KEY REFERENCES users(id),
  new_offer_email  BOOLEAN DEFAULT true,
  listing_expiry_email BOOLEAN DEFAULT true,
  marketing_email  BOOLEAN DEFAULT false,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

**KVKK notu:** Pazarlama e-postaları için ayrı açık rıza alınmalıdır.
Zorunlu işlem bildirimleri (şifre sıfırlama, hesap durumu) vazgeçilmezdir,
tercih tablosundan etkilenmez.

---

## 12. Cron Job — İlan Süresi Bildirimleri

```typescript
// scheduler/listing-expiry.cron.ts

@Cron('0 9 * * *') // Her gün 09:00
async notifyExpiringListings() {
  const threeDaysLater = addDays(new Date(), 3);

  const expiringListings = await this.listingRepo.find({
    where: {
      status: 'ACTIVE',
      expiresAt: Between(startOfDay(threeDaysLater), endOfDay(threeDaysLater)),
    },
    relations: ['owner'],
  });

  for (const listing of expiringListings) {
    await this.notificationService.dispatch({
      type: 'LISTING_EXPIRING',
      userId: listing.owner.id,
      listingId: listing.id,
      listingTitle: listing.title,
      daysLeft: 3,
    });
  }
}
```

---

## 13. Ölçekleme Notu

| Metrik              | MVP Hedef    | Ölçekleme Eşiği  | Çözüm                        |
|---------------------|--------------|------------------|------------------------------|
| E-posta/gün         | < 1.000      | > 10.000/gün     | Resend plan yükseltme        |
| In-app bildirim/sn  | < 10         | > 100/sn         | Redis Pub/Sub aktif et       |
| Kuyruk derinliği    | < 100        | > 1.000          | Queue concurrency artır      |
| WebSocket bağlantı  | < 500        | > 2.000          | Sticky sessions veya Redis   |

Resend ücretsiz plan: **3.000 e-posta/ay**.
MVP için yeterli; büyümede Pro plan ($20/ay, 50k e-posta) geçiş yapılır.
