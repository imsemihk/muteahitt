# DATABASE_SCHEMA.md — Veritabanı Şema Belgesi

Sürüm: 1.2  
Tarih: 2026-07-01  
Veritabanı: PostgreSQL 15  
ORM: Prisma

---

## Genel Kurallar

- Tüm primary key'ler `String` (UUID), `@default(uuid())` ile üretilir.
- Tüm tablolarda `createdAt` ve `updatedAt` alanları bulunur.
- Silme işlemleri soft delete ile yapılır (`deletedAt` nullable).
- Para birimleri `Decimal` tipinde, TRY cinsinden saklanır.
- Enum'lar Prisma `enum` bloğu ile tanımlanır.
- Tüm foreign key'lerde varsayılan `Restrict`; aksi belirtilir.

---

## Tablo Listesi

| #  | Model                        | Açıklama                                        |
|----|------------------------------|-------------------------------------------------|
| 1  | `User`                       | Tüm kullanıcı hesapları                         |
| 2  | `IndividualVerification`     | Bireysel kullanıcı doğrulama bilgileri          |
| 3  | `CompanyVerification`        | Şirket / müteahhit doğrulama bilgileri          |
| 4  | `VerificationDocument`       | Doğrulama belgeleri                             |
| 5  | `AuditLog`                   | Admin manuel işlem geçmişi                      |
| 6  | `Listing`                    | Arsa ilanları                                   |
| 7  | `ListingImage`               | İlana ait fotoğraflar                           |
| 8  | `ListingDocument`            | İlana ait belgeler                              |
| 9  | `Offer`                      | Müteahhit teklifleri                            |
| 10 | `Payment`                    | Ödeme kayıtları                                 |
| 11 | `ContactUnlock`              | Açılan iletişim bilgileri                       |
| 12 | `Notification`               | Kullanıcı bildirimleri                          |
| 13 | `PasswordResetToken`         | Şifre sıfırlama token'ları                      |
| 14 | `EmailVerificationToken`     | E-posta doğrulama token'ları                    |

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUM'LAR ────────────────────────────────────────────────────────────────

enum UserRole {
  LAND_OWNER
  CONTRACTOR
  ADMIN
}

enum UserType {
  INDIVIDUAL
  COMPANY
}

enum UserStatus {
  PENDING_EMAIL
  PENDING_APPROVAL
  RESTRICTED
  ACTIVE
  REJECTED
  SUSPENDED
}

enum VerificationDocumentType {
  ID_CARD_FRONT
  ID_CARD_BACK
  TAX_CERTIFICATE
  TRADE_REGISTRY_GAZETTE
  SIGNATURE_CIRCULAR
  ACTIVITY_CERTIFICATE
  OTHER
}

enum AuditEntityType {
  USER
  LISTING
  OFFER
  PAYMENT
  CONTACT_UNLOCK
  VERIFICATION_DOCUMENT
}

enum AuditAction {
  USER_APPROVED
  USER_REJECTED
  USER_SUSPENDED
  USER_ACTIVATED
  USER_RESTRICTED
  USER_ROLE_CHANGED
  USER_STATUS_CHANGED
  USER_FIELD_EDITED
  USER_EXTRA_DOCUMENT_REQUESTED
  LISTING_SUSPENDED
  LISTING_ACTIVATED
  LISTING_DELETED
  LISTING_FIELD_EDITED
  OFFER_WITHDRAWN
  OFFER_FIELD_EDITED
  PAYMENT_REFUNDED
  PAYMENT_STATUS_CHANGED
  CONTACT_UNLOCK_GRANTED
  CONTACT_UNLOCK_REVOKED
}

enum ListingStatus {
  DRAFT
  ACTIVE
  PASSIVE
  SOLD
  SUSPENDED
}

enum DealType {
  KAT_KARSILIGI
  NAKIT_DAIRE
  NAKIT
  NEGOTIABLE
}

enum ZoningType {
  RESIDENTIAL
  COMMERCIAL
  MIXED
  INDUSTRIAL
  OTHER
}

