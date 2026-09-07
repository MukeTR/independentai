# Süper admin ve operasyon

## Süper admin olmak (bir kez)

1. `/register` ile normal kayıt olun.
2. Supabase SQL Editor:
   ```sql
   UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'siz@ornek.com';
   ```
   (veya `npx tsx scripts/make-super-admin.ts <email>` — DATABASE_URL production'a işaret etmeli, dikkat.)
3. `/admin` açılır. Süper admin **tek kişi** için önerilir; tüm tenant'ları görür.

Oturum çerezinde rol taşınmaz; her istekte DB'den okunur. Süper adminlik kaldırılınca anında etkisizdir.

## Ekranlar

| Yol                       | Ne yapar                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/admin`                  | Tenant/kullanıcı/run/mention sayıları, toplam maliyet (+ maliyeti bilinmeyen run sayısı)                                                                                                   |
| `/admin/tenants`, `/[id]` | Tenant detayı; **plan (LAUNCH/STARTER/GROWTH) ve deneme bitiş tarihi** düzenleme                                                                                                           |
| `/admin/users`            | Tüm kullanıcılar                                                                                                                                                                           |
| `/admin/runs`             | Son çalıştırmalar                                                                                                                                                                          |
| `/admin/system`           | Provider anahtar durumu, aktif model + fiyat/web-arama bilgisi, mock modu uyarısı, **cron kuyruğu** (bekleyen/çalışan/hatalı, son batch'ler), bildirim teslimat logu, manuel tur tetikleme |
| `/admin/system/api-keys`  | Provider anahtarlarını DB'ye şifreli kaydet (env'i geçersiz kılar), sil                                                                                                                    |

API: `GET /api/admin/jobs` (kuyruk + bildirim + son hatalar), `PATCH /api/admin/tenants/:id` `{plan, trialEndsAt}`,
`POST /api/admin/trigger-cron` `{force?: boolean}`.

## Plan / deneme yönetimi (fiyat ve ödeme sağlayıcısı henüz yok)

- Her tenant `LAUNCH` planında başlar; `trialEndsAt` = kayıt + 6 ay. Süre + `TRIAL_GRACE_DAYS` (7) dolunca hesap
  **salt-okunur**: okuma/panel açık, yazma/çalıştırma/cron kapalı, veri silinmez.
- Süre uzatmak: tenant detayında "Deneme bitişi" tarihini ileri alın.
- Ücretli müşteri (sözleşme elle yapıldıysa): planı `STARTER`/`GROWTH` yapın → deneme süresinden bağımsız aktif olur.
- Limitler: `apps/web/src/server/entitlement.ts` (LAUNCH: 1 marka, 200 soru, 50 rakip, 5 üye, 5 token, 60 manuel run/gün).

## Cron ve kuyruk

- Günlük tur 23:00 UTC (±59 dk). Akış: kuyruğa yaz (gün başına `(soru, model)` tek satır) → 6'lık paralel dilimlerle işle
  → bütçe (230 s) dolarsa kalanı **zincirleme** tetikle (`?hop=n`, ≤12) → bittiğinde retry satırları (rate_limit/timeout/
  server, en fazla 3 deneme) → düşüş uyarıları.
- Takılı iş: RUNNING satırın lease'i (2 dk) dolunca otomatik yeniden claim edilir. `/admin/system` → "Bekleyen" 0'a
  inmiyorsa **manuel tur** butonu (force kapalı) kalanı işler.
- `force`: bugün çalışmış olsa bile tam tur üretir (maliyetli; test için).
- Süresi dolmuş (salt-okunur) tenant'lar kuyruğa girmez.

## Bildirimler

- E-posta için `RESEND_API_KEY` şart; yoksa `/admin/system` "skipped" gösterir; davetler linkle paylaşılır, şifre
  sıfırlama UI'da "kapalı" der.
- Haftalık rapor Pazartesi 06:00 UTC, tenant başına 6 günde en fazla 1 (idempotent). Düşüş uyarısı günde en fazla 1.
- Slack webhook'ları DB'de şifreli; panelde maskeli görünür; test mesajı tenant başına 3/saat.

## Demo verisi

`POST /api/admin/seed-demo` (`Authorization: Bearer $CRON_SECRET`). Production'da ayrıca `IAI_ALLOW_DEMO_SEED=1`
gerekir; yalnızca `demo@independentai.space` tenant'ına dokunur.

## Veri talepleri (KVKK)

- Dışa aktarma: kullanıcı `Ayarlar → Verilerimi dışa aktar` (OWNER). Destek talebi için aynı JSON'u
  `GET /api/account/export` üretir.
- Silme: `Ayarlar → Hesabı sil` (OWNER, "HESABIMI SİL" onayı) tüm tenant verisini geri dönüşsüz siler; audit log'a
  yalnızca tenant adı/id yazılır.
- Loglar kişisel veri maskeler (e-posta `a***@x.com`, token/anahtar/webhook `[redacted]`).

## Ajans hesapları

- `Tenant.kind = AGENCY` olan tenant'lar ajans ev hesabıdır; müşteriler `AgencyWorkspace` ile bağlıdır. Ajans planı
  (`AgencyAccount.plan`: LAUNCH/STUDIO/SCALE) yalnızca süper admin tarafından değiştirilir; fiyat yoktur.
- Limitler (`entitlement.ts`): LAUNCH 5 koltuk / 10 müşteri / 20 paylaşım linki; STUDIO 15/40/100; SCALE 100/500/1000.
- Sorun giderme: kullanıcı "müşteriyi göremiyorum" → `AgencyMembership.allClients` veya `WorkspaceAccess` satırı var mı,
  `AgencyWorkspace.status` ARCHIVED mi? Erişim değişimi `sessionVersion` artırır; kullanıcı yeniden giriş yapmalıdır.

## Katalog senkronu ve entegrasyonlar

- İş satırları `CatalogSync` (PENDING/RUNNING/SUCCESS/ERROR, `attempt`, `errorCode`, `leaseExpiresAt`). Günlük cron
  (`/api/cron/daily-run`) prompt turundan sonra kalan bütçede işler; `catalog` alanı yanıtta görünür.
- Takılı iş: `status=RUNNING` ve `leaseExpiresAt` geçmiş → sonraki tetiklemede otomatik yeniden alınır; elle müdahale gerekmez.
- Bağlantı `ERROR` + `lastErrorCode=AUTH_INVALID|AUTH_EXPIRED|SCOPE_MISSING` → kullanıcı panelden yeniden bağlanmalı.
  `LIMIT_EXCEEDED` → plan sınırı; katalog kısmen senkron.
- `credentialsEnc` yalnızca DB'de ve şifreli; admin ekranları göstermez. Kimlik bilgisi silme = bağlantıyı kesme.
- Realtime yayın hataları `realtime.publish_failed` log satırı olarak düşer; iş akışını durdurmaz.

## Realtime

- `pnpm db:realtime:check` → fonksiyon/politika/RLS durumu. `enabled:false` dönen `/api/realtime/token` = env eksik
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, imzalama anahtarı).
- Kullanıcı "canlı" rozeti görmüyor ama panel çalışıyorsa polling fallback devrede; kritik değildir.
