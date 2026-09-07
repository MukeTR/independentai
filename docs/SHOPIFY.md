# Shopify entegrasyonu — kurulum, veri kapsamı ve uyum runbook'u

Bu belge Shopify bağlayıcısının (GraphQL Admin API, varsayılan sürüm **2026-07**) nasıl kurulduğunu, hangi veriyi
çektiğini, token'ların nasıl saklandığını ve App Store / KVKK-GDPR açısından nelerin **bizde**, nelerin **kullanıcı
kararında** olduğunu anlatır. Tüm teknik ayrıntılar resmî Shopify dokümanına dayanır
(`shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant`,
`shopify.dev/docs/apps/build/webhooks/subscribe/https`, `shopify.dev/docs/apps/build/privacy-law-compliance`).

## 1. Durum (dürüst özet)

| Konu                                          | Durum                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| OAuth (authorization code grant, çevrimdışı)  | Kodda hazır; Partner Dashboard'da uygulama oluşturulup env doldurulmadan panelde "yapılandırılmamış". |
| Ürün senkronu (imleçli, artımlı, webhook'lu)  | Hazır; sayfa boyutu 50 (sorgu maliyet tavanı 1000 puan).                                              |
| Koleksiyonlar                                 | `listCategories` ile ilk 100 koleksiyon okunabilir; ürün-koleksiyon eşlemesi v1'de yok.               |
| Webhook'lar (products/\*, app/uninstalled)    | Bağlanırken otomatik kaydedilir; başarısızsa günlük senkron devreye girer.                            |
| Uyum webhook'ları (customers/\*, shop/redact) | Uç hazır (HMAC + 200); **Partner Dashboard / TOML'da abone edilmesi kullanıcı kararı** (bkz. §7).     |
| Sipariş / müşteri / ödeme verisi              | **Çekilmez.** Scope yalnızca `read_products`.                                                         |
| Süreli (expiring) çevrimdışı token            | Opsiyonel (`SHOPIFY_TOKEN_EXPIRING=1`); refresh akışı kodda var, varsayılan klasik çevrimdışı token.  |
| Shopify App Store yayını                      | **Yapılmadı**; gerekli adımlar §7'de listelenir, karar kullanıcıda.                                   |

## 2. Partner Dashboard kurulumu (bir kez, kullanıcı yapar)

1. [partners.shopify.com](https://partners.shopify.com) → **Apps → Create app → Create app manually**.
   Dağıtım tipi v1 için **Custom app** (tek mağaza) veya **Public (unlisted)** yeterlidir; App Store listelemesi §7.
2. **Configuration**:
   - App URL: `https://independentai.space/dashboard/integrations`
   - **Allowed redirection URL(s)** — birebir şu değer: `https://independentai.space/api/integrations/shopify/callback`
     (yerel geliştirme için HTTPS tünel adresinizi de ekleyin; `NEXT_PUBLIC_SITE_URL` bu adresle aynı olmalı).
   - **Access scopes**: yalnızca `read_products`. Başka scope istemeyin; kod `SHOPIFY_SCOPES` ile ne isterse onu
     yetkilendirme URL'sine yazar ve doğrulamada `read_products`/`write_products` yoksa `SCOPE_MISSING` üretir.
   - **Webhooks → Event version**: `2026-07` (env ile uyumlu).
   - **Compliance webhooks** (App Store için zorunlu, §7): üçü de aynı uca:
     `https://independentai.space/api/integrations/shopify/webhook`
     (customers/data_request · customers/redact · shop/redact).
3. **Client credentials** → `Client ID` ve `Client secret` değerlerini Vercel ortam değişkenlerine yazın (asla repoya):

```
SHOPIFY_API_KEY=<Client ID>
SHOPIFY_API_SECRET=<Client secret>          # OAuth HMAC + webhook HMAC anahtarı
SHOPIFY_SCOPES=read_products                # varsayılan; değiştirmeyin
SHOPIFY_API_VERSION=2026-07                 # varsayılan; Shopify çeyrek sürümleriyle güncellenir
SHOPIFY_TOKEN_EXPIRING=0                    # 1 → süreli çevrimdışı token + refresh_token
NEXT_PUBLIC_SITE_URL=https://independentai.space   # redirect_uri ve webhook uri bundan türetilir
```

`SHOPIFY_API_KEY`/`SHOPIFY_API_SECRET` yokken panelde Shopify kartı "sunucuda yapılandırılmamış" görünür,
`POST /api/integrations` `CONFIG_MISSING` döner; sahte "bağlandı" durumu yoktur.

## 3. Bağlanma akışı (kullanıcı tarafı)

1. Panel → Entegrasyonlar → Shopify → mağaza adresi **`magaza.myshopify.com`** (özel alan adı değil).
   `POST /api/integrations {provider:'SHOPIFY', storeDomain}` PENDING bağlantı oluşturur.
2. `GET /api/integrations/shopify/install?connectionId=…` (ADMIN+, marka bağlamı):
   - bağlantı bu tenant'a ait ve PENDING/ERROR/DISCONNECTED olmalı; alan adı resmî desenle doğrulanır
     `^[a-zA-Z0-9][a-zA-Z0-9\-]*\.myshopify\.com$` (iki uçtan sabit — `…myshopify.com.attacker.example` geçmez);
   - 32 baytlık rastgele `state`; `iai_shopify_state` çerezi = `state|connectionId|HMAC` (httpOnly, sameSite=lax,
     10 dk, yalnızca `/api/integrations/shopify` yoluna gider);
   - 302 → `https://{shop}/admin/oauth/authorize?client_id&scope&redirect_uri&state`.
3. Mağaza sahibi izin verir → `GET /api/integrations/shopify/callback?code&hmac&shop&state&timestamp&host`:
   - çerezdeki state ile sabit zamanlı eşleşme (yoksa `?error=invalid_state`);
   - `hmac` doğrulaması: `hmac` hariç parametreler alfabetik, `k=v&k=v`, HMAC-SHA256(client secret) hex,
     `timingSafeEqual` (yoksa `?error=invalid_hmac`);
   - `shop` == bağlantının `storeDomain` (yoksa `?error=shop_mismatch`); oturum tenant'ı bağlantının sahibi olmalı;
   - `POST https://{shop}/admin/oauth/access_token {client_id, client_secret, code}` → `{access_token, scope}`;
   - `activateConnection`: `shop {…}` + `currentAppInstallation.accessScopes` ile doğrulama, AES-GCM şifreleme,
     webhook kaydı, ilk katalog senkronu kuyruğa; 302 → `/dashboard/integrations?connected=shopify`.
   - Her hata yalnızca kısa bir kodla döner (`?error=AUTH_INVALID|RATE_LIMITED|…`); token, kod veya sağlayıcı mesajı
     URL'ye/yanıta/loga yazılmaz.

## 4. Veri kapsamı

Çekilen: ürün (id/gid, handle, başlık, satıcı, ürün tipi, etiketler → `facts.tags`, HTML'den arındırılmış açıklama,
fiyat aralığı + para birimi, stok durumu (`tracksInventory=false` veya `totalInventory>0` → IN_STOCK), yayın durumu,
öne çıkan görsel URL/alt, SEO başlık/açıklama, ilk varyantın SKU/barkodu + varyant sayısı, `updatedAt`), mağaza meta
(`shop.id`, ad, `myshopifyDomain`, `primaryDomain.host`, para birimi), koleksiyon listesi (isteğe bağlı).

Ürün URL'si: `onlineStoreUrl` varsa o; yoksa `https://{primaryDomain.host}/products/{handle}`.

**Çekilmeyen:** sipariş, müşteri, adres, ödeme, indirim kodu, personel, analitik. Sorgularda `orders`/`customers`
alanı yoktur (birim testi bunu doğrular). Scope tek: `read_products`.

Artımlı senkron: `products(query: "updated_at:>'<ISO>'", sortKey: UPDATED_AT)`. Kota: HTTP 429 veya GraphQL
`extensions.code = THROTTLED` → `RATE_LIMITED` (bekleme `throttleStatus`'tan hesaplanır; senkron motoru işi
erteler); kova düşükse bir sonraki sayfa öncesi en fazla 15 sn proaktif bekleme.

## 5. Token saklama ve yaşam döngüsü

- Erişim anahtarı `StoreConnection.credentialsEnc` alanında **AES-256-GCM** ile (`server/crypto.ts`;
  `CONFIG_ENCRYPTION_KEY` || `JWT_SECRET` türevi, `CONFIG_ENCRYPTION_KEY_PREVIOUS` ile kademeli rotasyon) saklanır.
  Çözülmüş değer yalnızca bağlayıcı çağrısı süresince sunucu belleğindedir; API/UI'ya `hasCredentials: boolean` döner.
- Loglar `token|secret|hmac|signature` anahtarlarını otomatik maskeler (`logger.ts`, `credentials.ts#redactForLog`).
- Süreli token modunda (`SHOPIFY_TOKEN_EXPIRING=1`) `expiresAt` + `refreshToken` da şifreli saklanır; bağlayıcı süre
  bitimine 2 dk kala `grant_type=refresh_token` ile yeniler ve `persistCredentials` ile geri yazar. Yenilenemezse
  `AUTH_EXPIRED` → bağlantı ERROR, panelde "yeniden bağlan".
- **Bağlantıyı kes** (kullanıcı): kimlik bilgisi silinir, aktif senkronlar iptal, ürünler soft-delete; satır audit için
  kalır. **Sil**: bağlantı ve tüm katalog satırları kalıcı silinir.

## 6. Webhook'lar

Uç: `POST /api/integrations/shopify/webhook` (rate limit IP başına 600/dk, küresel 6000/dk).

1. Ham gövde okunur; `X-Shopify-Hmac-Sha256` = base64(HMAC-SHA256(client secret, ham gövde)) sabit zamanlı
   doğrulanır. Geçersiz → **401**, teslimat kaydı **oluşmaz** (id alanı zehirlenemez).
2. `X-Shopify-Webhook-Id` ile tekilleştirme: `IntegrationWebhookDelivery(provider, externalId)` unique; tekrar
   gelen teslimat 200 `{duplicate:true}` + `attempts` artar.
3. Yanıt hemen 200 (Shopify 5 sn kuralı); işleme `after()` ile yanıttan sonra:
   - `products/create|update` → `refreshProduct(conn, gid, 'upsert')` (gid `admin_graphql_api_id`; tek ürün GraphQL
     sorgusu, contentHash eşitse yazma yok), `products/delete` → soft-delete; mağazaya bağlı **tüm** ACTIVE tenant
     bağlantıları için.
   - `app/uninstalled` → aynı mağazanın tüm bağlantıları DISCONNECTED, `credentialsEnc=null`, ürünler soft-delete,
     `integration.uninstalled` audit kaydı, `integration.changed` realtime olayı.
   - Uyum konuları (§7) → HMAC doğrulandı, 200, `processed`; `shop/redact` ayrıca katalog satırlarını kalıcı siler.
   - Bilinmeyen mağaza/konu → `ignored` (+ `errorCode` NOT_FOUND/UNSUPPORTED).
4. Kayıt: bağlanırken `webhookSubscriptionCreate(topic, {uri})` ile PRODUCTS_CREATE / PRODUCTS_UPDATE /
   PRODUCTS_DELETE / APP_UNINSTALLED; `webhookSubscriptions(topics:…)` ile var olanlar atlanır. Shopify yalnızca
   HTTPS uri kabul eder; yerelde kayıt atlanır ve günlük senkron çalışır. Shopify 8 ardışık başarısızlıkta aboneliği
   siler → bu durumda "yeniden doğrula" webhook'ları tekrar kaydeder (`webhooksRegistered=false` iken cron 20 saatte bir
   tam senkron yapar).

## 7. App Store başvurusu — BİZİM YAPMADIĞIMIZ adımlar (kullanıcı kararı)

Kod tarafı hazır olsa da aşağıdakiler Partner hesabı, hukuki metin veya ürün kararı gerektirir; hiçbiri yapılmadı:

1. **Uyum webhook'larına abone olmak**: `customers/data_request`, `customers/redact`, `shop/redact` API ile değil,
   Partner Dashboard (veya `shopify.app.toml` → `[webhooks] compliance_topics`) üzerinden tanımlanır. Uç hazırdır;
   abone olunmadan Shopify istek göndermez. App Store'a girmeyen custom app'te zorunlu değildir.
2. **Gizlilik politikası URL'si + veri işleme açıklaması** (Partner Dashboard → App listing → Privacy policy).
3. **Yalnızca gerekli scope** ilkesi belgesi: `read_products` (hazır) — başvuruda her scope'un gerekçesi istenir.
4. **Süreli çevrimdışı token**: Shopify yeni public uygulamalarda `expiring: '1'` token bekleyebilir → başvurudan önce
   `SHOPIFY_TOKEN_EXPIRING=1` yapıp refresh akışını canlı bir mağazada doğrulayın.
5. **Embedded app / App Bridge** gereksinimi: Bu entegrasyon Shopify admin içine gömülü değildir; App Store ilanı için
   Shopify "embedded" ister veya istisna gerekçesi bekler. Ürün kararı.
6. **Test mağazası + inceleme videosu + destek e-postası + fatura/plan bilgisi** (ücretsiz de olsa beyan).
7. **Level 2 gizlilik (protected customer data) başvurusu**: müşteri verisi çekmediğimiz için gerekmez; ancak scope
   genişletilirse zorunlu olur — genişletmeyin.

## 8. GDPR / KVKK notları

- Shopify mağaza verisi bakımından biz **veri işleyen** (merchant adına ürün kataloğu) konumundayız; kişisel veri
  (müşteri, sipariş) **hiç çekilmez**, bu yüzden `customers/data_request` → "veri yok", `customers/redact` → "silinecek
  veri yok" yanıtı loglanır (`shopify.webhook_compliance`, `personalData:'none'`).
- `shop/redact` (uninstall'dan 48 saat sonra gelir): mağazanın katalog satırları kalıcı silinir; bağlantı satırı
  (mağaza alan adı + zaman damgası) yasal iz olarak kalır, kimlik bilgisi zaten silinmiştir. 30 gün kuralı sağlanır.
- Kullanıcı hesabını silerse (`/api/account/delete`) tenant cascade ile bağlantı, katalog ve teslimat kayıtları silinir.
- Erişim anahtarı yalnızca AB/TR dışı aktarım yaratmaz: veri Supabase eu-central-1 + Vercel fra1'de kalır
  (bkz. `docs/ARCHITECTURE.md`).
- Webhook gövdeleri **saklanmaz**; yalnızca `topic`, `webhook id`, `shop`, durum ve hata kodu yazılır.

## 9. Sorun giderme

| Belirti                    | Neden / çözüm                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `?error=invalid_state`     | Çerez süresi (10 dk) doldu, farklı tarayıcı/oturum veya akış Shopify admin'den başlatıldı → yeniden başlat. |
| `?error=invalid_hmac`      | `SHOPIFY_API_SECRET` Partner Dashboard'daki client secret ile aynı değil.                                   |
| `?error=shop_mismatch`     | Panelde yazılan `myshopify` alan adı ile izin verilen mağaza farklı.                                        |
| `?error=SCOPE_MISSING`     | Uygulama yapılandırmasında `read_products` yok.                                                             |
| Redirect "not whitelisted" | Allowed redirection URL, `NEXT_PUBLIC_SITE_URL + /api/integrations/shopify/callback` ile birebir değil.     |
| Webhook 401                | Secret farklı veya gövde proxy'de değiştirildi (ham gövde şart).                                            |
| Webhook gelmiyor           | Abonelik silinmiş olabilir (8 başarısız deneme) → "yeniden doğrula"; cron 20 saatte bir tam senkron.        |
| Sık `RATE_LIMITED`         | Normal; senkron motoru `retryAfterMs` ile erteler. Sayfa boyutu 50 sabit, artırmayın.                       |
