# Deploy — Independent AI (independentai.space)

Tüm yığını **iki ücretsiz servis** ile çalıştırıyoruz: Vercel + Supabase. Toplam aylık maliyet: $0 (AI provider API kullanımı hariç). Worker / Redis yok — Vercel Cron + Next.js Route Handlers her şeyi hallediyor.

## Mimari (Vercel-only)

```
                  ┌───────────────────────────────────────┐
                  │     independentai.space (Vercel)      │
                  │  ┌─────────────┐    ┌──────────────┐  │
                  │  │  Next.js    │    │  /api/cron/  │  │
                  │  │  web + API  │────│  daily-run   │  │
                  │  └─────────────┘    └──────────────┘  │
                  └──────────────┬────────────────────────┘
                                 │ Prisma
                                 ▼
                  ┌──────────────────────────────┐
                  │  Supabase Postgres (free)    │
                  │  eu-central-1 · Frankfurt    │
                  │  pooler:6543 (runtime)       │
                  │  pooler:5432 (şema/migrate)  │
                  └──────────────────────────────┘
                                 │
                                 ▼  doğrudan API çağrısı
                  OpenAI · Anthropic · Google Gemini
```

## 0. Servis hesapları (5 dakika)

| Servis | Ne için | Free tier | Link |
|---|---|---|---|
| **Vercel** | Web + API + Cron | Hobby sınırsız (1 cron/gün yeter) | vercel.com |
| **Supabase** | Postgres | 500 MB | supabase.com |
| **OpenAI / Anthropic / Google** | AI API keys | pay-as-you-go (yoksa mock) | her birinin dashboard'u |

> Şu an: production Supabase projesi `independentai` (ref `pvxwwwomgjhnbhtulins`, eu-central-1) canlıda. Veri 26 Ağu 2026'da Neon'dan birebir taşındı; Neon artık kullanılmıyor.

---

## 1. Supabase Postgres

Proje: **independentai** — `eu-central-1` (Frankfurt), ref `pvxwwwomgjhnbhtulins`.

Supabase iki farklı bağlantı ucu verir ve **ikisi de gerekli**:

| Değişken | Port | Mod | Ne için |
|---|---|---|---|
| `DATABASE_URL` | 6543 | transaction pooler | Uygulama runtime'ı. Serverless'te bağlantı patlamasını önler. Prisma için `?pgbouncer=true&connection_limit=1` **şart**. |
| `DIRECT_URL` | 5432 | session pooler | `prisma db push` / `migrate`. Pooler transaction modunda DDL çalışmaz. |

> `db.<ref>.supabase.co` doğrudan host'u **yalnızca IPv6** dinliyor; Vercel ve çoğu CI IPv4 olduğu için
> `DIRECT_URL` olarak da pooler host'unun **5432** portunu kullanıyoruz (`aws-0-eu-central-1.pooler.supabase.com`).

Bağlantı adreslerini almak için: Supabase Dashboard → Project Settings → Database → Connection string.

Şema yayını:
```bash
DIRECT_URL='<supabase-5432-url>' pnpm --filter @independentai/db push
```
> Production'a seed atma (demo veri prod'a sızmasın diye). Kullanıcılar register oldukça gerçek veri akacak.

### Neon'dan veri taşıma (tek seferlik, tamamlandı)

```bash
# 1) Hedefte şema
DIRECT_URL='<supabase-5432>' pnpm --filter @independentai/db push

# 2) Kuru çalışma — sadece sayar
SOURCE_DATABASE_URL='<neon-url>' TARGET_DATABASE_URL='<supabase-5432>' \
  npx tsx scripts/migrate-to-supabase.ts

# 3) Gerçek kopya (idempotent — yarıda kalırsa tekrar çalıştırılabilir)
SOURCE_DATABASE_URL='<neon-url>' TARGET_DATABASE_URL='<supabase-5432>' \
  npx tsx scripts/migrate-to-supabase.ts --apply
```

## 2. Vercel deploy

1. vercel.com → **New Project** → GitHub: `MukeTR/independentai`
2. **Root Directory** → `apps/web`
3. **Build & Output Settings** otomatik tanınır (`vercel.json` mevcut), ama:
   - Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @independentai/db generate && pnpm --filter @independentai/db build && pnpm --filter @independentai/shared build && pnpm --filter @independentai/ai build && pnpm --filter @independentai/web build`
   - Install: `echo skip`
   - Output: `.next`
4. **Environment Variables:**
   ```
   DATABASE_URL=<supabase-pooler-6543-url>   # ?pgbouncer=true&connection_limit=1
   DIRECT_URL=<supabase-pooler-5432-url>
   JWT_SECRET=<32+ karakter rastgele, openssl rand -hex 32>
   CRON_SECRET=<rastgele, Vercel cron'unu sadece bu tetikleyebilsin>
   NEXT_PUBLIC_SITE_URL=https://independentai.space

   # Opsiyonel — yoksa mock çalışır
   OPENAI_API_KEY=
   ANTHROPIC_API_KEY=
   GOOGLE_API_KEY=

   # Opsiyonel — e-posta raporları (yoksa gönderim sessizce atlanır)
   RESEND_API_KEY=
   EMAIL_FROM=Independent AI <bildirim@independentai.space>
   ```
5. **Function Region** → Settings → Functions → `Frankfurt (fra1)`.
   Veri tabanı Frankfurt'ta; fonksiyonlar US'te kalırsa her sorgu Atlantik'i geçer.
6. Deploy

## 3. Domain — independentai.space

1. Vercel → Project Settings → Domains → "Add" → `independentai.space` ve `www.independentai.space`
2. DNS sağlayıcında:
   - `A` record: `@` → `76.76.21.21`
   - `CNAME`: `www` → `cname.vercel-dns.com`
3. 5-30 dk içinde SSL otomatik bağlanır

## 4. Vercel Cron

`vercel.json`'da zaten tanımlı: `/api/cron/daily-run` her gün `0 23 * * *` (UTC 23:00 = TR 02:00).  
Vercel kendi authorize header'ı ekler (`Bearer $CRON_SECRET`); endpoint bu olmadan istek kabul etmez.

İlk deploy sonrası Vercel Dashboard → Settings → Cron Jobs'tan çalıştığını gör.

## 5. Sağlık kontrolü

```bash
curl https://independentai.space                                    # 200 (landing)
curl https://independentai.space/api/auth/me                        # 401 (token yok — beklenen)
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://independentai.space/api/cron/daily-run                 # 200, "processed: N"
```

## Function timeout notları

Vercel Hobby: function başına **max 60s**. 
- `/api/prompts/[id]/run` paralelde 3 modeli çağırır → 10-20s (mock) / 5-15s (gerçek).
- `/api/cron/daily-run` aktif prompt sayısı × 3-5s. 10+ prompt birikirse cron timeout'a takılır. O noktada cron'u parçalı yaparız (her promptu ayrı job, queue tablosu üzerinden).

---

## Sonraki

- [ ] Trial sona ererken email bildirim (Resend free tier)
- [ ] Iyzico subscription billing (6 ay sonrası için)
- [ ] Perplexity + Grok adapter'ı
- [ ] LLM-based brand mention extraction (daha akıllı)
- [ ] Cron'u prompt başına job'a böl (>50 prompt için)
