# E-ticaret araçları — skor ve bulgu kataloğu

Üç herkese açık araç (`/arac/e-ticaret-ai-gorunurluk-testi`, `/arac/urun-sayfasi-testi`, `/arac/ai-crawler-testi`) ve
bağlı mağazalar için katalog hazırlık skoru **deterministik, crawl-only** skorlardır: aynı girdi → aynı skor. LLM yok,
JavaScript render yok, örnekleme vardır (ana sayfa + bir ürün sayfası). `docs/METRICS.md`'deki görünürlük/SoV
metriklerinden bağımsızdır. Kod: `apps/web/src/server/commerce/{scoring,commerce-audit,product-page-audit,crawler-audit}.ts`.

## Hesaplama modeli (`scoring.ts`)

- Her araç **eksenlerden** (alt skor) oluşur; eksen ağırlıkları toplamı 100'dür (`assertWeights` bunu derleme anında
  doğrular).
- Eksen içinde her kontrol bir **bulgu** üretir: `pass` (faktör 1), `warn` (0.5) veya `fail` (0); kontrolün eksen içi
  göreli ağırlığı vardır. Eksen skoru = kazanılan / mümkün × 100 (yalnızca uygulanabilen kontroller sayılır).
- Toplam skor = Σ(eksen skoru × eksen ağırlığı) / Σ ağırlık, 0–100, tam sayıya yuvarlanır.
- Öneriler: `fix` alanı olan pass-dışı bulgular, `eksen ağırlığı × kontrol ağırlığı × (fail 1 | warn 0.5)` ile sıralanır;
  her öneri `{title, difficulty (Kolay|Orta|Zor), impact (Yüksek|Orta|Düşük), detail}` taşır.
- Zaman bütçesi: mağaza testi 25 sn (`COMMERCE_TIME_BUDGET_MS`); süre dolarsa kısmi sonuç ve `technical` ekseninde uyarı.
- Kaynak çekimi `safeFetch` ile SSRF-güvenlidir; özel ağ/yerel adresler fetch yapılmadan 400 döner.

## 1. Mağaza AI görünürlük testi (`COMMERCE`)

| Eksen              | Ağırlık | Neye bakar                                                                                                                                                                                            |
| ------------------ | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `catalogStructure` |      20 | Ürün/koleksiyon link sayısı ve derinliği, sitemap varlığı, Shopify'da `/products.json`, kategori sayfaları                                                                                            |
| `productSchema`    |      25 | Örnek ürün sayfasında Product JSON-LD: name, description, offers (price/priceCurrency/availability), brand, sku/gtin, image, aggregateRating                                                          |
| `contentQuality`   |      15 | Meta description, H1, açıklama uzunluğu/özgünlük, boilerplate oranı, metin/HTML oranı                                                                                                                 |
| `aiCrawlability`   |      20 | robots.txt'te AI botları (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, anthropic-ai, PerplexityBot, Google-Extended, CCBot, Bytespider, Applebot-Extended) allow/disallow, `llms.txt`, meta robots |
| `brandSignals`     |      10 | Organization/WebSite JSON-LD, marka adı tutarlılığı, sosyal/`sameAs`, hakkında/iletişim sayfaları                                                                                                     |
| `technical`        |      10 | HTTP durumu, yönlendirme zinciri (≤3), yanıt süresi, canonical, hreflang, HTML boyutu, zaman bütçesi aşımı                                                                                            |

Ek çıktılar: platform tespiti (`platform-detect.ts`: Shopify/ikas/Ticimax/WooCommerce/… + kanıt listesi, güven 0–1),
örneklenen ürün URL'si, platforma özel rehber adımları (`guides.ts`).

## 2. Ürün sayfası testi (`PRODUCT_PAGE`)

| Eksen          | Ağırlık | Neye bakar                                                                                             |
| -------------- | ------: | ------------------------------------------------------------------------------------------------------ |
| `schema`       |      30 | Product JSON-LD zorunlu/önerilen alanlar, Offer bütünlüğü, brand, gtin/sku/mpn, image, aggregateRating |
| `content`      |      25 | Açıklama uzunluğu ve özgünlüğü (boilerplate oranı), H1 ↔ title uyumu, özellik listesi                  |
| `media`        |      10 | Görsel sayısı, `alt` metin kapsamı, görsel URL'lerinin şemayla eşleşmesi                               |
| `structure`    |      15 | BreadcrumbList, FAQPage, spesifikasyon tablosu, yorum/puan bölümü                                      |
| `indexability` |      10 | meta robots / X-Robots-Tag noindex, canonical, HTTP durumu                                             |
| `answerFit`    |      10 | "AI'nın kısa cevap verebileceği" bölümler: madde listeleri, tablo, soru-cevap, net başlıklar           |

