# Independent AI

> Şirketinizin yapay zekalarda nasıl konumlandığını izleyin.

**independentai.space** — ChatGPT, Claude ve Gemini'nin alanınızla ilgili sorulara verdiği cevaplarda markanız geçiyor mu, hangi sırada, hangi rakiplerinizle birlikte? Bağımsız, üçüncü taraf bir gözle ölçer.

> 🎁 **Lansman:** 2026-05-22 itibarıyla kayıt olan herkese **ilk 6 ay tamamen ücretsiz**.

## Stack ($0/ay ile başlar)

| Katman | Teknoloji | Free Tier |
|---|---|---|
| Web + API + Cron | Next.js 15 (App Router, Route Handlers, Vercel Cron) | Vercel Hobby |
| DB | Postgres + Prisma | Neon |
| AI | OpenAI, Anthropic, Google Gemini (mock fallback) | pay-as-you-go |

Mimari tek deploy: tüm API endpoint'ler `apps/web/src/app/api/*` altında Next.js route handlers. Daily cron Vercel Cron tarafından `/api/cron/daily-run`'a vurur. Worker yok, Redis yok.

## Geliştirme

```bash
pnpm install
cp .env.example .env   # DATABASE_URL ve JWT_SECRET zorunlu

pnpm db:push           # şemayı DB'ye yayınla
pnpm db:seed           # demo veri (opsiyonel)
pnpm dev               # http://localhost:3200
```

Demo login (seed sonrası): `demo@independentai.space` / `demo1234`

## Deploy → Vercel + Neon

Adım adım rehber için `DEPLOY.md`'ye bak. Özetle:

1. **Neon** → Postgres branch oluştur, `DATABASE_URL` al
2. **Vercel** → GitHub `MukeTR/independentai`'ı import et, root `apps/web`, env'leri ekle
3. **DNS** → `independentai.space` → Vercel
4. **Cron** → `vercel.json`'da tanımlı, otomatik kurulur

AI API key'leri yoksa otomatik mock mode çalışır — UI ve akışlar tam çalışır, sadece üretilen cevaplar deterministik fake olur.

## Monorepo

```
apps/web                    Next.js 15 — UI + API + Cron
packages/db                 Prisma schema + client
packages/ai                 Provider adapter'ları + mock + mention extractor
packages/shared             Type'lar + sabitler
```
