# Realtime (Supabase Broadcast + Presence)

Panelde ölçüm/ekip/bildirim/entegrasyon olaylarının **sayfa yenilemeden** görünmesi için Supabase Realtime kullanılır.
Realtime **best-effort** bir katmandır: kalıcı durum her zaman Postgres'te ve API'dedir; Realtime kapalıyken veya
bağlantı düşünce panel **polling** ile aynı bilgiyi 3–30 sn gecikmeyle gösterir. Realtime env değişkenleri yoksa
kod yolu tamamen no-op'tur (`{ enabled:false }` → istemci polling).

## Mimari

```
                          (1) realtime.send(payload, event, topic, private=true)  ── aynı transaction ──┐
Next.js sunucu (Prisma) ─────────────────────────────────────────────────────────▶ Supabase Postgres       │
   server/realtime.ts publish()/publishForTenant()                                 realtime.messages ◀────┘
                                                                                        │ RLS (SELECT): iai_realtime_can_join(topic)
                                                                                        ▼
Tarayıcı ◀── WebSocket (private channel "tenant:<id>" / "agency:<id>") ── Supabase Realtime (WAL → broadcast)
   lib/realtime-client.ts useRealtime() ── (2) GET /api/realtime/token (10 dk JWT) ── app/api/realtime/token
   components/realtime-provider.tsx RealtimeProvider ── useRealtimeEvent / useRealtimeStatus / RealtimeBadge
```

1. **Sunucu yayını, transaction içinde.** `publish(topic, payload, tx?)` → `SELECT realtime.send(...)`. Yayın, veri
   değişikliğiyle aynı `tx` içinde çağrılır (rollback → hayalet olay yok). Realtime yapılandırılmamışsa
   (`realtimePublishEnabled()` false) fonksiyon hiçbir şey yapmaz; hata olursa loglar, iş akışını bozmaz.
   `publishForTenant(tenantId, payload, tx?)` tenant topic'ine ve varsa müşteri çalışma alanının ajans topic'ine
   (`tenantId` eklenmiş kopyasıyla) yayınlar.
2. **Private channel + RLS.** İstemci kanalı `config.private = true` ile açar; Supabase her `SELECT`'i
   `realtime.messages` üzerindeki politikayla doğrular. Politika `public.iai_realtime_can_join(topic)` fonksiyonunu
   çağırır (bkz. `supabase/realtime-policies.sql`): JWT'deki `user_id` + `session_version` DB ile eşleşmeli, topic
   JWT'deki `topics` listesinde olmalı, **ve** kullanıcı o an gerçekten üye olmalı (doğrudan `User.tenantId` ya da
   aktif `AgencyMembership` + `allClients`/`WorkspaceAccess`, çalışma alanı ARCHIVED değil). İstemci broadcast
   **gönderemez** (INSERT politikası yalnızca presence).
3. **Token akışı.** Uygulama oturumu (`iai_token` çerezi) → `requireActor()` → DB'den güncel kullanıcı/tenant/rol/
   `sessionVersion` → `allowedRealtimeTopics(actor)` → `mintRealtimeToken()`. Claim'ler: `role=authenticated`,
   `aud=authenticated`, `iss=<SUPABASE_URL>/auth/v1`, `sub=user_id`, `user_id`, `tenant_id`, `app_role`,
   `session_version`, `agency_id`, `topics[]` (≤50). İmza: `SUPABASE_JWT_PRIVATE_KEY_JWK` (ES256/RS256, `kid` ile —
   Supabase "JWT Signing Keys"e import edilen anahtar) tercih edilir; yoksa `SUPABASE_JWT_SECRET` (HS256 legacy).
4. **TTL / yenileme.** Token 10 dk (`REALTIME_TOKEN_TTL_SEC`). İstemci süresi dolmadan ~60 sn önce yeni token alır ve
   `realtime.setAuth()` ile bağlantıya uygular. Sekme gizliyken bağlantı korunur; görünür olunca tazelik kontrol edilir.
   Rol/tenant/erişim değişimi `sessionVersion`'ı artırır → bir sonraki yenilemede yeni claim'ler; RLS eski
   `session_version`'ı anında reddeder (eski token'la yeni mesaj alınamaz).
5. **Reconnect / backoff / polling.** `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` → üstel geri çekilme 1 s…30 s (+jitter).
   5 ardışık başarısızlıkta `status='polling'`: `RealtimeProvider` 30 sn'de bir `router.refresh()`, rozet "30 sn".
   Sunucu `{ enabled:false }` derse de aynı mod. Bileşenler kendi polling'lerini korur (run-progress: canlıda 10 sn,
   değilse 3 sn; aktivite akışı: canlı değilse 30 sn).
6. **Dedupe.** Her yayın `eventId` taşır; istemci son 500 `eventId`'yi hatırlar, tekrar teslimi yok sayar.
   `RealtimeProvider` ayrıca `router.refresh()`'i en fazla 2 sn'de bir yapar (olay fırtınası koruması).
