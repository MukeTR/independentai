# Deploy — Independent AI (independentai.space)

Topoloji: **Cloudflare (DNS/proxy) → Vercel (fra1, Next.js) → Supabase Postgres (eu-central-1)**.
Worker / Redis yok. Cron + kuyruk + rate limit Postgres üzerinde.

```
  kullanıcı ──HTTPS──▶ Cloudflare proxy ──▶ Vercel fra1 (Next.js 15, Functions ≤300s)
                                                │  Prisma (pooler 6543, pgbouncer)
                                                ▼
                                   Supabase Postgres eu-central-1 (Frankfurt)
                                                │
                                                ▼  HTTPS
                                   OpenAI · Anthropic · Google Gemini · Resend · Slack
```

## 0. Hesaplar

| Servis                      | Ne için                                                | Plan                                          |
| --------------------------- | ------------------------------------------------------ | --------------------------------------------- |
| Vercel                      | Web + API + Cron                                       | Hobby yeterli (cron günde 1, fonksiyon 300 s) |
| Supabase                    | Postgres (`independentai`, ref `pvxwwwomgjhnbhtulins`) | Free                                          |
| Cloudflare                  | DNS + proxy (mevcut)                                   | Free                                          |
| OpenAI / Anthropic / Google | AI anahtarları (en az biri)                            | pay-as-you-go                                 |
| Resend                      | E-posta (şifre sıfırlama, davet, rapor)                | Free                                          |

## 1. Veritabanı (migration-first)

`prisma db push` **production'da kullanılmaz**. Şema değişiklikleri `packages/db/prisma/migrations` altında.

### İlk geçiş (tek seferlik — mevcut prod şeması `db push` ile oluşturulmuştu)

```bash
# 1) Baseline'ı "uygulanmış" olarak işaretle (0_init mevcut şemaya eşdeğerdir; hiçbir şey çalıştırmaz)
DATABASE_URL='<pooler-6543>' DIRECT_URL='<pooler-5432>' pnpm --filter @independentai/db exec prisma migrate resolve --applied 0_init

# 2) Yeni migration'ı uygula (yeni tablolar/kolonlar + veri backfill; geriye uyumlu, kesinti yok)
DATABASE_URL='<pooler-6543>' DIRECT_URL='<pooler-5432>' pnpm db:migrate:deploy

# 3) Drift kontrolü (boş çıktı = şema == DB)
DATABASE_URL='<pooler-6543>' DIRECT_URL='<pooler-5432>' pnpm --filter @independentai/db exec prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code
```

> Önce **yedek al**: Supabase Dashboard → Database → Backups (Free tier günlük yedek) ya da
> `pg_dump "$DIRECT_URL" -Fc -f pre-migration.dump`.

### Sonraki değişiklikler

```bash
pnpm --filter @independentai/db exec prisma migrate dev --name <ad>   # yerelde üretir
pnpm db:migrate:deploy                                                # CI/prod'da uygular
```

### Rollback

- `20260906120000_launch_hardening` yalnızca **ekler** (kolon/tablo/enum) ve backfill yapar; eski kod yeni kolonlarla
  çalışır. Uygulama rollback'i için Vercel'de önceki deployment'ı "Promote" etmek yeterlidir; DB geri alınmaz.
- DB'yi de geri almak gerekirse: `pg_restore` ile yedeği yükle **veya** `packages/db/prisma/migrations/<ad>/down.sql`
  (elle yazılır; bu migration için: `ALTER TABLE ... DROP COLUMN` + `DROP TABLE` sırası dokümandaki tablo listesinin tersidir).

## 2. Vercel

