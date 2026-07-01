# CHAT_SYSTEM.md — Mesajlaşma Sistemi

Sürüm: 1.0  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Kapsam ve Kısıtlamalar

### 1.1 MVP (v1.0) — Kapsam Dışı

Chat sistemi MVP'de yoktur. Gerekçe:
- Ödeme modelini tehdit eder: iletişim bilgisi satın alınmadan chat açılırsa
  gelir modeli çöker
- Implementasyon karmaşıklığı yüksek (WebSocket, mesaj geçmişi, bildirimler)
- İlk kullanıcılar e-posta/telefon yeterliliği ile başlayabilir

### 1.2 v1.5 — Chat Açılma Koşulu

Chat **yalnızca** arsa sahibi iletişim bilgisi için ödeme yaptıktan sonra açılır.

```
contact_unlock oluştu
        │
        ▼
Bu offer'a bağlı conversation otomatik oluşturulur
  conversation.status = ACTIVE
  conversation.unlock_id = contact_unlock.id
        │
        ▼
Taraflar artık mesajlaşabilir
```

Bu kural chat sisteminin temelini oluşturur; hiçbir bypass kabul edilmez.

---

## 2. Veri Modeli

```sql
CREATE TABLE conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        UUID NOT NULL REFERENCES offers(id),
  land_owner_id   UUID NOT NULL REFERENCES users(id),
  contractor_id   UUID NOT NULL REFERENCES users(id),
  unlock_id       UUID NOT NULL REFERENCES contact_unlocks(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
                  -- ACTIVE | CLOSED | ARCHIVED
  last_message_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(offer_id)   -- Bir offer için tek conversation
);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id       UUID NOT NULL REFERENCES users(id),
  content         TEXT NOT NULL,
  content_type    VARCHAR(20) NOT NULL DEFAULT 'TEXT',
                  -- TEXT | IMAGE | FILE
  file_url        TEXT,               -- content_type != TEXT ise
  is_read         BOOLEAN NOT NULL DEFAULT false,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- Mesajlar silinemez, düzenlenemez (audit güvenliği)
);

CREATE INDEX idx_messages_conversation_created
  ON messages(conversation_id, created_at ASC);

CREATE INDEX idx_conversations_land_owner
  ON conversations(land_owner_id, last_message_at DESC);

CREATE INDEX idx_conversations_contractor
  ON conversations(contractor_id, last_message_at DESC);
```

**Tasarım kararları:**
- Mesajlar değiştirilemez ve silinemez: hukuki anlaşmazlıklarda kanıt niteliği
- Her offer için en fazla bir conversation: UNIQUE kısıtı
- `last_message_at` denormalizasyonu: konuşma listesi sıralaması için

---

## 3. Mimari

```
Tarayıcı (Socket.IO client)
        │
        │  WebSocket (wss://)
        ▼
NestJS — ChatGateway (Socket.IO server)
        │
        ├── Mesaj kaydet → PostgreSQL
        ├── Conversation güncelle → last_message_at
        │
        └── Redis Pub/Sub
              │
              ├── Instance 1 (Railway pod 1)
              └── Instance 2 (Railway pod 2)
                        │
                        └── Hedef kullanıcı bu instance'a bağlıysa ilet
```

### 3.1 Neden Redis Pub/Sub?

Railway yatay ölçeklemesinde birden fazla API instance çalışır.
Kullanıcı A instance-1'e, Kullanıcı B instance-2'ye bağlıysa
A'nın gönderdiği mesaj Redis aracılığıyla instance-2'ye iletilir.

```typescript
// Mesaj geldiğinde:
// 1. PostgreSQL'e kaydet
// 2. Redis channel'a yayınla: chat:conversation:{conversationId}
// 3. Tüm instance'lar dinler
// 4. Hedef kullanıcıya bağlı instance socket'e gönderir
```

---

## 4. ChatGateway

