# Independent AI

> Şirketinizin yapay zekalarda nasıl konumlandığını izleyin.

**independentai.space** — ChatGPT, Claude ve Gemini'nin alanınızla ilgili sorulara verdiği cevaplarda markanız
geçiyor mu, hangi sırada, hangi rakiplerinizle birlikte? Bağımsız, üçüncü taraf bir gözle ölçer.

> 🎁 **Lansman:** 2026-05-22 itibarıyla kayıt olan herkese ilk 6 ay tüm özellikler ücretsiz (adil kullanım
> tavanları: `packages/shared/src/capabilities.ts`). Süre sonunda hesap **salt-okunur** olur; veri silinmez.

## Ne var, ne yok (tek kaynak: `packages/shared/src/capabilities.ts`)

| Yetenek                                                            | Durum   |
| ------------------------------------------------------------------ | ------- |
| ChatGPT · Claude · Gemini takibi, günlük rerun, "şimdi çalıştır"   | live    |
| Bahis, pozisyon, mention tipi, rakip takibi, Share of Voice        | live    |
| E-posta + Slack uyarıları, haftalık rapor                          | live    |
| Public API (`/api/v1/visibility`, token, 60 istek/dk)              | live    |
| Ekip daveti ve roller (Owner / Admin / Viewer)                     | live    |
| Sentiment (LLM destekli), native web-arama atıfları                | beta    |
| Çoklu marka, Webhooks, PDF rapor, Perplexity/Grok, ücretli planlar | roadmap |

## Stack

| Katman           | Teknoloji                                                     |
| ---------------- | ------------------------------------------------------------- |
| Web + API + Cron | Next.js 15 App Router, React 19, Vercel Functions/Cron (fra1) |
| DB               | Supabase Postgres (eu-central-1) + Prisma 5, migration-first  |
| AI               | OpenAI / Anthropic / Google adapter'ları (native web arama)   |
| Test             | Vitest (unit + integration, izole Postgres), Playwright (E2E) |

Mimari: tek deploy. Tüm API `apps/web/src/app/api/*`. Worker/Redis yok: kuyruk ModelRun satırlarında
(`FOR UPDATE SKIP LOCKED` lease), rate limit Postgres tablosunda. Ayrıntı: `docs/ARCHITECTURE.md`.

## Geliştirme

Gereksinim: **Node 22** (`.nvmrc`), pnpm 9.

```bash
pnpm install --frozen-lockfile
cp .env.example .env            # DATABASE_URL, DIRECT_URL, JWT_SECRET (32+), CRON_SECRET zorunlu

pnpm db:generate
pnpm db:migrate:deploy          # migration'ları uygula (db push KULLANMA)
pnpm dev                        # http://localhost:3200
```

Yerelde AI anahtarı yoksa **mock mod** otomatik açılır (UI'da "MOCK" etiketi). Production'da anahtarsız sağlayıcı hata
verir; sahte veri üretmez.

## Kalite kapısı (CI ile aynı)

```bash
pnpm format:check
pnpm lint            # ESLint flat config, non-interactive
pnpm typecheck
pnpm test            # unit (packages/ai + apps/web)
pnpm test:integration   # TEST_DATABASE_URL gerekir (yerel Postgres) — production'a bağlanmayı reddeder
pnpm build
pnpm test:e2e        # Playwright; bkz. apps/web/tests/e2e/README.md
```

Yerel test Postgres'i (örnek, Homebrew):

```bash
initdb -D /tmp/iai-pg -U postgres --auth=trust && pg_ctl -D /tmp/iai-pg -o "-p 5499" start
createdb -h 127.0.0.1 -p 5499 -U postgres independentai_test
export TEST_DATABASE_URL=postgresql://postgres@127.0.0.1:5499/independentai_test
```

## Dokümanlar

- `DEPLOY.md` — Vercel + Supabase + Cloudflare kurulum, env, migration, rollback, checklist
- `ADMIN.md` — süper admin, plan/deneme yönetimi, provider anahtarları, cron/kuyruk gözlemi
- `ROADMAP.md` — durum ve planlar
- `docs/ARCHITECTURE.md` — topoloji, kuyruk, güvenlik modeli, loglama/maskeleme, veri saklama
- `docs/METRICS.md` — metrik tanımları (panel = API = rapor)
- `docs/BLOG_AUDIT.md` — blog içerik denetimi

## Monorepo

```
apps/web            Next.js 15 — UI + API + Cron + testler
packages/db         Prisma şema + migrations + client
packages/ai         Provider adapter'ları, model/fiyat kataloğu, bahis/atıf çıkarımı (+ unit testler)
packages/shared     Metrik formülleri, yetenek matrisi, sabitler
```
