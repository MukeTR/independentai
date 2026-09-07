# Mimari ve güvenlik modeli

## Topoloji

```
Kullanıcı ─HTTPS─▶ Cloudflare (DNS/proxy) ─▶ Vercel fra1 ─┬─ Next.js 15 App Router (UI + /api/*)
                                                        ├─ middleware: CSP nonce + güvenlik başlıkları
                                                        └─ Vercel Cron → /api/cron/daily-run (23:00 UTC), weekly-report (Pzt 06:00)
                                                                 │ Prisma (pooler 6543, pgbouncer, connection_limit=1)
                                                                 ▼
                                                   Supabase Postgres eu-central-1
                                                   (uygulama verisi + kuyruk + rate limit + audit + bildirim logu)
                                                                 │
                              OpenAI · Anthropic · Google (web arama) · Resend (e-posta) · Slack (webhook)
```

Worker/Redis yok. Tüm zamanlanmış iş Postgres satırları üzerinden; fonksiyon süresi ≤300 s (Hobby).

## İstek yaşam döngüsü

1. `middleware.ts`: her sayfa isteğine nonce'lu CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
   Nonce yalnızca **dinamik render** ile script'lere işlenir; bu yüzden kök layout `dynamic = 'force-dynamic'`
   (statik prerender + nonce CSP = script'ler engellenir, hydration olmaz — 7 Eyl 2026'da yerel E2E ile yakalandı).
   API rotaları `next.config` `headers()` ile temel başlıkları alır; CORS yalnızca `/api/v1/*` (route kendisi yazar).
