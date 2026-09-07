# E-ticaret entegrasyonları (Shopify · ikas · Ticimax)

Sürüm 1 kapsamı: **salt-okunur ürün kataloğu**. Sipariş, müşteri, ödeme ve adres verisi (PII) hiçbir
bağlayıcı tarafından istenmez; mağazaya yazma yapılmaz. Bu doküman veri modeli, bağlayıcı sözleşmesi,
senkron motoru, durum makinesi, güvenlik ve UI durumlarını anlatır. Sağlayıcıya özel OAuth/webhook
ayrıntıları için ilgili bağlayıcı dosyalarındaki başlık yorumlarına bakın
(`apps/web/src/server/commerce/connectors/*.ts`, `shopify-oauth.ts`).

## Mimari

```
Panel (/dashboard/integrations) ──▶ /api/integrations (liste, PENDING oluştur)
        │                            /api/integrations/:id/{sync,verify,disconnect,products,syncs}, DELETE /:id
        │                            /api/integrations/shopify/{install,callback,webhook}   (OAuth + HMAC)
        │                            /api/integrations/ikas/{connect,webhook}  ·  /api/integrations/ticimax/connect
        ▼
 server/commerce/
   connections.ts   yaşam döngüsü (PENDING → ACTIVE → ERROR/DISCONNECTED), plan sınırı, audit, realtime
   catalog-sync.ts  kuyruk (CatalogSync), kira, imleç, contentHash, soft delete, retry, ilerleme yayını
   registry.ts      sağlayıcı → bağlayıcı (tembel yükleme), providerConfigured
   credentials.ts   AES-256-GCM şifreleme, publicConnectionView (secret alanı asla çıkmaz)
   messages.ts      hata kodu → kullanıcı metni (istemci de aynı sabiti kullanır)
   platform-detect.ts  herkese açık HTML/başlıktan platform tespiti (crawl-only)
   providers.ts     UI sağlayıcı kataloğu (etiket, configured, auth modeli, yetenekler)
        │
        ▼ Prisma
 StoreConnection ─┬─ CatalogProduct (connectionId+externalId benzersiz, deletedAt soft delete)
                  ├─ CatalogSync    (iş satırı: durum, imleç, sayaçlar, kira, dedupeKey, attempt)
                  └─ IntegrationWebhookDelivery (provider+externalId benzersiz → teslimat dedupe)
```

### Veri modeli

| Model                        | Rol                               | Önemli alanlar                                                                                                                                                                                                                                     |
| ---------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StoreConnection`            | Tenant'ın bir mağazaya bağlantısı | `provider`, `storeDomain` (tenant+provider+domain benzersiz), `status`, `credentialsEnc` (şifreli JSON, **API'ye dönmez**), `capabilities` (bağlayıcı yetenekleri + mağaza meta), `scopes`, `webhooksRegistered`, `lastSyncAt`, `lastErrorCode/At` |
| `CatalogProduct`             | Normalleştirilmiş ürün            | `externalId`, `title`, `description` (≤20 000), `priceMin/Max`, `currency`, `availability`, `imageUrl`, `seoTitle/Description`, `identifiers`, `facts`, `contentHash`, `syncedAt`, `deletedAt`                                                     |
| `CatalogSync`                | Kuyruk işi                        | `status` (PENDING/RUNNING/SUCCESS/ERROR), `cursor`, `page`, `fetched/upserted/unchanged/deleted`, `total`, `attempt`, `leaseExpiresAt`, `dedupeKey`, `triggeredBy` (`manual:<userId>` \| `cron` \| `webhook` \| `connect`)                         |
| `IntegrationWebhookDelivery` | Gelen webhook teslimatı           | `provider`, `externalId` (benzersiz → aynı teslimat iki kez işlenmez), `connectionId`                                                                                                                                                              |

Şema değişikliği bu görevde yapılmadı.

## Bağlayıcı sözleşmesi (`types.ts`)

```ts
interface CommerceConnector {
  provider: 'SHOPIFY' | 'IKAS' | 'TICIMAX';
  capabilities(): { products: true; categories; webhooks; incremental; auth; count; pageSize; productUrls };
  verify(ctx): Promise<StoreInfo>;                         // kimlik bilgisi geçerli mi + mağaza meta
  listProducts(ctx, { cursor, limit, updatedSince? }): Promise<{ items: NormalizedProduct[]; nextCursor; total? }>;
  countProducts?(ctx); listCategories?(ctx); getProduct?(ctx, externalId); registerWebhooks?(ctx, callbackUrl);
}
```

- `ConnectorContext.credentials` çözülmüş kimlik bilgisidir; yalnızca çağrı süresince bellekte yaşar.
  Token yenilenirse bağlayıcı `persistCredentials` ile geri yazar (Shopify süreli token, ikas 4 saatlik token).
- Hatalar `CommerceError` ile kodlanır (`AUTH_INVALID`, `AUTH_EXPIRED`, `SCOPE_MISSING`, `RATE_LIMITED`,
  `NOT_FOUND`, `INVALID_STORE`, `UPSTREAM_ERROR`, `NETWORK`, `UNSUPPORTED`, `CONFIG_MISSING`, `LIMIT_EXCEEDED`,
  `WEBHOOK_INVALID`). `retryable` = RATE_LIMITED | UPSTREAM_ERROR | NETWORK. Ham sağlayıcı cevabı ve secret
  hiçbir mesaja girmez; loglar `redactForLog` ile maskelenir.
- Sağlayıcı yetenek tablosu:

|              | Shopify                                                      | ikas                                  | Ticimax                       |
| ------------ | ------------------------------------------------------------ | ------------------------------------- | ----------------------------- |
| Kimlik       | OAuth authorization code (offline token, `read_products`)    | Client ID/Secret (client_credentials) | Servis kökü + üye kodu (SOAP) |
| Webhook      | products/create·update·delete, app/uninstalled (HMAC-SHA256) | var (imzalı, `?c=&k=`)                | yok                           |
| Artımlı      | `updated_at:>`                                               | bağlayıcıya göre                      | yok                           |
| Sayfa boyutu | 50 (GraphQL maliyet tavanı)                                  | 50                                    | 50                            |
| Ürün URL     | evet (primaryDomain/handle)                                  | bağlayıcıya göre                      | bağlayıcıya göre              |
| Durum        | beta                                                         | beta                                  | beta                          |

## Senkron motoru (`catalog-sync.ts`)

1. **Kuyruğa alma** — `enqueueCatalogSync(connectionId, trigger)`: `StoreConnection` satırı `FOR UPDATE` ile
   kilitlenir; aktif (PENDING/RUNNING) iş varsa **o döner** (idempotent). Cron `dedupeKey =
