# Super Admin kurulumu

Production'da kendinizi süper admin yapmak için (sadece bir kez):

## Yöntem 1 — Neon SQL Editor

1. neon.tech → projeniz → SQL Editor
2. Önce kendi hesabınızla normal kayıt olun (`/register` üzerinden)
3. SQL Editor'da:
   ```sql
   UPDATE "User"
   SET "isSuperAdmin" = true
   WHERE email = 'sizin-email@example.com';
   ```
4. `/admin` adresine gidin — açılır.

## Yöntem 2 — Prisma Studio (lokal)

```bash
DATABASE_URL='<prod-url>' pnpm --filter @independentai/db studio
```
Prisma Studio açılır → User tablosu → kendi satırınız → `isSuperAdmin` → true → save.

## Super admin neye erişiyor?

- `/admin` — Platform genel bakış (toplam tenant, kullanıcı, run sayısı, AI maliyet)
- `/admin/tenants` — Tüm tenant'ların listesi + detay
- `/admin/users` — Tüm kullanıcılar
- `/admin/runs` — Son 100 model çalıştırması (tüm tenant'lar)
- `/admin/system` — AI provider durumu, manuel cron tetikleme

Super admin **tek bir kullanıcı için** önerilir (platform sahibi). Birden fazla olabilir ama dikkatli olun — herkesi görüyor.