2. Route handler `route()` sarmalayıcısı: `x-request-id`, `Cache-Control: no-store`, merkezi hata dönüşümü
   (`{message, code, requestId}`; 5xx'te iç detay sızmaz, loglanır).
3. Yetki: `requireActor({ role?, write?, active?, directOnly?, brandContext? })` — JWT çerezi doğrulanır, ardından **DB'den**
   kullanıcı/rol/tenant/`sessionVersion` okunur (eski claim'e güvenilmez); ajans üyesinde `iai_ws` çerezi DB'de doğrulanır
   (bkz. Ajans katmanı). `write` → VIEWER 403, deneme dolmuşsa 403 `trial_expired`, duraklatılmış müşteri alanında 403.
   Süper admin `requireSuperAdmin()`, ajans işlemleri `requireAgencyActor(minRole)`.
4. Girdi: `normalize.ts` (Türkçe katlama, uzunluk sınırları, URL/e-posta doğrulama); `readJson` gövde sınırı 64 KB.
5. Rate limit: `RateLimitBucket` tablosunda atomik UPSERT (instance'lar arası tutarlı). IP: `cf-connecting-ip` →
   `x-real-ip` → `x-forwarded-for` → UA parmak izi. Küresel tavan ikinci hat. Başlıklar `X-RateLimit-*`, `Retry-After`.

## Oturum

- JWT HS256 (`jose`), issuer/audience sabit, 14 gün, `httpOnly; SameSite=Lax; Secure`.
- Claim'ler: `userId, tenantId, email, sv`. `sv` = `User.sessionVersion`; şifre değişimi, "tüm cihazlardan çıkış",
  rol değişimi, ekip taşınması `sv`'yi artırır → eski çerezler anında geçersiz.
- OAuth (Google/LinkedIn OIDC): `state` çerezi (CSRF); aynı e-postalı hesaba otomatik bağlama **yalnızca**
  `email_verified=true` ise; aksi halde `oauth_email_unverified` ile reddedilir.
- Şifre: scrypt (N=16384, 64 byte), sabit zamanlı karşılaştırma. Sıfırlama/doğrulama tokenları SHA-256 hash'li, tek
  kullanımlık, süreli.

## Kuyruk ve idempotency

`ModelRun` satırı iş kaydıdır: `PENDING → RUNNING(lease 120 s) → SUCCESS | ERROR`.
`dedupeKey = promptId:provider:YYYY-MM-DD:attempt` UNIQUE → gün başına tek satır; retry attempt'i ayrı satır.
Claim: `UPDATE … WHERE status='PENDING' OR (RUNNING AND lease dolmuş) … FOR UPDATE SKIP LOCKED LIMIT 6`.
Cron bütçesi dolunca `after()` ile `?hop=n+1` kendini tetikler (≤12). `RunBatch` tablosu gözlem içindir.

## AI katmanı

- `packages/ai/models.ts`: model allowlist + env override + tarihçeli fiyat kataloğu; bilinmeyen model → maliyet `null`.
- Adapter'lar: 40 s zaman aşımı, retryable hatalarda 1 retry (jitter), hata sınıflandırma (`auth|rate_limit|timeout|
server|invalid|not_configured`). Native web arama açıkken atıflar sağlayıcıdan; desteklenmezse düz moda düşer.
- Production'da anahtarsız sağlayıcı **hata** üretir; mock yalnızca `IAI_ALLOW_MOCK=1` veya non-production.
- Sentiment/tip sınıflandırması tek ek LLM çağrısı; maliyeti ve gecikmesi run'a eklenir.

## SSRF savunması (`safe-fetch.ts`)

Yalnızca http/https ve 80/443; kimlik bilgisi yasak; bloklu host adları; özel/loopback/link-local/CGNAT/multicast/
IPv4-mapped/NAT64/6to4 aralıkları; DNS çözümü **bağlantı soketinin lookup'ında** doğrulanır (rebinding/TOCTOU yok);
redirect'ler manuel ve her hop yeniden doğrulanır; gövde 2 MB'ta kesilir; content-type allowlist; zaman aşımı.

## Gizlilik ve sırlar

- Provider anahtarları ve Slack webhook'ları AES-256-GCM (`CONFIG_ENCRYPTION_KEY` || `JWT_SECRET` türevi, rotasyon
  için `_PREVIOUS`).
- Loglar JSON satırı; `logger.sanitize` anahtar/token/webhook/e-posta maskeler. Prompt cevapları loglanmaz.
- Audit log: token oluşturma/iptal, üye işlemleri, silme, admin işlemleri, kayıt/giriş hataları (IP ile).
- Veri saklama: ölçüm verisi hesap silinene kadar; hesap silme tam kaskad; `NotificationLog`/`AuditLog` maskelenmiş
  alıcı ile tutulur. Health ucu sır içermez.

## Ajans katmanı (Faz A0)

- `Tenant.kind = BRAND | AGENCY`. Ajans ev tenant'ı marka verisi tutmaz; `AgencyAccount` (plan LAUNCH/STUDIO/SCALE),
  `AgencyMembership` (OWNER/ADMIN/STRATEGIST/ANALYST, `allClients`), `AgencyWorkspace` (müşteri tenant'ı ↔ ajans;
  ACTIVE/PAUSED/ARCHIVED), `WorkspaceAccess` (üye → müşteri ataması, `roleOverride`).
- **Erişim çözümleme** (`authz.ts`): oturum çerezi → kullanıcı; ajans üyesiyse `iai_ws` çerezindeki tenantId **DB'de**
  doğrulanır (AgencyWorkspace aynı ajansa ait, ARCHIVED değil, üye `allClients` veya `WorkspaceAccess`). Geçersizse
  sessizce ajans ev tenant'ına düşülür. Efektif rol: ajans rolü → tenant rolü (OWNER→OWNER, ADMIN/STRATEGIST→ADMIN,
  ANALYST→VIEWER; `roleOverride` öncelikli). PAUSED alanda `entitlement.active=false, reason=workspace_paused`
  (okuma serbest, yazma/ölçüm 403). `requireActor({ directOnly })` hesap silme ve sahiplik devrini ajans üzerinden yasaklar;
  `{ brandContext }` marka verisi isteyen uçları ajans ev tenant'ında reddeder.
- Müşteri bağlama iki yolla: ajans kendi oluşturur (yeni tenant) **veya** mevcut marka hesabının OWNER'ı bağlama isteğini
  onaylar (`AgencyLinkRequest`; veri sahipliği markada kalır, ajans erişim alır). Portföyden çıkarma yalnızca ilişkiyi keser.
- Erişim değişimleri (atama, rol, askı, devir) etkilenen kullanıcıların `sessionVersion`'ını artırır → oturum ve Realtime
  tokenları yeniden doğrulanır. Limitler (koltuk/müşteri) transaction içinde `FOR UPDATE` ile kontrol edilir.
- Portföy toplulaştırması `docs/METRICS.md` → "Portföy".

## Realtime (Faz B)

- Supabase Realtime **private Broadcast** + Presence. Kanallar: `tenant:<tenantId>`, `agency:<agencyId>`; wildcard yok.
- Yayın **sunucudan**, veri değişikliğiyle aynı transaction'da: `realtime.send(payload, event, topic, private=true)`
  (`server/realtime.ts` → `publish`/`publishForTenant`). Rollback → olay yok. Realtime yapılandırılmamışsa no-op.
- Token: `GET /api/realtime/token` uygulama oturumunu doğrular, DB'den güncel rol/tenant/`sessionVersion` ve izinli topic
  listesini okur, 10 dk'lık JWT imzalar (import edilmiş ES256 anahtarı veya legacy HS256). Claim'ler: `user_id, tenant_id,
app_role, session_version, agency_id, topics[]`.
- Yetki DB'de: `public.iai_realtime_can_join(topic)` (security definer) JWT claim'lerini **ve** güncel üyelik satırlarını
  kontrol eder (topic listede mi, `sessionVersion` güncel mi, doğrudan üye / ajans erişimi / ajans üyesi). `realtime.messages`
  RLS: SELECT broadcast+presence yalnızca üyelere; INSERT yalnızca presence (istemci broadcast gönderemez).
- Payload asgari ve sanitize (`sanitizePayload`: token/e-posta/yanıt metni anahtarları atılır, string ≤200). AI yanıtı,
  katalog ham verisi, kimlik bilgisi asla yayınlanmaz.
- İstemci (`lib/realtime-client.ts`): token yenileme (exp-60 sn), üstel geri çekilme (1…30 sn, 5 başarısızlıkta polling
  30 sn), `eventId` dedupe (500), görünürlük kontrolü. Kalıcı durum her zaman API'dedir; Realtime yalnızca "tazele" sinyali.

## Commerce entegrasyonları (Faz C)

- Sözleşme: `CommerceConnector` (`server/commerce/types.ts`) — verify / listProducts (imleçli) / countProducts /
  listCategories / registerWebhooks / getProduct; `capabilities()` sağlayıcının neyi desteklediğini bildirir (UI rozetleri buradan).
- Kayıt defteri tembel yükler (`registry.ts`); hata modeli tek (`CommerceError` kodları: AUTH_INVALID, AUTH_EXPIRED,
  SCOPE_MISSING, RATE_LIMITED, NOT_FOUND, INVALID_STORE, UPSTREAM_ERROR, NETWORK, UNSUPPORTED, CONFIG_MISSING,
  LIMIT_EXCEEDED, WEBHOOK_INVALID; kullanıcı metinleri `messages.ts`).
- Kimlik bilgileri: AES-256-GCM JSON (`credentialsEnc`); API'ye `publicConnectionView` (secret yok). Sağlayıcı host'ları
  regex/`parsePublicUrl` ile doğrulanır (SSRF).
- **Senkron motoru** (`catalog-sync.ts`): `CatalogSync` iş satırı; bağlantı başına tek aktif iş (bağlantı satırı kilidi),
  cron için günlük `dedupeKey`; `FOR UPDATE SKIP LOCKED` + 120 sn kira; sayfa başına imleç/sayaç yazımı → bütçe bitince
  kaldığı yerden devam; `contentHash` eşitse yazma yok; tam senkron sonunda görülmeyenler soft-delete; retryable hata 3 deneme
  (kira ile erteleme), yetki hatası bağlantıyı ERROR yapar; plan sınırı aşımında kısmi + `LIMIT_EXCEEDED`.
  Ham SQL'de zaman parametreleri `AT TIME ZONE 'UTC'` ile normalize edilir (Prisma UTC naive yazar; oturum TZ'sine bağımlılık yok).
- Webhook'lar: HMAC (Shopify) / URL anahtarı + yeniden çekme (ikas); `IntegrationWebhookDelivery (provider, externalId)`
  UNIQUE ile dedupe; 200 hemen, işleme `after()`; Ticimax webhook desteklemez → günlük senkron.
- v1 yalnızca ürün/kategori/mağaza meta; sipariş/müşteri/ödeme verisi çekilmez.

## AI Discovery Sensor (Faz S)

Her tür web sitesine (SaaS, hizmet, klinik, eğitim, turizm, medya, pazar yeri, e-ticaret, plain HTML/WordPress/SPA)
tek satır script ile kurulan ölçüm katmanı. E-ticaret yalnızca bir hedef şablonudur; çekirdek model ürün/katalog/sipariş
varlığı gerektirmez.

### İki ayrı kanal (asla karıştırılmaz)

| Kanal       | Kaynak                                                                   | Ne ölçer                                                                              | Neyi ölçemez                          |
| ----------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Browser SDK | `/sensor/v1.js` → `/api/collect/v1/{event,batch}`                        | AI ürününden gelen **gerçek insan** ziyareti, sayfa/varlık etkileşimi, hedef dönüşümü | JavaScript çalıştırmayan crawler'ları |
| Server/edge | Cloudflare Worker / Next.js middleware → `/api/collect/v1/server` (HMAC) | AI crawler/fetcher **istekleri** (bot, yol, durum, doğrulama seviyesi)                | Tarayıcı içi etkileşimi               |

Üçüncü bir ölçüm zaten vardır ve panelde ayrı gösterilir: **sentetik** görünürlük testleri (`ModelRun`) — bunlar
Independent AI'ın kendi sorduğu sorulardır, gerçek ziyaretçi değildir.

### Güvenlik zinciri (collector)

1. Gövde boyutu (16 KB tarayıcı / 256 KB sunucu) ve zod şeması
2. Public key → `TrackedSite` (sha256 özetiyle arama; ham anahtar saklanmaz). Public key **yalnızca yazar**.
3. Site durumu: `PAUSED`/`REVOKED` reddedilir
4. `Origin` başlığı allowlist'te mi — **exact eşleşme**, wildcard/substring yok; CORS yanıtı yalnızca o origin'i
   yansıtır (`Vary: Origin`, credential yok). SDK `text/plain` gövdeyle gönderir → önden yoklama (preflight) yok.
5. Hız sınırı: site 600/dk, IP 240/dk, küresel 60.000/dk + plan bazlı aylık olay kotası (`sensorEventsPerMonth`)
6. Zaman kayması (ileri 5 dk / geri 24 saat) ve `eventId` tekilliği (tekrar teslim yok sayılır)
7. Normalizasyon: query/hash düşürülür, referrer yalnızca **host**'a indirilir, e-posta/telefon/token kalıpları
   temizlenir, uzunluklar sınırlanır

Sunucu kanalı ayrıca `X-IAI-Timestamp` + `X-IAI-Signature` (HMAC-SHA256, gövde+zaman damgası) ister; ingest sırrı
AES-GCM ile şifreli saklanır (imza yeniden hesaplanabilmeli). Ham erişim logu, Cookie, Authorization ve kalıcı IP
kabul edilmez; `ip` alanı yalnızca ters DNS doğrulaması için anlıktır ve **yazılmaz**.

### Bot doğrulama

`edge sinyali → resmî IP aralığı → ters DNS + ileri doğrulama → imza → yalnızca user-agent`. Son basamak asla
`VERIFIED` üretmez. `Google-Extended` ve `Applebot-Extended` ayrı crawler değil, robots kontrol token'larıdır: ziyaret
kaydı oluşturmazlar. Ters DNS sorguları 1,5 sn zaman aşımı ve 6 saatlik önbellekle, yanıt sonrası (`after()`) yapılır.

### Veri modeli ve saklama

`TrackedSite` (anahtarlar, origin allowlist, sağlık, retention) · `SiteGoal` (PATH/EVENT/DATA_ATTRIBUTE) ·
`AiAcquisitionSession` (çerezsiz, 12 saatlik anonim gruplama; benzersiz kişi iddiası yok) · `AiJourneyEvent` ·
`AiCrawlerEvent` · `PromptAttribution` (USER_REPORTED | INFERRED | SYNTHETIC) · `AiBotIdentity` · `AiTrafficRollup`.

Ham olaylar site başına `retentionDays` (varsayılan 90, en az 7) sonra silinir; gün bazlı `AiTrafficRollup` satırları
kalır. Rollup ve temizlik günlük cron'un (`/api/cron/daily-run`) kalan bütçesinde idempotent çalışır.

### Realtime

`discovery.updated` (site başına en fazla 10 sn'de bir, toplu), `discovery.goal` (dönüşüm), `sensor.health` (kurulum
doğrulandı/bozuldu). Her sayfa görüntüleme yayınlanmaz. Tenant/ajans topic yetkisi mevcut RLS ile aynıdır.

## Test stratejisi

- Unit (vitest): çıkarım, fiyat/maliyet, SSRF, normalizasyon, entitlement, JWT/şifre/şifreleme, hata biçimi, metrikler.
- Integration (vitest + yerel Postgres): kayıt transaction/yarış, RBAC, IDOR, deneme süresi, onboarding atomikliği,
  kuyruk idempotency/lease/retry, cron ucu, token yaşam döngüsü, rate limit, Slack şifreleme, ekip, hesap silme/export,
  araç SSRF/limit; ajans erişim çözümleme ve cross-tenant izolasyon; Realtime yayınları (yerel `realtime` stub şeması,
  `tests/integration/realtime-stub.sql`) ve RLS fonksiyonu; katalog senkron motoru (sahte bağlayıcı); webhook HMAC/dedupe.
  Production adresi reddedilir. Discovery: collector yetki/origin/dedupe/hedef/imza testleri ve PII-IP sızmama kanıtı.
- E2E (Playwright, masaüstü + mobil Chromium): kayıt→onboarding→panel, giriş/çıkış, soru ekle/çalıştır, rakip,
  Viewer reddi, token oluştur/kullan/iptal, public araç limiti, mobil taşma, 404, güvenlik başlıkları.
