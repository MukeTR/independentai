# Metrik tanımları (tek kaynak)

Kod: `packages/shared/src/metrics.ts`. Panel, Public API (`/api/v1/visibility`), haftalık rapor ve düşüş uyarıları
**aynı fonksiyonları** kullanır; farklı yüzeylerde farklı sonuç çıkamaz.

## Çalıştırma (run) durumu

Her `(soru × model)` ölçümü bir `ModelRun` satırıdır: `PENDING → RUNNING → SUCCESS | ERROR`.

| Durum     | Paydaya girer mi | Açıklama                                                              |
| --------- | ---------------- | --------------------------------------------------------------------- |
| `SUCCESS` | Evet             | Model cevap verdi, bahis çıkarımı yapıldı                             |
| `ERROR`   | **Hayır**        | Sağlayıcı hatası (`errorCode`: auth / rate_limit / timeout / server…) |
| `PENDING` | Hayır            | Kuyrukta                                                              |
| `RUNNING` | Hayır            | İşleniyor (lease süresi dolarsa yeniden claim edilir)                 |

Mock (sahte) run'lar yalnızca yerel/dev'de üretilir ve UI'da **MOCK** etiketiyle gösterilir; production'da
anahtarsız sağlayıcı `ERROR (not_configured)` üretir, sahte veri üretmez.

## Bahis (mention)

- Marka adı veya alias'ının kelime sınırlarıyla, Türkçe büyük/küçük harf duyarsız (İ/i, I/ı), Unicode NFC normalize
  metinde geçmesi. Kesme işaretli ekler ("KarPanel'in") bahsi bozmaz. Domain alias'ları protokol/www'suz da eşleşir.
- Aynı marka birden fazla geçerse **1 bahis** sayılır (`occurrences` ayrıca tutulur).
- İç içe adlarda en uzun eşleşme kazanır ("Logo" vs "Logo Restoran").

## Pozisyon

Cevapta tanınan markaların (kendi + rakipler) **ilk geçiş sırasına** göre 1'den başlayan sıra. Düşük = iyi.

## Formüller

- **Görünürlük (visibility)** = kendi markanın en az bir kez geçtiği `SUCCESS` run sayısı / `SUCCESS` run sayısı × 100
- **Share of Voice (SoV)** = kendi marka bahis sayısı / (kendi + rakip bahis sayısı) × 100
  (run başına marka başına en fazla 1 bahis)
- **Ortalama pozisyon** = kendi markanın geçtiği run'lardaki pozisyonların ortalaması
- **Öneri oranı** = kendi bahislerinin % kaçı `RECOMMENDED`
- **Sentiment** = heuristik + LLM sınıflandırma (beta); skor: POSITIVE 100 / NEUTRAL 50 / NEGATIVE 0

## Atıf (citation) ve grounding

`groundingMode`:

| Değer    | Anlam                                                                                                  |
| -------- | ------------------------------------------------------------------------------------------------------ |
| `native` | Sağlayıcının web arama/grounding sonucu (OpenAI web_search, Anthropic web_search, Gemini googleSearch) |
| `text`   | Yalnızca cevap metnindeki linkler (native arama kapalı veya desteklenmiyor)                            |
| `none`   | Atıf verisi yok (mock)                                                                                 |

`AI_WEB_SEARCH=0` ile native arama kapatılır; UI atıf kaynaklarını "metin içi linkler" olarak etiketler.

## Maliyet

`costUsd` = sağlayıcı token fiyatı (katalog: `packages/ai/src/models.ts`, tarihçeli) + web arama çağrı ücreti +
sentiment sınıflandırma çağrısı. Katalogda olmayan model için **`null` = bilinmiyor** (0 değil). Panel ve admin
"maliyeti bilinmeyen run" sayısını ayrıca gösterir.

## Zaman

Günlük cron 23:00 UTC (±59 dk, Vercel Hobby). `scheduledFor` = UTC gün başlangıcı. Trend grafikleri UTC gün anahtarı kullanır.
