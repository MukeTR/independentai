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
   API rotaları `next.config` `headers()` ile temel başlıkları alır; CORS yalnızca `/api/v1/*` (route kendisi yazar).
2. Route handler `route()` sarmalayıcısı: `x-request-id`, `Cache-Control: no-store`, merkezi hata dönüşümü
   (`{message, code, requestId}`; 5xx'te iç detay sızmaz, loglanır).
3. Yetki: `requireActor({ role?, write?, active? })` — JWT çerezi doğrulanır, ardından **DB'den** kullanıcı/rol/tenant/
   `sessionVersion` okunur (eski claim'e güvenilmez). `write` → VIEWER 403, deneme dolmuşsa 403 `trial_expired`.
   Süper admin `requireSuperAdmin()`.
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

## Test stratejisi

- Unit (vitest): çıkarım, fiyat/maliyet, SSRF, normalizasyon, entitlement, JWT/şifre/şifreleme, hata biçimi, metrikler.
- Integration (vitest + yerel Postgres): kayıt transaction/yarış, RBAC, IDOR, deneme süresi, onboarding atomikliği,
  kuyruk idempotency/lease/retry, cron ucu, token yaşam döngüsü, rate limit, Slack şifreleme, ekip, hesap silme/export,
  araç SSRF/limit. Production adresi reddedilir.
- E2E (Playwright, masaüstü + mobil Chromium): kayıt→onboarding→panel, giriş/çıkış, soru ekle/çalıştır, rakip,
  Viewer reddi, token oluştur/kullan/iptal, public araç limiti, mobil taşma, 404, güvenlik başlıkları.