## 3. AI crawler & indekslenebilirlik testi (`CRAWLER`)

| Eksen             | Ağırlık | Neye bakar                                                                                                                                                                                                        |
| ----------------- | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `access`          |      30 | Bot matrisi: her AI botu için robots.txt kural çözümü (en spesifik `User-agent` bloğu, en uzun eşleşen Allow/Disallow); cevap motorları (OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot) engelliyse `fail` |
| `indexability`    |      25 | meta robots, X-Robots-Tag, canonical, HTTP durumu, yönlendirme zinciri                                                                                                                                            |
| `discoverability` |      20 | sitemap (robots içinde ve `/sitemap.xml`), `llms.txt`, iç link sayısı, hreflang                                                                                                                                   |
| `performance`     |      15 | Yanıt süresi, HTML boyutu, sıkıştırma/başlık ipuçları                                                                                                                                                             |
| `renderability`   |      10 | Metin/HTML oranı ve JS'e bağımlılık heuristiği (ham HTML'de içerik yoksa uyarı)                                                                                                                                   |

Bot matrisi çıktı olarak da döner (`botMatrix[] = {bot, allowed, rule, source}`); robots.txt önerileri yalnızca standart
`User-agent`/`Allow`/`Disallow` satırlarıdır ve kullanıcı seçimiyle uygulanır.

## 4. Katalog hazırlık skoru (bağlı mağaza, `runCommerceAuditFromCatalog`)

Bağlı mağazanın `CatalogProduct` kayıtları (silinmemiş) üzerinden hesaplanır; crawl yapılmaz. Eksenler mağaza testinin
alt kümesidir ve **yeniden normalize edilir**: `catalogStructure` 20, `productSchema` 25, `contentQuality` 15,
`brandSignals` 10 → toplam 70 üzerinden 100'e ölçeklenir.

| Kontrol                                           | Eksen              |
| ------------------------------------------------- | ------------------ |
| Kategori/ürün tipi atanmış ürün oranı             | `catalogStructure` |
| Fiyat + para birimi dolu, stok durumu bilinen     | `productSchema`    |
| SKU/barkod (GTIN) mevcut                          | `productSchema`    |
| Açıklama uzunluğu (≥300 karakter) ve tekrar oranı | `contentQuality`   |
| SEO başlık/açıklama dolu                          | `contentQuality`   |
| Görsel + `imageAlt` mevcut                        | `contentQuality`   |
| Marka/vendor dolu ve tutarlı                      | `brandSignals`     |

Her gerçek `syncedAt` damgası taşır; sonuç "katalog X tarihinde senkronlandı" notuyla gösterilir.

## Bulgu kaydı ve gizlilik

- Sonuçlar `Audit` (kind COMMERCE | PRODUCT_PAGE | CRAWLER; oturumsuzsa `tenantId` null) ve `PublicScan`
  (`urlHash` = sha256(normalize edilmiş URL), 30 gün) tablolarına yazılır; aynı URL+tür 10 dakika önbellekten döner
  (`cached: true`).
- Limitler: IP başına 10/saat + küresel 500/saat (araç başına); oturumlu kullanıcıda tenant bazlı `LIMITS.tool`.
  Ürün yazıcı: IP 5/saat + küresel 100/saat; sağlayıcı anahtarı yoksa 503 (sahte çıktı üretilmez).
- E-posta duvarı yoktur; PII saklanmaz (yalnızca URL, hostname, skor ve bulgular).

## Sınırlamalar (dürüst beyan)

- JavaScript ile render edilen içerik görülmez; SPA mağazalarda `renderability`/`contentQuality` düşük çıkabilir.
- Tek ürün sayfası örneklenir; kataloğun geneli için bağlı mağaza skoru kullanılır.
- robots.txt çözümü RFC 9309 kurallarına yaklaşık uyar; wildcard desenleri desteklenir, `crawl-delay` yorumlanmaz.
- Skorlar AI asistanlarının gerçek davranışını değil, **erişilebilirlik ve yapılandırılmış veri hazırlığını** ölçer;
  gerçek görünürlük için panel izleme (görünürlük/SoV) gerekir.
