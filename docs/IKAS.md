# ikas entegrasyonu

Independent AI, ikas mağazanızın **ürün ve kategori** kataloğunu salt-okunur olarak çeker; AI görünürlük
ölçümleri, ürün sayfası denetimi ve ürün açıklaması önerileri bu katalog üzerinde çalışır. Sipariş,
müşteri ve ödeme verisi **hiçbir zaman** çekilmez.

## Kurulum (mağaza sahibi)

1. ikas Admin → **Uygulamalar (Apps) → Uygulamalarım (My Apps) → Daha fazla → Özel uygulama oluştur
   (Create Private App)**.
2. Uygulamaya bir ad verin, izin (scope) olarak yalnızca **ürün okuma** ve **webhook** yönetimini seçin.
   Sipariş/müşteri izni gerekmez ve istenmez.
3. ikas otomatik olarak **Client ID** ve **Client Secret** üretir. Secret'ı kopyalayın (bir daha
   gösterilmeyebilir).
4. Independent AI → **Entegrasyonlar → ikas → Bağla**: mağaza adresinizi `magaza.myikas.com` biçiminde
   girin (özel alan adı değil; token ucu bu alt alan adında çalışır), ardından Client ID / Secret'ı
   yapıştırın.
5. Bağlantı doğrulanır (token alınır, `listProduct` ile ürün okuma izni denenir), ilk katalog senkronu
   kuyruğa alınır ve ürün webhook'ları kaydedilir.

Client Secret sunucuda **AES-256-GCM ile şifreli** saklanır; API yanıtlarında, loglarda ve Realtime
olaylarında asla yer almaz. Bağlantı "Kes" denince silinir.

## Teknik akış

| Adım        | Uç                                                                                                                            | Not                                                                                                              |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Token       | `POST https://{store}.myikas.com/api/admin/oauth/token` (form: `grant_type=client_credentials`, `client_id`, `client_secret`) | `access_token` 4 saat (`expires_in: 14400`); süresi dolmadan 2 dk önce yenilenir ve şifreli olarak geri yazılır. |
| Ürünler     | `POST https://api.myikas.com/api/v1/admin/graphql` — `listProduct(pagination:{page,limit})`                                   | Sayfa 100 ürün (doküman üst sınırı 200). İmleç = sayfa numarası. `count` ile ilerleme çubuğu.                    |
| Tek ürün    | `listProduct(id:{eq})`                                                                                                        | Webhook sonrası hedefli yenileme.                                                                                |
| Kategoriler | `listCategory { id name parentId categoryPath }`                                                                              | Ürün üzerindeki `categories { name }` ile kategori adları alınır.                                                |
| Webhook     | `listWebhook`, `saveWebhook(input:{scopes, endpoint})`                                                                        | Scope'lar: `store/product/created`, `store/product/updated`.                                                     |

Host doğrulaması: yalnızca `{store}.myikas.com` (token) ve `api.myikas.com` (GraphQL) — başka bir
host'a istek atılmaz (SSRF koruması).

## Veri kapsamı ve normalizasyon

- **Alınan alanlar:** id, ad, açıklama (HTML → düz metin), marka adı, kategori adları, etiketler, varyant
  fiyatları (`sellPrice`/`discountPrice`, varsayılan fiyat listesi öncelikli), para birimi, toplam stok,
  ilk varyant SKU/barkod, varyant sayısı, `metaData.slug/pageTitle/description` (SEO), ürün tipi ve
  ağırlık (facts).
- **Ürün URL'si:** `https://{store}.myikas.com/{slug}`; slug yoksa null. Özel alan adı kullanan
  mağazalarda URL alt alan adı üzerinden verilir.
- **Görsel:** ikas görsel CDN URL biçimi resmî dokümanda tanımlı olmadığı için `imageUrl` **boş
  bırakılır** (uydurulmaz). Ürün sayfası denetimi görseli sayfadan okur.
- **Güncelleme zamanı:** Product tipinde doğrulanmış bir `updatedAt` alanı bulunmadığından
  `sourceUpdatedAt` null'dur; değişiklik tespiti içerik hash'i ile yapılır.

## Sınırlamalar

- **Webhook imzası yok.** ikas gelen isteği imzalamaz. Bu yüzden geri çağrı adresi bağlantıya özel bir
  anahtar taşır: `/api/integrations/ikas/webhook?c=<connectionId>&k=<HMAC-SHA256(connectionId)>`.
  Anahtar zamanlama-sabit doğrulanır; geçersizse 401 ve kayıt oluşmaz. Gelen **payload'a güvenilmez**:
  yalnızca ürün id'si alınır, içerik ikas API'den yeniden çekilir. Aynı gövde (sha256) tekilleştirilir.
- `store/product/deleted` scope'u dokümante değildir; silinen ürünler günlük tam senkronda soft-delete
  edilir.
- Webhook kaydı yalnızca https geri çağrı adresiyle yapılır (yerel geliştirmede tünel gerekir); kayıt
  başarısızsa bağlantı "webhook'suz" sayılır ve günlük cron senkronu devreye girer.
- Token yenilemesi başarısız (401/400) olursa bağlantı `ERROR / AUTH_INVALID` olur; kullanıcı yeniden
  bağlanmalıdır (secret döndürülmüş olabilir).

## Yetenek keşfi

`verify` sırasında şunlar denenir ve `StoreConnection.capabilities` içine yazılır: token alımı
(kimlik), `listProduct { count }` (ürün okuma izni, `productCount`), `listCategory` (kategoriler
açılır/kapanır), `webhookScopes`. `SCOPE_MISSING` durumunda kullanıcıya özel uygulama izinlerini
genişletmesi söylenir.

## Hata kodları (kullanıcıya dönen)

`AUTH_INVALID` (Client ID/Secret geçersiz veya token alınamadı), `SCOPE_MISSING` (ürün okuma izni yok),
`INVALID_STORE` (mağaza adresi `*.myikas.com` değil / bulunamadı), `RATE_LIMITED` (ikas kotası;
otomatik yeniden deneme), `UPSTREAM_ERROR`, `NETWORK`.
