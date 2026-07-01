# MOBILE_APP.md — Mobil Uygulama Stratejisi

Sürüm: 1.1  
Tarih: 2026-07-01  
Yazar: Senior Software Architect  
Durum: Onaylı

---

## 1. Strateji Özeti

| Platform            | Teknoloji          | Kapsam       | App Store |
|---------------------|--------------------|--------------|-----------|
| Web (masaüstü)      | Next.js 14         | MVP          | —         |
| Web (mobil tarayıcı)| Next.js 14 + PWA   | MVP          | —         |
| iOS + Android       | Expo React Native  | v2           | ✅ Her ikisi |

**PWA'nın rolü:** Web sitesinin mobil tarayıcıda iyi çalışması — ana ekrana
eklenebilirlik, önbellekleme, offline temel işlevler. App Store'a giriş değil.

**Mobil uygulama rolü:** Expo React Native ile iOS App Store + Google Play'de
native deneyim. Tek kod tabanı, iki platform.

---

## 2. MVP — Web + PWA

### 2.1 Neden MVP'de Native Uygulama Yok

| Kriter                   | Açıklama                                                         |
|--------------------------|------------------------------------------------------------------|
| Geliştirme süresi        | Expo uygulaması +8-12 hafta — MVP zamanlamasını riske atar       |
| App Store onay süreci    | App Store: 1-7 gün — MVP lansmanını bloke edebilir               |
| Doğrulama önceliği       | Önce web'de ürün-pazar uyumunu doğrula, sonra mobil yatırımı yap |
| PWA yeterliliği          | İlk kullanıcılar için mobil web deneyimi yeterli                 |

### 2.2 Next.js PWA Konfigürasyonu

```typescript
// apps/web/next.config.ts
import withPWA from 'next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/cdn\.muteahitt\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cdn-images',
        expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https:\/\/api\.muteahitt\.com\/v1\/listings.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-listings',
        expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
      },
    },
  ],
})(/* nextConfig base options */);
```

### 2.3 Web App Manifest

```json
// apps/web/public/manifest.json
{
  "name": "müteahitt",
  "short_name": "müteahitt",
  "description": "Arsa sahipleri ve müteahhitleri buluşturan platform",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#f97316",
  "background_color": "#ffffff",
  "lang": "tr",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 2.4 Mobil Öncelikli Tasarım Prensipleri

Web arayüzü mobil öncelikli tasarlanır — hem PWA hem native uygulama
için sağlam temel oluşturur.

```
Minimum dokunma hedefi : 44×44px (Apple HIG)
Butonlar               : min-height: 48px
Form inputları         : min-height: 48px
Liste öğeleri          : min-height: 56px
```

```
Breakpoints (Tailwind):
  varsayılan (< 640px) → Mobil
  sm: 640px            → Büyük telefon
  md: 768px            → Tablet
  lg: 1024px           → Masaüstü
```

**Öncelikli mobil optimizasyon:**
1. İlan listesi (infinite scroll)
2. İlan detay (fotoğraf galerisi, teklif butonu)
3. Teklif formu (kısa, tek ekran)
4. Bildirimler
5. Profil ve doğrulama

---

## 3. v2 — Expo React Native

### 3.1 Teknoloji Seçimi Gerekçesi

| Seçenek             | Artılar                                  | Eksiler                              | Karar         |
|---------------------|------------------------------------------|--------------------------------------|---------------|
| **Expo React Native** | TypeScript + React, mevcut ekip; OTA güncelleme; tek kod iki platform | Bridge overhead | **Seçildi** |
| Flutter             | Mükemmel performans ve native hissiyat   | Dart — yeni öğrenme eğrisi           | Reddedildi    |
| Native (Swift/Kotlin)| En iyi performans                        | 2 ayrı kod tabanı, yüksek maliyet   | Reddedildi    |
| Capacitor           | Web kodunu sarar                         | Kötü native hissiyat                 | Reddedildi    |

**Expo'nun öne çıkan avantajları:**
- **OTA güncelleme (EAS Update):** App Store onayı beklemeden hotfix yayınlanabilir
- **EAS Build:** CI/CD pipeline'a entegre bulut build
- **Expo Router:** Next.js App Router'a benzer dosya tabanlı navigasyon — web ekibi hızla adapte olur
- **`packages/shared` hazır:** Zod şemaları ve TypeScript tipleri zaten paylaşıma uygun

### 3.2 Monorepo Entegrasyonu

```
apps/
  web/            ← Next.js (mevcut)
  api/            ← NestJS (mevcut)
  mobile/         ← Expo React Native (v2'de eklenecek)
    app/          ← Expo Router (dosya tabanlı)
      (auth)/
        login.tsx
        register.tsx
      (app)/
        index.tsx          ← İlan listesi
        listings/
          [id].tsx         ← İlan detay
        offers/
        profile/
        notifications/
    components/
    hooks/
    store/        ← Zustand (web ile aynı pattern)

packages/
  shared/         ← Zod şemaları, TypeScript tipleri (web + api + mobile)
  ui/             ← v2'de eklenecek (opsiyonel)
    web/          ← Tailwind bileşenler
    native/       ← React Native bileşenler
```

### 3.3 API Katmanı Paylaşımı

Mobil uygulama mevcut REST API'yi kullanır. Yeni endpoint gerekmez.
`packages/shared` içindeki tüm şemalar ve tipler doğrudan import edilir:

```typescript
// apps/mobile/hooks/useListings.ts
import { ListingSearchSchema } from '@muteahitt/shared/schemas/listing.schema';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';

export function useListings(filters: ListingSearchDto) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => api.get('/v1/listings', { params: filters }),
  });
}
```

### 3.4 Auth Token Yönetimi (Mobile)

Web'de cookie kullanan auth, mobilde farklı çalışır:

```typescript
// apps/mobile/lib/token-storage.ts
import * as SecureStore from 'expo-secure-store';

