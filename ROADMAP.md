# Independent AI — Yol haritası ve durum

Tek kaynak: `packages/shared/src/capabilities.ts` (pazarlama sayfaları ve panel bu listeden beslenir).

## Canlı (live)

| Yetenek                                                                                                                 | Notlar                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| ChatGPT · Claude · Gemini takibi                                                                                        | gpt-4o-mini / claude-haiku-4-5 / gemini-2.5-flash (env override)                    |
| Günlük otomatik rerun + "şimdi çalıştır"                                                                                | Kuyruk + idempotency + zincirleme tetikleme                                         |
| Bahis, pozisyon, mention tipi, rakipler, Share of Voice                                                                 | Türkçe duyarlı çıkarım; tanımlar `docs/METRICS.md`                                  |
| E-posta + Slack uyarıları, haftalık rapor                                                                               | Teslimat logu; Slack webhook şifreli                                                |
| Public API `/api/v1/visibility`                                                                                         | Token (SHA-256), scope, iptal/süre, 60 istek/dk, `/docs/api`                        |
| Ekip: davet/yeniden gönderme/iptal, roller (Owner/Admin/Viewer), sahiplik devri, son aktivite, aktivite akışı           | Lansmanda 5 üye; son sahip korunur; erişim değişimi oturumu yeniler                 |
| Ajans: müşteri çalışma alanları, Owner/Admin/Strategist/Analyst, atama, duraklat/arşivle, owner onaylı bağlama, portföy | LAUNCH: 5 koltuk / 10 müşteri; toplulaştırma `docs/METRICS.md`                      |
| İmzalı rapor paylaşım linkleri                                                                                          | Süreli, iptal edilebilir, "Independent AI ile hazırlandı" imzalı (beyaz etiket yok) |
| E-ticaret ücretsiz araçları: mağaza AI görünürlük testi, ürün sayfası testi, AI crawler testi                           | Crawl-only, deterministik, e-posta duvarı yok; `docs/COMMERCE_SCORING.md`           |
| Hesap: e-posta doğrulama, şifre sıfırlama/değiştirme, tüm oturumları kapatma, veri dışa aktarma, hesap silme            | KVKK akışları                                                                       |
| Deneme süresi sonu salt-okunur mod                                                                                      | Veri silinmez; süper admin plan/süre atar                                           |
| 13 GEO aracı                                                                                                            | Public araçlar dağıtık rate limit altında                                           |

## Beta

- Mağaza bağlantıları (salt-okunur katalog): Shopify (OAuth, webhooks; özel uygulama — App Store'da değil), ikas
  (client credentials, webhook URL anahtarı + yeniden çekme), Ticimax (SOAP, günlük senkron; webhook yok)
- Katalog tabanlı AI hazırlık skoru, katalogdan doğrulanabilir marka gerçekleri (zaman damgalı), ticari izleme soru önerileri
- Gerçek zamanlı panel: Supabase Realtime private kanallar + RLS; yapılandırılmadığında 30 sn polling
- AI ürün açıklaması / SSS yazıcı (provider anahtarı gerekir)
- Sentiment (heuristik + LLM sınıflandırma)
- Atıf kaynakları: provider native web arama (OpenAI web_search, Anthropic web_search, Gemini googleSearch);
  `AI_WEB_SEARCH=0` ise yalnızca metin içi linkler

## Planlanan (kodda yok — pazarlamada "yakında")

| Madde                                              | Bağımlılık / not                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| Çoklu marka (tek hesapta >1 kendi markası)         | Veri modeli hazır (`Brand.isOwn`), UI/analitik ayrımı gerekiyor        |
| Webhooks (imzalı payload, retry, teslimat logu)    | NotificationLog altyapısı yeniden kullanılabilir                       |
| Aylık PDF rapor                                    | Şablon + üretim işi                                                    |
| Perplexity / Grok                                  | Adapter + fiyat kataloğu                                               |
| Ücretli planlar ve ödeme                           | **İş kararı**: fiyatlar ve sağlayıcı (iyzico vb.) belirlenmedi         |
| Prompt sürüm geçmişi UI                            | `Prompt.version` + `ModelRun.promptVersion` zaten kaydediliyor         |
| Shopify App Store listesi                          | **İş kararı**: uyum webhook'ları + inceleme süreci (`docs/SHOPIFY.md`) |
| Beyaz etiket (ajans)                               | STUDIO/SCALE planında; fiyat/plan kararı bekliyor                      |
| Ürün ↔ koleksiyon eşlemesi, varyant düzeyi katalog | v1 yalnızca ürün düzeyi + ilk varyant kimlikleri                       |

## Teknik borç / bilinen sınırlar

- Blog: 66 ince içerik (<350 kelime), 9 tarihli iddia, 49 kaynaksız sayısal iddia — bkz. `docs/BLOG_AUDIT.md`.
- Vercel Hobby cron ±59 dk sapma; kesin zamanlama Pro gerektirir.
- Gemini grounding ücreti kotaya bağlı (1.500 istek/gün ücretsiz, sonra $35/1k); maliyet kataloğu üst sınır varsayar.
- Katalog senkronu günlük cron'un kalan bütçesinde çalışır (Hobby: günde 1 tetikleme + zincir); çok büyük kataloglar
  birkaç zincir turu sürebilir. Plan tavanı: LAUNCH 5.000 ürün.
- Ticimax webhook sunmaz → değişiklikler günlük senkronda yansır. ikas webhook imzasız → payload'a güvenilmez, ürün API'den yeniden çekilir.
- Realtime, Supabase projesinde SQL politikalarının uygulanmasını ve "public access" kapalı olmasını gerektirir (`DEPLOY.md §7`).
