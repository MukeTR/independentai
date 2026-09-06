# Independent AI — Yol haritası ve durum

Tek kaynak: `packages/shared/src/capabilities.ts` (pazarlama sayfaları ve panel bu listeden beslenir).

## Canlı (live)

| Yetenek                                                                                                      | Notlar                                                           |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| ChatGPT · Claude · Gemini takibi                                                                             | gpt-4o-mini / claude-haiku-4-5 / gemini-2.5-flash (env override) |
| Günlük otomatik rerun + "şimdi çalıştır"                                                                     | Kuyruk + idempotency + zincirleme tetikleme                      |
| Bahis, pozisyon, mention tipi, rakipler, Share of Voice                                                      | Türkçe duyarlı çıkarım; tanımlar `docs/METRICS.md`               |
| E-posta + Slack uyarıları, haftalık rapor                                                                    | Teslimat logu; Slack webhook şifreli                             |
| Public API `/api/v1/visibility`                                                                              | Token (SHA-256), scope, iptal/süre, 60 istek/dk, `/docs/api`     |
| Ekip: davet, roller (Owner/Admin/Viewer), sunucu tarafı RBAC                                                 | Lansmanda 5 üye                                                  |
| Hesap: e-posta doğrulama, şifre sıfırlama/değiştirme, tüm oturumları kapatma, veri dışa aktarma, hesap silme | KVKK akışları                                                    |
| Deneme süresi sonu salt-okunur mod                                                                           | Veri silinmez; süper admin plan/süre atar                        |
| 13 GEO aracı                                                                                                 | Public araçlar dağıtık rate limit altında                        |

## Beta

- Sentiment (heuristik + LLM sınıflandırma)
- Atıf kaynakları: provider native web arama (OpenAI web_search, Anthropic web_search, Gemini googleSearch);
  `AI_WEB_SEARCH=0` ise yalnızca metin içi linkler

## Planlanan (kodda yok — pazarlamada "yakında")

| Madde                                           | Bağımlılık / not                                                |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Çoklu marka (tek hesapta >1 kendi markası)      | Veri modeli hazır (`Brand.isOwn`), UI/analitik ayrımı gerekiyor |
| Webhooks (imzalı payload, retry, teslimat logu) | NotificationLog altyapısı yeniden kullanılabilir                |
| Aylık PDF rapor                                 | Şablon + üretim işi                                             |
| Perplexity / Grok                               | Adapter + fiyat kataloğu                                        |
| Ücretli planlar ve ödeme                        | **İş kararı**: fiyatlar ve sağlayıcı (iyzico vb.) belirlenmedi  |
| Prompt sürüm geçmişi UI                         | `Prompt.version` + `ModelRun.promptVersion` zaten kaydediliyor  |

## Teknik borç / bilinen sınırlar

- Blog: 66 ince içerik (<350 kelime), 9 tarihli iddia, 49 kaynaksız sayısal iddia — bkz. `docs/BLOG_AUDIT.md`.
- Vercel Hobby cron ±59 dk sapma; kesin zamanlama Pro gerektirir.
- Gemini grounding ücreti kotaya bağlı (1.500 istek/gün ücretsiz, sonra $35/1k); maliyet kataloğu üst sınır varsayar.