7. **Presence.** `usePresence(topic, {name, role, page})` → `"<topic>:presence"` kanalında `track()`. Yalnızca kısa meta
   (ad/rol/sayfa); e-posta paylaşılmaz. Ekip ekranındaki "çevrimiçi" noktası Realtime yoksa hiç gösterilmez.

### Olaylar ve payload sözleşmesi

| event                                      | Kim yayınlar                                              | Alanlar (entityId …)                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `run.completed`                            | `server/run-prompt.ts` `executeRun` (ModelRun tx içinde)  | entityId=promptId, jobId=runId, status SUCCESS/ERROR, provider, origin, errorCode?                                                         |
| `batch.completed`                          | `runDuePrompts` sonunda, turda run'ı işlenen her tenant'a | entityId=jobId=RunBatch id, status SUCCESS/PARTIAL, processed, failed, hop                                                                 |
| `notification.delivered`                   | `server/mailer.ts` `record()` (NotificationLog yazımı)    | entityId=NotificationLog id, channel email/slack, status sent/failed, kind                                                                 |
| `team.changed`                             | `server/team.ts` her mutasyon (tx içinde)                 | entityId=user/invite id, status invite_sent/invite_resent/invite_cancelled/member_joined/role_changed/member_removed/ownership_transferred |
| `agency.changed`                           | `server/agency.ts`                                        | entityId=workspace/membership id, status …                                                                                                 |
| `integration.sync` / `integration.changed` | `server/commerce/*`                                       | entityId=connection id, progress, summary                                                                                                  |
| `run.progress`                             | (ayrılmış; henüz yayınlanmıyor)                           | entityId, progress 0-100                                                                                                                   |

Her payload'a sunucu `ts` (ISO) ve `eventId` ekler. **Yasak alanlar** `sanitizePayload()` ile otomatik atılır
(`responseText|token|secret|password|webhook|email|credentials|apiKey` anahtar adları); string'ler 200 karaktere
kısaltılır; iç içe nesne yok; diziler ≤20 skalar. AI yanıt metni, e-posta, webhook URL'si, kimlik bilgisi veya ham
katalog verisi **asla** yayınlanmaz — testler `realtime.messages` stub'unda bunu doğrular.

### İstemci kullanımı

```tsx
// dashboard/layout.tsx — topics = istenen ∩ allowedRealtimeTopics(actor)
<RealtimeProvider topics={topics}>
  …<RealtimeBadge />
</RealtimeProvider>;

// herhangi bir client bileşen
useRealtimeEvent('run.completed', (evt) => {
  if (evt.entityId === promptId) refetch();
});
const { status } = useRealtimeStatus(); // 'idle' | 'connecting' | 'live' | 'polling' | 'disabled'
```

Provider dışında kullanılırsa `useRealtimeEvent` no-op, `status='disabled'` döner — bileşenler bu yüzden polling
fallback'ini her zaman korur.

## Supabase tarafında yapılacaklar (bir kez)

