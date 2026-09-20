# Süper admin ve operasyon

Bu belge kök `ADMIN.md`'nin gece programı (2026-09-21, W4) sürümüdür: eski içerik korunur, lead paneli, KPI şeridi,
taramalar, duyurular, hediye süre ve ekran rehberi eklenir. INTEGRATE kök `ADMIN.md`'yi bu dosyaya yönlendirir.

## Süper admin olmak (bir kez)

1. `/register` ile normal kayıt olun.
2. Supabase SQL Editor:
   ```sql
   UPDATE "User" SET "isSuperAdmin" = true WHERE email = 'siz@ornek.com';
   ```
   (veya `npx tsx scripts/make-super-admin.ts <email>` — DATABASE_URL production'a işaret etmeli, dikkat.)
3. `/admin` açılır. Süper admin **tek kişi** için önerilir; tüm tenant'ları görür. Satış ekibi büyürse ayrı bir `SALES`
   bayrağı düşünülmeli (aksi hâlde satış API anahtarlarını görür).

Oturum çerezinde rol taşınmaz; her istekte DB'den okunur. Süper adminlik kaldırılınca anında etkisizdir. Her admin
sayfası `requireSuperAdmin()` + `force-dynamic`; her mutasyon `audit('admin.*')` yazar; yanıtlarda `passwordHash`,
gizli anahtar ya da ham IP/visitorHash yer almaz.

## Ekranlar

| Yol                                  | Veri                                                                                                                                                                                                                              | Aksiyonlar                                                                                                                                                                               |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                             | KPI şeridi (`admin-stats.ts`): bugün/7g/30g public tarama, yeni lead, dönüşüm (iletişim formu / tarama), ajans adayı ≥50, aktif duyuru, yasaklı isabet, deneme biten 7 gün, atlanan bildirim; 14 gün sparkline; platform sayıları | Her kutu filtreli sayfaya bağlantı                                                                                                                                                       |
| `/admin/leads` · `/admin/leads/[id]` | `Lead` (araç taramaları: yalnız alan adı + skor; iletişim formu: KVKK onaylı iletişim), son 5 `PublicScan`, `AgencySignal`                                                                                                        | Kaynak sekmeleri · aşama hapları · arama · Arandı / Mail atıldı / Teklif / Kazanıldı / Kaybedildi / Yeniden aç · not · sahip · e-postayı göster (audit) · Raporu aç · CSV · Sil (onaylı) |
| `/admin/scans`                       | `PublicScan`: araç × gün (14 gün), en çok taranan 20 site, sektör dağılımı, yarım/WAF oranı, son 50                                                                                                                               | Raporu aç · Lead’e git · Yasakla (`/admin/blocked-sites?hostname=`)                                                                                                                      |
| `/admin/users`                       | `select` ile kullanıcı listesi (passwordHash yok), 50/sayfa cursor, arama (e-posta/şirket, İ/ı duyarsız), rozet Aktif / Deneme / Süresi doldu                                                                                     | İşlemler: şirket detayı, hediye süre, lead kaydı                                                                                                                                         |
| `/admin/tenants` · `/[id]`           | 50/sayfa cursor, arama, `?trial=7d` / `?trial=30d` filtresi; detayda kullanıcılar, marka/rakipler, sorular                                                                                                                        | Plan (LAUNCH/STARTER/GROWTH) + deneme bitişi formu · **Hediye süre** [7, 14, 30, 90, 365] → `PATCH /api/admin/tenants/:id`                                                               |
| `/admin/announcements`               | `Announcement`: ton (Bilgi/Kampanya/Uyarı), yerleşim (Ana sayfa/Fiyatlandırma/Araç sayfaları/Panel), tarih aralığı                                                                                                                | Oluştur · düzenle · yayında anahtarı · sil · canlı önizleme                                                                                                                              |
| `/admin/blocked-sites`               | `BlockedSite` (W5)                                                                                                                                                                                                                | Ekle / düzenle / sil, isabet sayısı                                                                                                                                                      |
| `/admin/agency-candidates`           | `AgencySignal` skor ≥50 (W5)                                                                                                                                                                                                      | İletişime geç · Dönüştü · Yoksay                                                                                                                                                         |
| `/admin/runs`                        | Son çalıştırmalar                                                                                                                                                                                                                 | —                                                                                                                                                                                        |
| `/admin/system`                      | Provider anahtar durumu, aktif model + fiyat/web-arama bilgisi, mock modu uyarısı, cron kuyruğu, bildirim teslimat logu, teklif/fiyat ayarı                                                                                       | Manuel tur tetikleme, teklif formu                                                                                                                                                       |
| `/admin/system/api-keys`             | Provider anahtarları (AES-256-GCM `SystemConfig`)                                                                                                                                                                                 | Kaydet / sil                                                                                                                                                                             |

Her sayfada **"Bu ekran ne işe yarar?"** düğmesi (`components/admin/screen-guide.tsx`) `data/admin-screen-guides.ts`
kaydından rota-prefix'e göre rehber açar (en uzun prefix kazanır). Yeni ekran = yeni kayıt. `loading.tsx` / `error.tsx`
admin kökünde. Tarihler `tr-TR` / `Europe/Istanbul` (gün sınırı TSİ, UTC+3 sabit).

### Admin API

| Uç                                                     | Ne yapar                                                                                                                        | Audit                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `GET /api/admin/stats`                                 | KPI şeridi JSON'u                                                                                                               | —                                                         |
| `GET /api/admin/leads?status&source&q&cursor&take`     | Lead listesi (e-posta maskeli) + `counts.bySource/byStatus` + `nextCursor`                                                      | —                                                         |
| `GET /api/admin/leads/:id[?reveal=1]`                  | Detay; `reveal=1` tam e-posta/telefon                                                                                           | `admin.lead_reveal_email` (yalnız reveal'de)              |
| `PATCH /api/admin/leads/:id`                           | `{action?, status?, note?, ownerUserId?, notes?}` → durum + `activity.push({at, action, note, byUserId})`                       | `admin.lead_update`                                       |
| `DELETE /api/admin/leads/:id`                          | KVKK silme; audit'e yalnız alan adı + iletişim var/yok                                                                          | `admin.lead_delete`                                       |
| `GET /api/admin/leads/export?status&source&q`          | CSV (UTF-8 BOM, ≤5000 satır); e-posta/ad yalnız `consentAt` dolu satırlarda, telefon/mesaj hiç yok, formül enjeksiyonu korumalı | `admin.lead_export`                                       |
| `GET/POST /api/admin/announcements`                    | Liste / oluştur (201)                                                                                                           | `admin.announcement_create`                               |
| `PATCH/DELETE /api/admin/announcements/:id`            | Kısmi güncelleme (aç/kapa dahil) / sil                                                                                          | `admin.announcement_update` · `admin.announcement_delete` |
| `PATCH /api/admin/tenants/:id`                         | `{plan, trialEndsAt}` — hediye süre diyaloğu da bunu kullanır                                                                   | `admin.tenant_update`                                     |
| `GET /api/admin/jobs` · `POST /api/admin/trigger-cron` | Kuyruk + bildirim + son hatalar · manuel tur (`{force?}`)                                                                       | —                                                         |

Herkese açık: `GET /api/public/announcements?placement=LANDING|PRICING|TOOLS|APP` → `{items[≤3]}` (yalnız DTO alanları;
IP başına 60/dk, `LIMITS.publicAnnouncements`).

Aksiyon → durum eşlemesi (`server/lead-admin.ts` `LEAD_ACTIONS`): `called`/`emailed` → CONTACTED · `proposal` → QUALIFIED ·
`won` → WON · `lost` → LOST · `reopen` → NEW · `note`/`owner` durum değiştirmez. Doğrudan `status` da verilebilir; geçersiz
değer 400. Geri dönüş serbesttir; her geçiş aktivite satırı üretir.

Aktivite anahtarı (`activity[].action`): aksiyonla gelen geçişte **aksiyon anahtarı** yazılır (`called`, `emailed`,
`proposal`, `won`, `lost`, `reopen` — Kârmatik `logLead` deseni), doğrudan `status` verildiğinde `status:<DURUM>`.
Durum değiştiren her satırda ayrıca `status: <yeni durum>` alanı bulunur; durum geçmişi `action` önekine değil bu
alana bakılarak türetilir (spec §5.4 "status:<X>" biçiminden bilinçli sapma). `note`/`owner` satırlarında `status` yoktur.

## Lead yaşam döngüsü ve KVKK

`NEW → CONTACTED → QUALIFIED → WON | LOST`. Kaynaklar: TOOL (14 ücretsiz araç; yalnız hostname + skor, PII yok), CONTACT
(iletişim formu; PII yalnız `consentAt` ile), ONBOARDING (kayıt olan tenant sitesi + ajans beyanı), RANK_CHECK, ADMIN.
Otomatik aktivite: "Form dolduruldu", 3+ taramada "Tekrar tarama ×N". Durum yalnız admin değiştirir.

- Lead verisi hiçbir LLM'e gitmez (`leads.ts` ve `lead-admin.ts` `@independentai/ai` import etmez; kaynak grep testi).
- Listede/detayda e-posta `a***@site.com`, telefon `*******33`; tam değer "E-postayı göster" ile ve audit'lidir.
- CSV'de e-posta/ad yalnız onaylı satırlarda; telefon ve mesaj hiç yazılmaz.
- Silme hakkı: `DELETE` audit'li; saklama: iletişim lead'i 24 ay, araç lead'i hostname bazlı; `PublicScan` 30 gün.
- İYS ayrı kutu/tarih (`iysConsentAt`); işaretsizse pazarlama e-postası gönderilmez.

## Duyuru şeridi

`components/announcement-banner.tsx` (`'use client'`, `role="status"`, `aria-live="polite"`) `GET /api/public/announcements`
ile yayındaki duyuruları çeker; kapatma `localStorage["iai_ann:<id>"] = updatedAt`. Her düzenleme (metin/bağlantı,
tarih aralığı ve aç/kapa dahil — Prisma `@updatedAt`) `updatedAt`'i yeniler ve şerit kapatanlara yeniden görünür; yalnız
silinip yeniden açılmayan, dokunulmamış duyuru gizli kalır. Depolama/ağ hatası yutulur (şerit çizilmez). Yerleşimler
INTEGRATE'te bağlanır: `(home)/layout` LANDING · `(marketing)/layout` TOOLS · `dashboard/layout` APP · pricing PRICING.

## Plan / deneme yönetimi (fiyat ve ödeme sağlayıcısı henüz yok)

- Her tenant `LAUNCH` planında başlar; `trialEndsAt` = kayıt + teklifteki deneme günü (`/admin/system`). Süre +
  `TRIAL_GRACE_DAYS` (7) dolunca hesap **salt-okunur**: okuma/panel açık, yazma/çalıştırma/cron kapalı, veri silinmez.
- Süre uzatmak: tenant detayında "Deneme bitişi" tarihini ileri alın ya da **Hediye süre** [7/14/30/90/365] — yeni bitiş =
  max(şimdi, mevcut bitiş) + gün; audit `admin.tenant_update`.
- Ücretli müşteri (sözleşme elle yapıldıysa): planı `STARTER`/`GROWTH` yapın → deneme süresinden bağımsız aktif olur.
- Limitler: `apps/web/src/server/entitlement.ts` (LAUNCH: 1 marka, 200 soru, 50 rakip, 5 üye, 5 token, 60 manuel run/gün).
- Rozet (`userStatusBadge`): ücretli → Aktif; LAUNCH süre içinde → Deneme; ek süre de bitmiş → Süresi doldu.

## Cron ve kuyruk

- Günlük tur 23:00 UTC (±59 dk). Akış: kuyruğa yaz (gün başına `(soru, model)` tek satır) → 6'lık paralel dilimlerle işle
  → bütçe (230 s) dolarsa kalanı **zincirleme** tetikle (`?hop=n`, ≤12) → bittiğinde retry satırları (rate_limit/timeout/
  server, en fazla 3 deneme) → düşüş uyarıları. Hop 0'da ayrıca süresi dolan `PublicScan` temizliği ve ajans sinyali
  hesaplaması (W5).
- Takılı iş: RUNNING satırın lease'i (2 dk) dolunca otomatik yeniden claim edilir. `/admin/system` → "Bekleyen" 0'a
  inmiyorsa **manuel tur** butonu (force kapalı) kalanı işler.
- `force`: bugün çalışmış olsa bile tam tur üretir (maliyetli; test için).
- Süresi dolmuş (salt-okunur) tenant'lar kuyruğa girmez.

## Bildirimler

- E-posta için `RESEND_API_KEY` şart; yoksa `/admin/system` "skipped" gösterir ve genel bakışta "Atlanan bildirim · 7 gün"
  kutusu artar; davetler linkle paylaşılır, şifre sıfırlama UI'da "kapalı" der. İletişim formu lead'i e-posta gitmese de
  kaydedilir (`NotificationLog {kind:'contact', status:'skipped'}`).
- Haftalık rapor Pazartesi 06:00 UTC, tenant başına 6 günde en fazla 1 (idempotent). Düşüş uyarısı günde en fazla 1.
- Slack webhook'ları DB'de şifreli; panelde maskeli görünür; test mesajı tenant başına 3/saat.

## Demo verisi

`POST /api/admin/seed-demo` (`Authorization: Bearer $CRON_SECRET`). Production'da ayrıca `IAI_ALLOW_DEMO_SEED=1`
gerekir; yalnızca `demo@independentai.space` tenant'ına dokunur. Seed hesabı süper admindir; public demo için ayrı VIEWER
hesabı sabah kararıdır.

## Veri talepleri (KVKK)

- Dışa aktarma: kullanıcı `Ayarlar → Verilerimi dışa aktar` (OWNER). Destek talebi için aynı JSON'u
  `GET /api/account/export` üretir.
- Silme: `Ayarlar → Hesabı sil` (OWNER, "HESABIMI SİL" onayı) tüm tenant verisini geri dönüşsüz siler; audit log'a
  yalnızca tenant adı/id yazılır. Lead ve PublicScan'deki `tenantId` null'lanır, ajans sinyali silinir.
- Loglar kişisel veri maskeler (e-posta `a***@x.com`, token/anahtar/webhook `[redacted]`).

## Ajans hesapları

- `Tenant.kind = AGENCY` olan tenant'lar ajans ev hesabıdır; müşteriler `AgencyWorkspace` ile bağlıdır. Ajans planı
  (`AgencyAccount.plan`: LAUNCH/STUDIO/SCALE) yalnızca süper admin tarafından değiştirilir; fiyat yoktur.
- Limitler (`entitlement.ts`): LAUNCH 5 koltuk / 10 müşteri / 20 paylaşım linki; STUDIO 15/40/100; SCALE 100/500/1000.
- Sorun giderme: kullanıcı "müşteriyi göremiyorum" → `AgencyMembership.allClients` veya `WorkspaceAccess` satırı var mı,
  `AgencyWorkspace.status` ARCHIVED mi? Erişim değişimi `sessionVersion` artırır; kullanıcı yeniden giriş yapmalıdır.
- Ajans **adayları** (henüz ajans olmayan, çok site tarayan ziyaretçi/hesaplar) `/admin/agency-candidates` (W5).

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

## AI Discovery Sensor

- **Site durumları**: `PENDING` (kurulum bekliyor) → `ACTIVE` (ilk geçerli olay geldi) · `PAUSED` (olay kabul edilmez,
  veri korunur) · `REVOKED` (anahtar iptal, ingest reddedilir). İptal edilen site yeniden açılamaz; yeni anahtar üretilir.
- **Anahtarlar**: public key yalnızca yazar (siteye gömülür, herkes görebilir), DB'de sha256 özeti tutulur. Sunucu/edge
  ingest sırrı AES-GCM ile şifreli saklanır ve panelde bir kez gösterilir. `CONFIG_ENCRYPTION_KEY` değişirse sır
  yeniden üretilmelidir.
- **Sık sorun**: "olay gelmiyor" → (1) origin allowlist'te mi (exact eşleşme, wildcard yok), (2) site PAUSED/REVOKED mi,
  (3) aylık kota (`sensorEventsPerMonth`) dolmuş mu — collector 429 `quota_exceeded` döner, (4) müşterinin CSP'si
  `connect-src`/`script-src` izni veriyor mu.
- **"Crawler görünmüyor"**: tarayıcı script'i JavaScript çalıştırmayan botları göremez; sunucu/edge kanalı kurulmalıdır.
  Panelde browser/server sağlığı ayrı gösterilir.
- **Doğrulama seviyeleri**: yalnızca user-agent eşleşmesi `UNVERIFIED`'dır ve öyle etiketlenir; `VERIFIED` için edge
  sinyali, resmî IP aralığı, ters DNS veya imza gerekir. `Google-Extended`/`Applebot-Extended` ziyaret üretmez.
- **Veri temizliği**: ham olaylar `retentionDays` sonunda cron'da silinir; gün bazlı `AiTrafficRollup` kalır. Site
  silinirse tüm telemetri cascade ile gider.

## INTEGRATE notları (W4)

`.registry/W4.json` yalnız §2.9 sözleşmesindeki alanları taşır; uygulama notları burada:

- `admin/layout.tsx` `ADMIN_NAV`: girişleri `order`'a göre sırala (Genel Bakış 10 varsayımı: Lead’ler 20 · Taramalar 30 ·
  Ajans adayları 40 (W5) · Tenants 50 · Duyurular 60 · Yasaklı siteler 70 (W5) · Kullanıcılar/Run/Sistem sonra) ve `<Link>`
  yerine `components/admin/admin-nav-link.tsx` `AdminNavLink` (`aria-current="page"`) kullan; `/admin` girişi `exact`.
- `layoutSlots`: `AnnouncementBanner placement="LANDING"` → `(home)/layout.tsx` `<Header/>` ile `<main>` arasına;
  `"TOOLS"` → `(marketing)/layout.tsx` aynı konum; `"APP"` → `dashboard/layout.tsx` (W5'in dosyası) TopBar altına.
  `'use client'` bileşen, veriyi `/api/public/announcements`'tan çeker (`initial` verilirse ağ isteği yapmaz). `PRICING`
  yerleşimi `(marketing)/pricing/page.tsx`'e ayrıca eklenir.
- `ScreenGuide` düğmesi W4 sayfalarının içinde (page.tsx başlık satırı). Layout'a taşınırsa sayfalardan kaldırılmalı; aksi
  hâlde çift görünür. `admin/runs` ve `admin/system` için rehber kaydı hazır (`data/admin-screen-guides.ts`) — layout'a
  eklenmezse o sayfalar düğmesiz kalır.
- **W5 bağımlılığı (kırık link riski):** `/admin` KPI kutuları `/admin/agency-candidates` ve `/admin/blocked-sites`'a,
  `/admin/scans` "Yasakla" → `/admin/blocked-sites?hostname=` (W5 formu ön-doldurur), `/admin/leads/[id]` "Ajans adayları →"
  W5 sayfalarına bağlanır. W5 merge'ünü W4'ten önce ya da aynı turda yap; W5 gecikirse `admin/page.tsx`'teki iki `KpiTile`'ı
  `href`siz bırak ve `scans/page.tsx` "Yasakla" bağlantılarını gizle.
- `apps/web/src/server/admin.ts`'e additive: `listAdminUsers`, `listAdminTenants`, `userStatusBadge`, `listSuperAdmins`,
  `ADMIN_PAGE_SIZE`. `listAllUsers`/`listAllTenants` korunur (artık sayfalar kullanmıyor).
- `admin/tenants/[id]/page.tsx`'e yalnız 4 satır eklendi: `GiftDialog` + `ScreenGuide` + `force-dynamic`.
- `tests/e2e/admin.spec.ts` "duyuru" testi `(home)/layout`'a `AnnouncementBanner` bağlandıktan sonra geçer.

## Testler

- Entegrasyon: `tests/integration/{admin-leads,admin-announcements,admin-stats,admin-users}.test.ts` — 401/403,
  `createTenant({superAdmin:true})` pozitif, cursor 2 sayfa, activity sırası, DELETE/reveal/export audit satırları, yanıtta
  `/passwordHash|secret|sk-|visitorHash/` yok, duyuru görünürlük kuralları, public limit 429, stats seed eşleşmesi.
- E2E: `tests/e2e/admin.spec.ts` (INTEGRATE'te koşulur; landing şeridi `(home)/layout`'a `AnnouncementBanner` bağlandıktan sonra).