```typescript
// chat/chat.gateway.ts

@WebSocketGateway({ namespace: '/chat', cors: { origin: process.env.WEB_URL } })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private chatService: ChatService,
    private redisService: RedisService,
  ) {}

  async handleConnection(socket: Socket) {
    const userId = await this.authenticate(socket);
    if (!userId) { socket.disconnect(); return; }

    socket.data.userId = userId;

    // Kullanıcının aktif konuşmalarına abone et
    const conversationIds = await this.chatService.getUserConversationIds(userId);
    conversationIds.forEach(id => socket.join(`conv:${id}`));
  }

  handleDisconnect(socket: Socket) {
    // Socket.IO otomatik room'lardan çıkarır
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    socket: Socket,
    payload: { conversationId: string; content: string; contentType?: string },
  ) {
    const senderId = socket.data.userId;

    // Yetki kontrolü: Bu konuşmaya erişim var mı?
    const conversation = await this.chatService.verifyAccess(
      payload.conversationId, senderId
    );
    if (!conversation) {
      socket.emit('error', { code: 'CONVERSATION_ACCESS_DENIED' });
      return;
    }

    // İçerik filtresi
    const filtered = this.chatService.filterContent(payload.content);
    if (filtered.blocked) {
      socket.emit('error', { code: 'MESSAGE_CONTAINS_CONTACT_INFO' });
      return;
    }

    // Mesajı kaydet
    const message = await this.chatService.saveMessage({
      conversationId: payload.conversationId,
      senderId,
      content: filtered.content,
      contentType: payload.contentType ?? 'TEXT',
    });

    // Room'daki herkese gönder (Redis Pub/Sub üzerinden multi-instance)
    this.server.to(`conv:${payload.conversationId}`).emit('newMessage', message);
  }

  @SubscribeMessage('markRead')
  async handleMarkRead(
    socket: Socket,
    payload: { conversationId: string; lastReadAt: string },
  ) {
    const userId = socket.data.userId;
    await this.chatService.markRead(payload.conversationId, userId, payload.lastReadAt);
  }
}
```

---

## 5. ChatService

```typescript
// chat/chat.service.ts

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private convRepo: Repository<Conversation>,
    @InjectRepository(Message) private msgRepo: Repository<Message>,
  ) {}

  async verifyAccess(conversationId: string, userId: string): Promise<Conversation | null> {
    return this.convRepo.findOne({
      where: [
        { id: conversationId, landOwnerId: userId, status: 'ACTIVE' },
        { id: conversationId, contractorId: userId, status: 'ACTIVE' },
      ],
    });
  }

  async saveMessage(dto: SaveMessageDto): Promise<Message> {
    const message = await this.msgRepo.save({
      conversationId: dto.conversationId,
      senderId: dto.senderId,
      content: dto.content,
      contentType: dto.contentType,
    });

    // Conversation last_message_at güncelle
    await this.convRepo.update(
      { id: dto.conversationId },
      { lastMessageAt: message.createdAt }
    );

    return message;
  }

  filterContent(content: string): { blocked: boolean; content: string } {
    // Chat'te de iletişim bilgisi paylaşımı engellenir
    // (Ödeme yapıldıktan sonra açık iletişim var, chat filtresiz olabilir)
    // v1.5'te filtre aktif değil — taraflar zaten iletişim bilgisine sahip
    return { blocked: false, content };
  }

  async createConversationForUnlock(unlock: ContactUnlock): Promise<Conversation> {
    const existing = await this.convRepo.findOne({
      where: { offerId: unlock.offerId }
    });
    if (existing) return existing; // Idempotent

    const offer = await unlock.offer; // relation
    return this.convRepo.save({
      offerId: unlock.offerId,
      landOwnerId: unlock.buyerId,
      contractorId: offer.contractorId,
      unlockId: unlock.id,
    });
  }
}
```

---

## 6. REST API Endpoint'leri

WebSocket mesajlaşma için; sayfalama, geçmiş yükleme ve conversation listesi
REST üzerinden sunulur:

```
GET  /v1/chat/conversations              → Konuşma listesi (son mesaj dahil)
GET  /v1/chat/conversations/:id          → Konuşma detayı
GET  /v1/chat/conversations/:id/messages → Mesaj geçmişi (cursor tabanlı)
POST /v1/chat/conversations/:id/read     → Okundu işaretle
```

### 6.1 Mesaj Geçmişi (Cursor Tabanlı Pagination)