connectionId:cron:YYYY-MM-DD` ile günde bir; manuel/connect/webhook tetiklemeleri ayrı anahtar alır.
   `enqueueDailyCatalogSyncs()` webhook'suz veya 20 saatten eski senkronlu ACTIVE bağlantılar için iş üretir.
2. **Kira (lease)** — `claimSync()` `FOR UPDATE SKIP LOCKED` ile bir iş alır, `leaseExpiresAt = now+120 s`.
   Süresi geçmiş RUNNING işler de alınabilir (çökmüş fonksiyon kurtarma). Her sayfada kira uzatılır.
3. **İmleç** — sayfa başına `cursor/page/fetched/upserted/unchanged/total` DB'ye yazılır. Fonksiyon bütçesi
   (`deadlineAt − 15 s`) dolunca iş RUNNING kalır → sonraki tetikleme imleçten devam eder (`partial`).
4. **contentHash** — `sha256(JSON(stable alanlar))`. Eşitse yalnızca `syncedAt` güncellenir (yazma yok);
   farklıysa upsert. Yeni ürün oluşturulur.
5. **Soft delete** — tam senkron bitince `syncedAt < startedAt` olan ürünler `deletedAt` alır. Plan sınırı
   (`catalogProducts`) nedeniyle kesilen senkronda **silme yapılmaz** ve iş `LIMIT_EXCEEDED` notuyla SUCCESS olur.
6. **Retry** — `retryable` hata: `attempt+1 < 3` ise PENDING'e döner, `leaseExpiresAt = now + max(retryAfterMs,
30 s × attempt)` ile ertelenir. Aksi halde ERROR; `AUTH_*`/`SCOPE_MISSING` bağlantıyı da ERROR yapar.
7. **Realtime** — `integration.sync` olayı: `queued → running (≤1/1.5 s) → success | retrying | error`;
   payload: `entityId`, `jobId`, `status`, `progress`, `fetched`, `total`, `errorCode`, `provider`.
   `integration.changed`: `connected | disconnected | deleted | product_updated | product_deleted`.
8. **Manuel tetikleme** — `POST /api/integrations/:id/sync` → 202 + `after(processCatalogSyncs({deadlineAt: +50 s}))`:
   kullanıcı cron'u beklemez; kalan iş cron'da tamamlanır. Ürün senkronunun cron'a bağlanması ana görevde.
9. **Webhook sonrası** — `refreshProduct(connectionId, externalId, 'upsert'|'delete')`: bağlayıcı `getProduct`
   destekliyorsa tek ürün yenilenir; desteklemiyorsa senkron kuyruğa alınır.

## Durum makinesi

```
            POST /api/integrations (plan sınırı + tekillik)
                       │
                       ▼
                   PENDING ──── connect/callback verify OK ────▶ ACTIVE ◀──── verify OK ─────┐
                       │                                          │  ▲                       │
       verify başarısız│                                          │  │ senkron OK (PENDING→ACTIVE)
                       ▼                                          │  │                       │
                     ERROR ◀── AUTH_INVALID/EXPIRED/SCOPE_MISSING ─┘  └──── retryable hata: durum korunur
                       │
   disconnect ─────────┼──────────────────────────────▶ DISCONNECTED (credentialsEnc=null, katalog soft-delete,
                       │                                             aktif işler ERROR)
                       ▼
                    DELETE → satır ve katalog cascade silinir (audit izi kalır)