1. New Project → GitHub `MukeTR/independentai`, Root Directory `apps/web` (`vercel.json` mevcut).
2. **Functions region: Frankfurt (fra1)** (DB Frankfurt'ta).
3. Node.js 22 (Project Settings → General).
4. Environment Variables (Production + Preview ayrı değerlerle):

```
DATABASE_URL, DIRECT_URL              # Supabase (bkz. .env.example)
JWT_SECRET                            # 32+ karakter (openssl rand -hex 32)
CONFIG_ENCRYPTION_KEY                 # önerilir; yoksa JWT_SECRET türetilir
CRON_SECRET                           # 16+ karakter
NEXT_PUBLIC_SITE_URL=https://independentai.space
OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY   # en az biri (ya da /admin/system/api-keys'ten DB'ye)
AI_WEB_SEARCH=1                       # native atıflar (maliyet: bkz. docs/METRICS.md)
RESEND_API_KEY, EMAIL_FROM            # e-posta
GOOGLE_OAUTH_* / LINKEDIN_OAUTH_*     # opsiyonel
TRIAL_GRACE_DAYS=7
IAI_ALLOW_MOCK=0                      # production'da 0
```

5. Deploy. Build: `pnpm run vercel-build` (Prisma generate + turbo build).

### Cron (vercel.json)

| Yol                       | Zaman        | Not                                                                                                  |
| ------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| `/api/cron/daily-run`     | `0 23 * * *` | Hobby: günde 1, ±59 dk. Bütçe 230 s; kalan iş **zincirleme** (`?hop=n`) kendini tetikler (≤12 halka) |
| `/api/cron/weekly-report` | `0 6 * * 1`  | Idempotent (`lastNotifiedAt`), zincirleme (≤6)                                                       |

Vercel `Authorization: Bearer $CRON_SECRET` gönderir; uç sabit zamanlı karşılaştırma yapar.
Zincirleme tetikleme `NEXT_PUBLIC_SITE_URL` üzerinden yapılır — **doğru domain olmalı**.

## 3. Cloudflare

- DNS: `independentai.space` → Vercel (`A 76.76.21.21`, `CNAME www → cname.vercel-dns.com`), proxy açık.
- **Access-Control-Allow-Origin: \*** canlıda görülüyor ama repoda yok → Cloudflare **Transform Rules / Response
  Header** ayarından geliyor. Kaldırın: yalnızca `/api/v1/*` CORS verir (uygulama kendi yazar).
- Rate limit istemci IP'si için uygulama `cf-connecting-ip`'yi okur (sonra `x-real-ip`, `x-forwarded-for`).
  Cloudflare'i devre dışı bırakırsanız davranış aynı kalır (Vercel başlıkları).
- Güvenlik başlıkları (CSP nonce, HSTS, X-Frame-Options, Permissions-Policy) uygulamadan gelir; Cloudflare'de
  tekrarlanmasına gerek yok.

## 4. Deploy sonrası doğrulama

```bash
S=https://independentai.space
curl -s $S/api/health                                   # {"status":"ok","db":"ok",...}
curl -sI $S/ | grep -iE 'content-security-policy|x-frame|access-control'   # CSP var, CORS yok
curl -s -o /dev/null -w '%{http_code}\n' $S/api/cron/daily-run             # 401
curl -s -H "Authorization: Bearer $CRON_SECRET" $S/api/cron/daily-run      # 200 {"enqueued":..,"processed":..}
curl -s $S/docs/api | grep -c noindex                                      # 0
curl -s $S/sitemap.xml | grep -c '/docs/api'                               # 1
```

Admin: `/admin/system` → provider "live", model adı, fiyat "katalogda", kuyruk 0 bekleyen, bildirim logları.

## 5. Production checklist (her deploy)

- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm test:integration && pnpm build` yeşil (CI)
- [ ] Migration uygulandı ve drift yok (§1)
- [ ] Env: `JWT_SECRET` ≥32, `CRON_SECRET`, en az bir AI anahtarı, `RESEND_API_KEY`, `IAI_ALLOW_MOCK` boş/0
- [ ] `/api/health` 200, cron 401/200, CSP başlığı var
- [ ] `/admin/system`: provider live, mock kapalı, kuyruk temiz
- [ ] Cloudflare CORS header kaldırıldı
- [ ] Kayıt → onboarding → panel akışı canlıda elle 1 kez denendi (mobil + masaüstü)

## 6. Sır rotasyonu

- `JWT_SECRET`: değişince tüm oturumlar düşer (beklenen). `CONFIG_ENCRYPTION_KEY` ayrı tanımlıysa şifreli değerler etkilenmez.
- `CONFIG_ENCRYPTION_KEY`: yeni değeri yaz, eskisini `CONFIG_ENCRYPTION_KEY_PREVIOUS`'a taşı; `/admin/system/api-keys`'ten
  anahtarları yeniden kaydet (yeni anahtarla şifrelenir); sonra PREVIOUS'ı kaldır.
- `CRON_SECRET`: Vercel env'de değiştir → redeploy.
- API tokenları: kullanıcı panelden yeni token üretir, eskisini iptal eder (audit log'da izlenir).

## Fonksiyon süreleri

Vercel (fluid compute): Hobby **300 s** varsayılan ve maksimum. Rotalar: cron 300 s, prompt run/onboarding 120 s,
araçlar 60 s. Provider çağrısı başına 40 s zaman aşımı + 1 retry (rate_limit/timeout/server).