Mesaj geçmişi için offset pagination kullanılmaz.
Yukarı kaydırıldıkça eski mesajlar yüklenir (cursor tabanlı):

```
GET /v1/chat/conversations/:id/messages?before=<messageId>&limit=50

Response:
{
  "items": [...],  // Eski → Yeni sıralı, limit kadar
  "hasMore": true,
  "nextCursor": "<oldest-message-id-in-response>"
}
```

---

## 7. Okunmamış Mesaj Sayısı

Navbar'daki chat badge için:

```typescript
// GET /v1/chat/unread-count
// Response: { "unreadCount": 3 }

async getUnreadCount(userId: string): Promise<number> {
  const result = await this.msgRepo
    .createQueryBuilder('msg')
    .innerJoin('msg.conversation', 'conv')
    .where('msg.sender_id != :userId', { userId })
    .andWhere('msg.is_read = false')
    .andWhere(
      '(conv.land_owner_id = :userId OR conv.contractor_id = :userId)',
      { userId }
    )
    .getCount();

  return result;
}
```

Redis'te cache'lenir (TTL: 30 saniye) — her sayfa yüklemesinde sorgu atılmaz.

---

## 8. Güvenlik

### 8.1 Socket Kimlik Doğrulama

```typescript
private async authenticate(socket: Socket): Promise<string | null> {
  const token = socket.handshake.auth?.token
    ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) return null;

  try {
    const payload = this.jwtService.verify(token);
    // Kullanıcı durumu kontrolü
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, status: 'ACTIVE' }
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}
```

### 8.2 Yetkisiz Conversation Erişimi

Her mesaj gönderiminde `verifyAccess` çağrılır.
Conversation ID tahmin edilerek başkasının konuşmasına yazılamaz.

### 8.3 Rate Limiting — WebSocket

```typescript
// Socket başına mesaj rate limit
const MESSAGE_RATE_LIMIT = {
  windowMs: 60_000,   // 1 dakika
  maxMessages: 60,    // 1 mesaj/saniye
};
```

Redis'te `ratelimit:chat:{userId}` key ile takip edilir.
Limit aşılırsa mesaj reddedilir, bağlantı kesilmez.

---

## 9. Dosya Paylaşımı (v2)

v1.5'te yalnızca metin mesajları. Dosya paylaşımı v2'de:

```
1. Kullanıcı dosya seçer
2. POST /v1/upload/presign?context=chat-file
3. Direkt R2'ye yükle
4. POST /v1/upload/confirm
5. WebSocket: sendMessage { contentType: 'FILE', fileUrl: '...' }
```

Chat dosyaları özel bucket'ta saklanır: `muteahitt-chat-docs-prod`.
Yalnızca conversation katılımcıları presigned URL ile erişebilir.

---

## 10. Ölçekleme

| Metrik                     | v1.5 Hedef | Ölçekleme Eşiği | Çözüm                        |
|----------------------------|------------|-----------------|------------------------------|
| Eşzamanlı bağlantı         | < 500      | > 2.000         | Redis Pub/Sub (zaten hazır)  |
| Mesaj/saniye               | < 50       | > 500           | Railway instance artırımı    |
| Konuşma başına mesaj geçmişi| < 1.000   | > 10.000        | Mesaj arşivleme + cold storage|
| Toplam mesaj (DB)          | < 1M       | > 10M           | Partition by conversation_id |

---

## 11. MVP → v1.5 Geçiş Planı

```
Faz 4 (MVP) tamamlandıktan sonra:

1. Hafta 1:
   - conversations ve messages tabloları migration
   - ChatModule oluştur
   - Contact unlock sonrası otomatik conversation açma

2. Hafta 2:
   - ChatGateway implementasyonu
   - Redis Pub/Sub entegrasyonu
   - Mesaj gönderme + alma (temel)

3. Hafta 3:
   - Frontend chat UI bileşeni
   - Mesaj geçmişi yükleme
   - Okunmamış sayaç + bildirim entegrasyonu

4. Hafta 4:
   - Test ve hata düzeltme
   - Rate limit fine-tuning
   - Staging'de yük testi
```
