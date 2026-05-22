# Independent AI

> Şirketinizin yapay zekalarda nasıl konumlandığını izleyin.

**independentai.space** — ChatGPT, Claude ve Gemini'nin alanınızla ilgili sorulara verdiği cevaplarda markanız geçiyor mu, hangi sırada, hangi rakiplerinizle birlikte? Bağımsız, üçüncü taraf bir gözle ölçer.

## Stack

| Katman | Teknoloji | Free Tier |
|---|---|---|
| Web | Next.js 15 + Tailwind | Vercel |
| API | NestJS | Railway |
| Worker | BullMQ + cron | Railway |
| DB | Postgres + Prisma | Neon |
| Cache/Queue | Redis | Upstash |
| AI | OpenAI, Anthropic, Google Gemini | pay-as-you-go |

## Geliştirme

```bash
pnpm install
cp .env.example .env  # API key'leri doldur

# DB + Redis local (Neon + Upstash ücretsiz hesabı önerilir)
pnpm db:push
pnpm db:seed

# Hepsini birlikte çalıştır
pnpm dev
```

Web: http://localhost:3200 — API: http://localhost:4002

## Deploy

- **Web** → Vercel (root: `apps/web`)
- **API** → Railway (root: `apps/api`, start: `node dist/main.js`)
- **Worker** → Railway (root: `apps/worker`, start: `node dist/main.js`)
- **DB** → Neon (`DATABASE_URL` Railway+Vercel env'larına ekle)
- **Redis** → Upstash (`REDIS_URL` Railway env'una ekle)