```

- Aynı `tenant+provider+storeDomain` için ACTIVE varken yeniden POST → **409**. PENDING/ERROR/DISCONNECTED ise
  satır yeniden kullanılır (yeniden bağlanma). DISCONNECTED satırlar plan sınırına sayılmaz.
- `triggerSync` yalnızca ACTIVE bağlantıda çalışır (aksi 409). `verify` kimlik bilgisi yoksa ağ çağrısı yapmadan
  `AUTH_INVALID` döner.
- UI hiçbir zaman "bağlı" rozetini sunucudan bağımsız üretmez; `status` alanı tek gerçek.

## Güvenlik

- **Şifreleme** — `credentialsEnc = AES-256-GCM(JSON(credentials))`; anahtar `ENCRYPTION_SECRET`.
  Çözülmüş değer yalnızca bağlayıcı çağrısı sırasında bellekte. `publicConnectionView` alanı çıkarır ve
  `hasCredentials` boolean'ı ekler; testler her yanıt gövdesinde `credentialsEnc` ve şifreli metnin yokluğunu doğrular.
- **SSRF** — kullanıcı URL'leri yalnızca `safeFetch`/`parsePublicUrl` ile (özel/loopback/link-local/CGNAT
  IP'leri, `.local/.internal`, kimlik bilgili URL'ler ve 80/443 dışı portlar reddedilir; DNS rebinding'e karşı
  bağlantı soketinin kendi lookup'ında doğrulama). Sağlayıcı host'ları: Shopify `^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$`,
  ikas `*.myikas.com`/`api.myikas.com`, Ticimax servis kökü `parsePublicUrl` + https. Sihirbaz aynı kuralları
  istemcide erken uygular (UX); yetki sunucudadır.
- **HMAC / imza** — Shopify OAuth dönüşü `hmac` (sabit zamanlı), webhook `X-Shopify-Hmac-Sha256` (ham gövde);
  ikas webhook `k` imzası. Geçersiz imza → `WEBHOOK_INVALID`, gövde işlenmez.
- **Dedupe** — `IntegrationWebhookDelivery(provider, externalId)` benzersiz; aynı teslimat iki kez işlenmez.
  Cron işleri `dedupeKey` ile günde bir.
- **Yetki** — tüm uçlar `requireActor({ brandContext: true })` (ajans ev tenant'ında 403); yazma uçları
  `write: true` (VIEWER 403, deneme dolmuşsa `trial_expired`). Kaynak sahipliği `getOwnedConnection`
  (`tenantId` eşleşmezse 404 — varlık sızdırılmaz).
- **Rate limit** — `POST /api/tools/platform-detect`: kayıtsız IP başına 20/saat + küresel 1000/saat; giriş
  yapmışta tenant başına `LIMITS.tool`.
- **Loglar** — `redactForLog` token/secret/uyeKodu anahtarlarını maskeler; hata mesajlarına sağlayıcı ham cevabı girmez.
- **Audit** — `integration.connect|disconnect|delete` AuditLog'a yazılır (provider, storeDomain).

## API özeti

| Uç                                                     | Yetki                | Dönüş                                                                                                                         |
| ------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/integrations`                                | brandContext         | `{ connections: ConnectionView[], providers: ProviderInfo[], limits: { storeConnections, catalogProducts, used }, canWrite }` |
| `POST /api/integrations` `{provider, storeDomain}`     | write + brandContext | 201 `{ connection, next }` — `next` yalnızca Shopify (`/api/integrations/shopify/install?connectionId=`)                      |
| `POST /api/integrations/:id/sync`                      | write                | 202 `{ created, sync }` + arka planda işleme                                                                                  |
| `POST /api/integrations/:id/verify`                    | write                | `{ ok, code, message, connection }`                                                                                           |
| `POST /api/integrations/:id/disconnect`                | write                | `{ ok: true }`                                                                                                                |
| `DELETE /api/integrations/:id`                         | write                | `{ ok: true }`                                                                                                                |
| `GET /api/integrations/:id/products?q&cursor&limit≤50` | brandContext         | `{ items, total, nextCursor, connectionStatus }` (deletedAt=null; açıklama ≤200)                                              |
| `GET /api/integrations/:id/syncs`                      | brandContext         | son 10 iş; `triggeredBy` kullanıcı kimliği olmadan; `errorMessage`, `progress`                                                |
| `POST /api/tools/platform-detect` `{url}`              | public (rate limit)  | `{ platform, label, confidence, evidence, connectorAvailable }`                                                               |