1. **SQL'i uygula:** `supabase/realtime-policies.sql` dosyasını Supabase SQL Editor'de çalıştır (veya yerelden
   `pnpm db:realtime:apply`, DIRECT_URL ile; `pnpm db:realtime:check` durumu doğrular). Fonksiyon `security definer`
   - `search_path=''`; `authenticated` rolüne yalnızca execute verilir. Prisma migration'larına dahil değildir
     (realtime şeması yalnızca Supabase'de var).
2. **Public access'i kapat:** Dashboard → Realtime → Settings → "Allow public access" **OFF**. Böylece yalnızca
   private channel'lar ve RLS geçerli olur; anon key ile açık kanal dinlenemez.
3. **JWT imzalama:** Tercihen Dashboard → Authentication → JWT Signing Keys → kendi ES256 anahtarını **import** et
   (özel anahtar JWK'sını `SUPABASE_JWT_PRIVATE_KEY_JWK`, `kid` dahil). Alternatif: proje "legacy JWT secret"ini
   `SUPABASE_JWT_SECRET` olarak ver (HS256). Anahtar rotasyonunda eski token'lar en fazla 10 dk yaşar.
4. **Broadcast from database:** `realtime.send()` WAL üzerinden yayınlar; `realtime.messages` üzerinde
   `supabase_realtime` publication gerekmez (broadcast tabloya yazılır, Realtime okur). Ek tablo publication'ı
   **açmayın** (postgres_changes kullanılmıyor; tenant verisi kanala sızmasın).
5. **Doğrulama:** Realtime → Inspector'da `tenant:<id>` private kanalına, `/api/realtime/token`'dan alınan JWT ile
   bağlan; bir manuel ölçüm çalıştır; `run.completed` görünmeli. Başka tenant id'siyle kanal → `CHANNEL_ERROR`.

## Ortam değişkenleri

| Ad                                     | Nerede         | Açıklama                                                                        |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | sunucu+istemci | `https://<ref>.supabase.co` — token `iss` ve istemci bağlantısı                 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sunucu+istemci | Publishable (anon) anahtar; yalnızca WebSocket el sıkışması için                |
| `SUPABASE_JWT_PRIVATE_KEY_JWK`         | sunucu         | Import edilmiş ES256/RS256 özel anahtar JWK (JSON, `kid` içerir) — tercih       |
| `SUPABASE_JWT_KID`                     | sunucu         | JWK'da `kid` yoksa                                                              |
| `SUPABASE_JWT_SECRET`                  | sunucu         | Legacy HS256 sırrı (≥32 karakter); JWK yoksa kullanılır                         |
| `REALTIME_PUBLISH`                     | sunucu         | `1` → env eksik olsa da `realtime.send` çağır (test stub'ı); `0` → yayın kapalı |

Üçü (URL + publishable key + imzalama anahtarı) yoksa `realtimeConfigured()` false → token ucu `{ enabled:false }`,
yayın no-op, rozet gizli. Hiçbir anahtar log'a, payload'a veya hata cevabına yazılmaz.

## Ölçüm ve limitler

- **Mesaj boyutu:** payload sanitize sonrası tipik 150–300 bayt; hedef < 1 KB (Supabase üst sınırı 256 KB'ın çok altı).
- **Hız:** Supabase Free/Pro planlarında 100–500 mesaj/sn ve 200–500 eşzamanlı bağlantı; bizim yayın profilimiz
  günlük cron turunda prompt×provider adedince `run.completed` + tenant başına 1 `batch.completed`. Bir tenant'ın
  200 prompt'u için ~600 mesaj/gece, saniyede ≤6 (CLAIM_BATCH=6 paralel). Manuel ölçüm 3 mesaj.
- **Token ucu rate limit:** kullanıcı başına 30/dk (`realtime-token`); normal istemci 10 dk'da 1 istek yapar.
- **İstemci başına bağlantı:** tek WebSocket (paylaşılan `SupabaseClient`), topic sayısı kadar kanal (marka: 1,
  ajans: 1 + seçili çalışma alanı).
- **Gözlem:** sunucu logları `realtime.publish_failed` (topic, event); Supabase → Reports → Realtime (bağlantı ve
  mesaj sayıları). Rozet durumları: Canlı / Bağlanıyor / 30 sn.
- **Yerel/test:** `tests/integration/realtime-stub.sql` `realtime.send()` çağrılarını `realtime.messages` tablosuna
  yazar; testler yayınları ve payload güvenliğini buradan doğrular (`REALTIME_PUBLISH=1`).

## Sorun giderme

| Belirti                                               | Olası neden / çözüm                                                                                                                                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rozet hiç görünmüyor                                  | Realtime env yok → beklenen (`enabled:false`). Üç env değişkenini de kontrol et.                                                                                                                                          |
| Rozet "30 sn"de takılı                                | 5 ardışık `CHANNEL_ERROR`. Tarayıcı konsolunda kanal hatası; büyük ihtimalle RLS reddi (aşağı bak) veya "Allow public access" açık kaldığı için private kanal politikası devreye girmiyor.                                |
| `CHANNEL_ERROR` / "Unauthorized" private kanalda      | (a) SQL uygulanmamış; (b) JWT imzası Supabase'in bildiği anahtarla değil (JWK import edilmedi / legacy secret farklı); (c) `session_version` eski — kullanıcı sayfayı yenilesin; (d) topic JWT `topics` listesinde değil. |
| Token 500 "Realtime imzalama anahtarı yok"            | `SUPABASE_JWT_SECRET` < 32 karakter veya JWK JSON bozuk.                                                                                                                                                                  |
| Yayın gelmiyor ama DB güncel                          | Sunucu logunda `realtime.publish_failed`: `realtime.send` fonksiyonu yok (Supabase sürümü eski) ya da `REALTIME_PUBLISH=0`. Panel polling ile yine güncellenir.                                                           |
| Ajans üyesi müşteri kanalını alamıyor                 | Üyelik `allClients=false` ve `WorkspaceAccess` yok; ya da çalışma alanı ARCHIVED. Token'daki `topics` listesini `/api/realtime/token` yanıtında kontrol et.                                                               |
| Aynı olay iki kez işleniyor                           | `eventId` dedupe yalnızca aynı hook örneğinde; iki ayrı `useRealtime` örneği açmayın — tek `RealtimeProvider`.                                                                                                            |
| Presence kanalı reddediliyor (`tenant:<id>:presence`) | Politika `topics ? topic` tam eşleşme arar; presence kanal adı `":presence"` ekiyle geldiği için token listesinde yoktur. Politikada `v_topics ? (v_kind                                                                  |     | ':' |     | v_id)` karşılaştırması kullanılmalı (SQL notu). |

## Güvenlik özeti

- Tenant/ajans üyeliği **DB'den** doğrulanır (JWT'ye tek başına güvenilmez); `sessionVersion` eşleşmesi zorunlu.
- İstemci hiçbir zaman broadcast **gönderemez**; yalnızca presence yazabilir (ad/rol/sayfa).
- Payload küçük ve sanitize; sırlar/PII/AI yanıtı yok. E-posta gerekiyorsa istemci API'den (yetkiyle) çeker.
- Token 10 dk; rol/erişim değişimi sessionVersion ile anında etkili. Hiçbir env sırrı istemciye gitmez
  (`anonKey` publishable'dır, tasarımı gereği açıktır).