enum OfferModel {
  KAT_KARSILIGI
  NAKIT_DAIRE
  NAKIT
}

enum OfferStatus {
  PENDING
  WITHDRAWN
  SHORTLISTED
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
}

enum NotificationType {
  NEW_OFFER
  OFFER_WITHDRAWN
  CONTACT_UNLOCKED
  PAYMENT_SUCCESS
  PAYMENT_FAILED
  VERIFICATION_APPROVED
  VERIFICATION_REJECTED
  VERIFICATION_EXTRA_DOCUMENT
  LISTING_EXPIRING
  ACCOUNT_RESTRICTED
  ANNOUNCEMENT
}

enum CompanyType {
  LIMITED
  ANONIM
  SAHIS
  KOMANDIT
  OTHER
}

// ─── MODELLER ────────────────────────────────────────────────────────────────

model User {
  id               String     @id @default(uuid())
  email            String     @unique
  passwordHash     String
  role             UserRole
  userType         UserType
  fullName         String
  phone            String?
  avatarUrl        String?
  status           UserStatus @default(PENDING_EMAIL)
  rejectionReason  String?
  adminNote        String?
  emailVerifiedAt  DateTime?
  approvedAt       DateTime?
  kvkkAcceptedAt   DateTime?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  deletedAt        DateTime?

  // İlişkiler
  approvedBy              User?                   @relation("UserApprovedBy", fields: [approvedById], references: [id])
  approvedById            String?
  approvedUsers           User[]                  @relation("UserApprovedBy")

  individualVerification  IndividualVerification?
  companyVerification     CompanyVerification?
  verificationDocuments   VerificationDocument[]

  listings                Listing[]
  offers                  Offer[]
  payments                Payment[]
  contactUnlocks          ContactUnlock[]         @relation("BuyerUnlocks")
  notifications           Notification[]
  passwordResetTokens     PasswordResetToken[]
  emailVerificationTokens EmailVerificationToken[]

  // Admin işlemleri
  auditLogsAsAdmin        AuditLog[]              @relation("AuditAdmin")
  documentReviews         VerificationDocument[]  @relation("DocumentReviewer")
  adminGrantedUnlocks     ContactUnlock[]         @relation("AdminGrantedUnlocks")

  @@index([email])
  @@index([role])
  @@index([status])
  @@index([userType])
  @@map("users")
}

model IndividualVerification {
  id            String   @id @default(uuid())
  userId        String   @unique
  tcNumber      String   // AES-256-GCM şifreli
  dateOfBirth   DateTime @db.Date
  nationality   String   @default("TR")
  nviVerified   Boolean  @default(false)
  nviCheckedAt  DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("individual_verifications")
}

model CompanyVerification {
  id                     String      @id @default(uuid())
  userId                 String      @unique
  companyTitle           String
  taxNumber              String
  taxOffice              String
  tradeRegistryNumber    String
  tradeRegistryOffice    String?
  companyType            CompanyType?
  address                String?
  city                   String?
  authorizedPersonName   String
  authorizedPersonTitle  String?
  authorizedPersonPhone  String?
  authorizedPersonEmail  String?
  companyPhone           String?
  companyWebsite         String?
  foundedYear            Int?
  employeeCount          Int?
  createdAt              DateTime    @default(now())
  updatedAt              DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taxNumber])
  @@map("company_verifications")
}