Hata biçimi her yerde `{ message, code, requestId }` (`server/errors.ts`).

## UI durumları (`/dashboard/integrations`)

- **Sayfa**: `requirePageActor({ brandContext: true })` — ajans ev tenant'ı çalışma alanı seçimine yönlenir.
  İlk veri sunucuda (`listConnections` + `listProviderInfos`); `?connected=shopify` / `?error=<kod>` mesajları
  `messages.ts` ile çözülür ve URL temizlenir.
- **Kart**: sağlayıcı ikonu (lucide; marka logosu yok), mağaza adı/alan adı, durum rozeti
  (Bekliyor/Bağlı/Hata/Kesildi), ürün sayısı, son senkron (göreli), webhook rozeti (canlı güncelleme / günlük
  senkron), `errorMessage`, plan sınırı çipleri, PENDING için "Shopify'da devam et" bağlantısı.
- **Eylemler**: Şimdi senkronla (ACTIVE), Doğrula (kimlik bilgisi varsa), Yeniden bağlan (ERROR/DISCONNECTED/PENDING
  → sihirbaz ön dolu), Ürünleri görüntüle, Bağlantıyı kes ve Sil (ConfirmDialog, geri dönüşsüz uyarısı).
- **İlerleme**: `useRealtimeEvent('integration.sync')` ile; Realtime yoksa yalnızca aktif senkron varken 5 sn'de bir
  `/syncs` polling. `role=progressbar`, `aria-live`. Terminal durumda liste sunucudan yenilenir.
- **Sihirbaz**: 1) platform (yapılandırılmamış → devre dışı + "Sunucuda yapılandırılmamış"; "platformumu bilmiyorum"
  → `/api/tools/platform-detect`), 2) mağaza adresi (Shopify `.myshopify.com` doğrulaması; Ticimax servis adresi
  https + herkese açık host kontrolü), 3) yetki (Shopify → OAuth yönlendirmesi; ikas Client ID/Secret; Ticimax
  "Doğrula ve bağla"), 4) sonuç (doğrulandı + ilk senkron kuyruğa alındı + "ne çekiyoruz / ne çekmiyoruz").
  Kimlik bilgileri state'ten hemen temizlenir.
- **Ürün önizleme**: ilk 20 ürün (görsel, başlık/marka, fiyat, stok, kategori, SEO başlığı var/yok) + 300 ms
  debounce arama; yükleniyor/boş/hata/DISCONNECTED durumları; tablo `overflow-x-auto`.
- **Salt-okunur**: VIEWER veya deneme bitmişse bilgi bandı; yazma düğmeleri kapalı; butonlar hydrate olana kadar disabled.

## Sınırlar ve bilinen kısıtlar

- Plan: LAUNCH 2 bağlantı / 5 000 ürün, STARTER 1 / 2 000, GROWTH 10 / 50 000 (`entitlement.ts`).
- Ürün açıklaması DB'de 20 000, önizlemede 200 karakter; kategori ≤20, başlık ≤500.
- Fonksiyon bütçesi: manuel senkron 50 s; büyük kataloglar birkaç turda tamamlanır (imleçten devam).
- Ticimax webhook yok → günlük senkron; değişiklikler en geç bir sonraki senkronda.
- Shopify App Store listesi yok; özel uygulama ile kurulum ve sunucu env (`SHOPIFY_API_KEY/SECRET`) gerekir;
  yoksa panelde "Sunucuda yapılandırılmamış".
- Kategori (koleksiyon) ağacı v1'de yalnızca ürün üzerindeki `categories`/`productType` alanıyla temsil edilir;
  ayrı kategori tablosu yok.
- Platform tespiti sinyal tabanlıdır (HTML/başlık); tek zayıf sinyalde dürüstçe `UNKNOWN` döner.

## Testler

- `tests/integration/integrations-api.test.ts` — liste/sağlayıcı/limit, geçersiz girdi, plan sınırı, 409, VIEWER
  403, ajans 403, çapraz tenant 404, sync 202 + after() işleme, verify, products filtre/arama/sayfalama,
  disconnect (kimlik bilgisi silinir, katalog arşivlenir, realtime yayını), DELETE cascade, gizli alan sızıntısı.
- `tests/unit/platform-detect.test.ts` — Shopify/ikas/Ticimax/WooCommerce fixture'ları, başlık sinyali, UNKNOWN.
- `tests/e2e/integrations.spec.ts` — boş durum → Ticimax sihirbazı → özel ağ adresi reddi → iptal; OAuth dönüş
  mesajı; mobil taşma; çözüm sayfaları ve mobil menü.