// Access token → SecureStore (şifreli, cihaz güvenliğine bağlı)
export const tokenStorage = {
  async getAccessToken() {
    return SecureStore.getItemAsync('access_token');
  },
  async setAccessToken(token: string) {
    await SecureStore.setItemAsync('access_token', token);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync('refresh_token');
  },
  async setRefreshToken(token: string) {
    await SecureStore.setItemAsync('refresh_token', token);
  },
  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('refresh_token'),
    ]);
  },
};
```

**Fark:** Web'de `httpOnly` cookie. Mobile'da `expo-secure-store`
(iOS Keychain, Android Keystore — eşdeğer güvenlik seviyesi).

### 3.5 Push Bildirimler (Expo Notifications)

```typescript
// apps/mobile/lib/push.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Backend'e kaydet
  await api.post('/v1/push/subscribe', {
    token,
    platform: Platform.OS, // 'ios' | 'android'
    type: 'expo',
  });

  return token;
}
```

Backend push servisi token tipine göre yönlendirir:
- `type: 'web'` → Web Push API (VAPID)
- `type: 'expo'` → Expo Push API → FCM/APNs

### 3.6 Fotoğraf Yükleme (Kamera + Galeri)

```typescript
// apps/mobile/components/ImagePicker.tsx
import * as ImagePicker from 'expo-image-picker';

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
    exif: false,    // KVKK: konum bilgisi içeren EXIF verisi temizlenir
  });

  if (result.canceled) return null;
  return result.assets[0].uri;
}

// Web'deki compressorjs eşdeğeri — expo-image-manipulator
import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1920 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
```

**KVKK notu:** `exif: false` ile fotoğraftaki GPS koordinatları
(konum bilgisi) otomatik temizlenir.

---

## 4. App Store Gereksinimleri

### 4.1 Apple App Store

```
Hesap:
  □ Apple Developer Program: $99/yıl

Uygulama gereksinimleri:
  □ Privacy Policy URL (muteahitt.com/kvkk)
  □ App Store açıklaması (Türkçe + İngilizce)
  □ Screenshot: iPhone 6.7" + iPad 12.9" (zorunlu)
  □ İçerik derecelendirme: 4+
```

**Kritik Risk — Apple Ödeme Politikası:**
Apple, "dijital hizmet" için %30 komisyon + Apple Pay zorunluluğu uygular.
"İletişim bilgisi kilidini açma" hizmetimizin dijital mi fiziksel mi
sayılacağı belirsiz. Fiziksel hizmet aracılığı genellikle muaftır.
**v2 öncesinde hukuki danışmanlık şarttır.**

### 4.2 Google Play Store

```
Hesap:
  □ Google Play Developer: $25 tek seferlik

Uygulama gereksinimleri:
  □ Privacy Policy URL
  □ Veri güvenliği formu (hangi veriler toplandığı)
  □ Hedef kitle: 18+
```

Google Play ödeme politikası daha esnektir. Türkiye'de alternatif ödeme
yöntemine izin verildiğinden Iyzico entegrasyonu sorunsuz çalışır.

---

## 5. v2 Geliştirme Zaman Çizelgesi

```
MVP + v1 tamamlandıktan sonra:

Ay 1 (Expo kurulum):
  - Monorepo'ya apps/mobile ekleme
  - Expo Router kurulumu
  - Auth akışı (login, register, token SecureStore)
  - API client (shared şemalar ile)

Ay 2 (Temel özellikler):
  - İlan listesi + filtreleme
  - İlan detay + fotoğraf galerisi
  - Teklif verme

Ay 3 (Tamamlama):
  - Profil + doğrulama
  - Push bildirimler
  - Fotoğraf yükleme (kamera + galeri)
  - Chat (v1.5 ile eşzamanlı)

Ay 4 (Store):
  - App Store başvurusu (Apple: hukuki inceleme sonrası)
  - Google Play başvurusu
  - Beta test (TestFlight + Google Play Internal)
  - Geri bildirim ve iyileştirme

Ay 5:
  - Genel kullanıma açılış
```

---

## 6. Özet

| Karar                        | MVP              | v2                        |
|------------------------------|------------------|---------------------------|
| Mobil strateji               | PWA (web uyumu)  | Expo React Native         |
| App Store varlığı            | Hayır            | iOS + Android             |
| Kod paylaşımı                | packages/shared  | packages/shared genişler  |
| Push bildirim                | Web Push (VAPID) | Expo Notifications        |
| Token depolama               | httpOnly cookie  | expo-secure-store         |
| Fotoğraf yükleme             | File API + R2    | expo-image-picker + R2    |
| Apple komisyon riski         | Yok              | Hukuki inceleme gerekli   |