model VerificationDocument {
  id            String                   @id @default(uuid())
  userId        String
  type          VerificationDocumentType
  fileUrl       String
  fileName      String
  fileSizeBytes Int?
  mimeType      String?
  reviewedById  String?
  reviewedAt    DateTime?
  reviewNote    String?
  uploadedAt    DateTime                 @default(now())

  user       User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  reviewedBy User? @relation("DocumentReviewer", fields: [reviewedById], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([type])
  @@map("verification_documents")
}

model AuditLog {
  id         String          @id @default(uuid())
  adminId    String
  entityType AuditEntityType
  entityId   String
  action     AuditAction
  fieldName  String?
  oldValue   String?
  newValue   String?
  note       String?
  ipAddress  String?
  createdAt  DateTime        @default(now())

  // AuditLog güncellenmez ve silinmez (append-only)
  admin User @relation("AuditAdmin", fields: [adminId], references: [id])

  @@index([adminId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt(sort: Desc)])
  @@map("audit_logs")
}

model Listing {
  id                String        @id @default(uuid())
  ownerId           String
  title             String
  description       String?
  city              String
  district          String
  neighborhood      String?
  parcelNo          String?
  areaM2            Decimal       @db.Decimal(10, 2)
  floorAreaRatio    Decimal?      @db.Decimal(5, 2)
  maxFloors         Int?
  zoningType        ZoningType?
  dealType          DealType
  askingPrice       Decimal?      @db.Decimal(12, 2)
  status            ListingStatus @default(DRAFT)
  viewCount         Int           @default(0)
  offerCount        Int           @default(0)
  publishedAt       DateTime?
  expiresAt         DateTime?
  expiryNotifiedAt  DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
  deletedAt         DateTime?

  owner     User               @relation(fields: [ownerId], references: [id])
  images    ListingImage[]
  documents ListingDocument[]
  offers    Offer[]

  @@index([ownerId])
  @@index([status])
  @@index([city])
  @@index([dealType])
  @@map("listings")
}

model ListingImage {
  id         String   @id @default(uuid())
  listingId  String
  url        String
  isCover    Boolean  @default(false)
  orderIndex Int      @default(0)
  createdAt  DateTime @default(now())

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([listingId])
  @@map("listing_images")
}

model ListingDocument {
  id            String   @id @default(uuid())
  listingId     String
  type          String   // DEED | ZONING_PLAN | OTHER
  fileUrl       String
  fileName      String
  fileSizeBytes Int?
  createdAt     DateTime @default(now())

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([listingId])
  @@map("listing_documents")
}

model Offer {
  id                      String      @id @default(uuid())
  listingId               String
  contractorId            String
  model                   OfferModel
  floorSharePercent       Decimal?    @db.Decimal(5, 2)
  cashAmount              Decimal?    @db.Decimal(12, 2)
  apartmentCount          Int?
  estimatedDurationMonths Int?
  description             String?
  status                  OfferStatus @default(PENDING)
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt

  listing        Listing         @relation(fields: [listingId], references: [id])
  contractor     User            @relation(fields: [contractorId], references: [id])
  payments       Payment[]
  contactUnlocks ContactUnlock[]

  @@unique([listingId, contractorId])
  @@index([listingId])
  @@index([contractorId])
  @@index([status])
  @@map("offers")
}

model Payment {
  id              String        @id @default(uuid())
  userId          String
  offerId         String
  amount          Decimal       @db.Decimal(10, 2)
  currency        String        @default("TRY")
  type            String        @default("CONTACT_UNLOCK")
  status          PaymentStatus @default(PENDING)
  paymentProvider String        @default("IYZICO")
  providerRef     String?
  providerPayload Json?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  user           User           @relation(fields: [userId], references: [id])
  offer          Offer          @relation(fields: [offerId], references: [id])
  contactUnlocks ContactUnlock[]

  @@index([userId])
  @@index([offerId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("payments")
}

model ContactUnlock {
  id             String   @id @default(uuid())
  buyerId        String
  offerId        String
  paymentId      String
  unlockedAt     DateTime @default(now())
  grantedByAdmin String?

  buyer   User    @relation("BuyerUnlocks", fields: [buyerId], references: [id])
  offer   Offer   @relation(fields: [offerId], references: [id])
  payment Payment @relation(fields: [paymentId], references: [id])
  admin   User?   @relation("AdminGrantedUnlocks", fields: [grantedByAdmin], references: [id], onDelete: SetNull)

  @@unique([buyerId, offerId])
  @@index([buyerId])
  @@index([offerId])
  @@map("contact_unlocks")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String
  type      NotificationType
  title     String
  body      String
  data      Json?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isRead])
  @@index([createdAt(sort: Desc)])
  @@map("notifications")
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("password_reset_tokens")
}

model EmailVerificationToken {
  id        String    @id @default(uuid())
  userId    String
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("email_verification_tokens")
}
```

---

## Durum Akış Diyagramı (User)

```
[Kayıt]
   │
   ▼
PENDING_EMAIL ──(e-posta doğrulandı)──▶ PENDING_APPROVAL
                                              │
                          ┌───────────────────┼──────────────────┐
                          ▼                   ▼                  ▼
                       ACTIVE            RESTRICTED           REJECTED
                          │                   │
                    (admin kararı)      (admin kararı)
                          │                   │
                       SUSPENDED           ACTIVE
                          │
                    (admin kararı)
                       ACTIVE
```

**İzin Matrisi:**

| İşlem                     | PENDING_EMAIL | PENDING_APPROVAL | RESTRICTED | ACTIVE | REJECTED | SUSPENDED |
|---------------------------|:---:|:---:|:---:|:---:|:---:|:---:|
| Giriş yapabilir           | ✅  | ✅  | ✅  | ✅  | ❌  | ❌  |
| Profil düzenleyebilir     | ✅  | ✅  | ✅  | ✅  | ❌  | ❌  |
| İlanları görebilir        | ❌  | ❌  | ✅  | ✅  | ❌  | ❌  |
| İlan açabilir             | ❌  | ❌  | ❌  | ✅  | ❌  | ❌  |
| Teklif verebilir          | ❌  | ❌  | ❌  | ✅  | ❌  | ❌  |
| İletişim açabilir         | ❌  | ❌  | ❌  | ✅  | ❌  | ❌  |

---

## Migration Kullanımı (Prisma)

```bash
# Geliştirme ortamında — migration oluştur + uygula
npx prisma migrate dev --name <migration_adı>

# Production — yalnızca uygula (migration oluşturmaz)
npx prisma migrate deploy

# Prisma Client'ı yeniden üret (schema değişince)
npx prisma generate

# Prisma Studio (görsel veritabanı arayüzü)
npx prisma studio
```

**Migration dosya yolu:** `prisma/migrations/`

---

## PrismaService (NestJS)

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

**Kullanım (TypeORM `@InjectRepository` yerine):**

```typescript
// Eski TypeORM pattern:
constructor(
  @InjectRepository(User) private userRepo: Repository<User>
) {}

// Yeni Prisma pattern:
constructor(private prisma: PrismaService) {}

// Örnek sorgu:
const user = await this.prisma.user.findUnique({ where: { id } });
const listings = await this.prisma.listing.findMany({
  where: { status: 'ACTIVE', city: 'İstanbul' },
  orderBy: { createdAt: 'desc' },
  take: 20,
});
```

---

## İlişki Diyagramı

```
User
 ├── IndividualVerification (1:1)
 ├── CompanyVerification (1:1)
 ├── VerificationDocument (1:N)
 ├── Listing (1:N, ownerId)
 │    ├── ListingImage (1:N)
 │    └── ListingDocument (1:N)
 ├── Offer (1:N, contractorId)
 │    ├── Payment (1:N)
 │    └── ContactUnlock (1:1 per buyer)
 ├── Notification (1:N)
 ├── PasswordResetToken (1:N)
 └── EmailVerificationToken (1:N)

AuditLog → User (adminId)
```

---

## Cron Job'lar

| Job                        | Zamanlama      | İşlev                                               |
|----------------------------|----------------|-----------------------------------------------------|
| `expire-listings`          | Her gece 02:00 | `expiresAt < now()` olan aktif ilanları pasife al   |
| `notify-expiring-listings` | Her gece 03:00 | Sona ermesine 7 gün kalan ilanlar için bildirim     |
| `cleanup-expired-tokens`   | Her gece 04:00 | Süresi dolmuş token'ları temizle                    |
