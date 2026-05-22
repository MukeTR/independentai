# Deploy — Independent AI (independentai.space)

Tüm yığını **ücretsiz tier'lar** ile çalıştırıyoruz. Toplam aylık maliyet: $0 (AI provider API kullanımı hariç).

## 0. Servis hesapları (5 dakika)

| Servis | Ne için | Free tier limiti | Link |
|---|---|---|---|
| **Vercel** | web (Next.js) | sınırsız hobby projeleri | vercel.com |
| **Railway** | api + worker | $5/ay trial credit, sonra Hobby $5/ay | railway.app |
| **Neon** | Postgres | 0.5 GB · 1 proje | neon.tech |
| **Upstash** | Redis (BullMQ için) | 10k komut/gün · serverless | upstash.com |
| **OpenAI / Anthropic / Google** | AI API key'leri | pay-as-you-go | her birinin dashboard'u |

> **Not:** Worker'a günlük 1 kez tetikleniyor + manuel "şimdi çalıştır" → Upstash 10k/gün rahat yeter. Büyürken hibrit cron'a geçeriz.

---

## 1. Neon — Postgres

1. neon.tech → "New project" → bölge: AWS Frankfurt
2. Proje adı: `independentai`
3. "Connection string" → kopyala: `postgresql://...neon.tech/independentai?sslmode=require`
4. Bunu hem **Railway api + worker** hem de **Vercel** ortamında `DATABASE_URL` olarak ekle

İlk kurulumdan sonra şemayı yayınla:
```bash
DATABASE_URL=... pnpm --filter @independentai/db migrate:deploy
DATABASE_URL=... pnpm --filter @independentai/db seed   # opsiyonel demo verisi
```

## 2. Upstash — Redis

1. upstash.com → "Create Database" → Type: Regional, Region: eu-west-1
2. "TLS" açık olmalı
3. "Connect" → "BullMQ" sekmesi → URL kopyala: `rediss://default:...@xxxx.upstash.io:6379`
4. Railway worker + api ortamına `REDIS_URL` olarak ekle

## 3. Railway — API + Worker

1. railway.app → "New Project" → "Deploy from GitHub" → `MukeTR/independentai`
2. **İki ayrı service** oluştur:
   - **api** → Root directory: `apps/api`
   - **worker** → Root directory: `apps/worker`
3. Her ikisine de environment variables:
   ```
   DATABASE_URL=...        (Neon)
   REDIS_URL=...           (Upstash)
   JWT_SECRET=...          (32+ karakter rastgele)
   OPENAI_API_KEY=...
   ANTHROPIC_API_KEY=...
   GOOGLE_API_KEY=...
   NODE_ENV=production
   ```
   Ek olarak **api** için: `API_PORT=4002` (Railway otomatik $PORT verir, code zaten 4002 default)
   Ek olarak **worker** için: `DAILY_RUN_CRON=0 2 * * *`
4. Deploy → api için public URL'i kopyala (örn. `https://independentai-api.up.railway.app`)

## 4. Vercel — Web

1. vercel.com → "New Project" → GitHub: `MukeTR/independentai`
2. **Root Directory** → `apps/web`
3. **Build & Output Settings:**
   - Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @independentai/shared build && pnpm --filter @independentai/web build`
   - Install command: (boş bırak — yukarıdaki halleder)
   - Output: `.next`
4. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=https://independentai-api.up.railway.app
   NEXT_PUBLIC_SITE_URL=https://independentai.space
   ```
5. Deploy

## 5. Domain — independentai.space

1. Vercel → Project Settings → Domains → "Add" → `independentai.space` ve `www.independentai.space`
2. DNS sağlayıcında (Namecheap / GoDaddy / Cloudflare):
   - `A` record: `@` → `76.76.21.21`
   - `CNAME`: `www` → `cname.vercel-dns.com`
3. 5-30 dakika içinde SSL otomatik bağlanır

## 6. Sağlık kontrolü

```bash
curl https://independentai.space                          # 200
curl https://independentai-api.up.railway.app/api/auth/me # 401 (token yok — beklenen)
```

Railway worker loglarında: `🛰  Independent AI worker başladı` görmelisin.

---

## Sonraki

- [ ] Trial sona ererken email bildirim (Resend ile)
- [ ] Iyzico subscription billing entegrasyonu
- [ ] Perplexity + Grok adapter'ı
- [ ] Daha akıllı brand mention extraction (LLM-tabanlı)
