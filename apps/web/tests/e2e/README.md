# E2E (Playwright)

Gerçek tarayıcı + gerçek Next production sunucusu (3200) + **izole test Postgres'i**. Production DB'ye asla bağlanmaz.

```bash
# 1) Test DB (yerel Postgres)
export TEST_DATABASE_URL='postgresql://postgres@127.0.0.1:5499/independentai_test'
DATABASE_URL=$TEST_DATABASE_URL DIRECT_URL=$TEST_DATABASE_URL pnpm db:migrate:deploy

# 2) Build (bir kez) ve testler
pnpm build
pnpm --filter @independentai/web exec playwright install chromium
pnpm test:e2e
```

`playwright.config.ts` `pnpm start`'ı `IAI_TEST_MODE=1 IAI_ALLOW_MOCK=1` ile kaldırır: e-posta/Slack dış çağrısı yapılmaz, AI cevapları mock'tur (UI'da "MOCK" etiketiyle görünür).
