# Independent AI — GEO Özellik Yol Haritası

Geoptie ve sektör (Peec, Otterly, Profound, Scrunch, Rankscale, Goodie, AthenaHQ, Knowatoa…) rakip analizine dayalı, faz faz uygulama planı.

| Faz | Başlık | Durum |
|-----|--------|-------|
| 0 | Veri altyapısı: citation extraction, LLM sentiment + mention type, şema | ✅ |
| 1 | Görsel hızlı kazanımlar: Rekabet Radarı, Top Citation Sources, Citation Gap | ✅ |
| 2 | GEO Audit 0-100 (gerçek crawl + skor) | ✅ |
| 3 | Lead-gen ücretsiz motor araçları (ChatGPT/Claude/Gemini rank checker) | ✅ |
| 4 | İçerik Denetleyicisi (sayfa → aksiyon kartları) | ✅ |
| 5 | Anahtar Kelime / Prompt Bulucu | ✅ |
| 6 | Backlink Bulucu | ✅ |
| 7 | Kanibalizasyon Denetleyici (embedding cosine) | ✅ |
| 8 | Uyarılar & Raporlar (e-posta + Slack) | ✅ |
| 9 | Farklılaştırıcılar: halüsinasyon tespiti, API token, AEO yazıcı | ✅ |

## Mimari notlar
- Crawler bağımlılıksız (regex tabanlı), Vercel Hobby 60s limitine uyumlu.
- Embedding'ler Json olarak saklanır, cosine JS'te hesaplanır (pgvector gerekmez).
- Tüm yeni AI çağrıları ucuz modelle (`classify`/`generate` helper'ları) yapılır, mock fallback'li.
- Yeni modeller `tenantId` skalar alanıyla bağlanır (Tenant modelini şişirmemek için).
