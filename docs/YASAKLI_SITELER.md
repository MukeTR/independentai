# Yasaklı siteler

Admin'in listeye eklediği alan adları (ve tüm alt alan adları) hiçbir ücretsiz/panel aracında taranmaz; ziyaretçi bu alan adını **girdiği anda** admin'in belirlediği YouTube bağlantısına yönlendirilir.

## Model

`BlockedSite { id, hostname @unique, redirectUrl, note?, hits, createdById?, createdAt, updatedAt }` (`packages/db/prisma/schema.prisma`).

- `hostname` normalize edilerek saklanır: küçük harf; şema, yol, sorgu ve `www.` atılır; IDN → punycode (`url.domainToASCII`); boşluk / `@` / port reddedilir; en az iki etiket.
- `redirectUrl` yalnızca **https** ve host `youtube.com` / `www.youtube.com` / `youtu.be` (yol ve sorgu serbest; kimlik bilgisi ve port yok). `m.youtube.com` bilinçli olarak dışarıda (sabah kararı).
- `hits`: sunucu tarafında engellenen tarama denemesi sayısı (best-effort artış).

## Sunucu

`apps/web/src/server/blocklist.ts` (PREP çekirdeği)

- `normalizeHostname(raw)`, `hostnameCandidates(h)` (`a.b.acme.com` → `a.b.acme.com`, `b.acme.com`, `acme.com`; TLD hariç), `findBlockedSite(h)` (tek `findMany({hostname:{in}})`, en özgül kayıt kazanır, allowlist dışı `redirectUrl` yok sayılır), 60 sn bellek içi önbellek (instance-yerel), DB hatasında `null` + `log.warn` (tarama engellenmez), `recordBlockedHit(id)`, `blockedJson(hit)` → **200 `{blocked:true, redirectUrl}`**.

`apps/web/src/server/blocked-sites-admin.ts` (W5)

- `parseBlockedSiteInput` / `parseBlockedSitePatch`: normalize + **kamu son eki reddi** (`PUBLIC_SUFFIX_HOSTNAMES`: `com.tr`, `net.tr`, `org.tr`, `gov.tr`, `edu.tr`, `co.uk`, `github.io`, `myshopify.com` … — yerel sabit liste, tam PSL gerekmez) + YouTube allowlist + not ≤300.
- `createBlockedSite` / `updateBlockedSite` / `deleteBlockedSite`: her mutasyonda `clearBlocklistCache()`; benzersizlik ihlali → 409.
- `testBlockedHost(host)`: admin "Test et" kutusu — hits **artmaz**.

### Uygulanan yerler (yanıt her yerde 200 `{blocked, redirectUrl}`; fetch 0; PublicScan/Lead/Audit yazılmaz; rate limit tüketilir)

`handlePublicScan` (14 tarama türü; rakip host dahil), `api/tools/geo-audit` (hero), `content-audit`, `platform-detect`, `rank-check` (website varsa), `agency-preanalysis` (≤3 alan adı), `api/contact` (W6), `/rapor/[token]` (W6, sunucu `redirect()`), `server/first-scan.ts` (kayıt sonrası ilk tarama atlanır).

## API

| Uç                                     | Yetki       | Açıklama                                                                                                                                                          |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/admin/blocked-sites`         | süper admin | `{items:[…]}`; `?host=` ile yalnız eşleşme testi `{hostname, blocked, matched, redirectUrl}`                                                                      |
| `POST /api/admin/blocked-sites`        | süper admin | `{hostname, redirectUrl, note?}` → 201; 400 (geçersiz / YouTube dışı / kamu son eki), 409 çakışma; `audit('admin.blocked_site_create')`                           |
| `PATCH /api/admin/blocked-sites/[id]`  | süper admin | `{hostname?, redirectUrl?, note?}`; `audit('admin.blocked_site_update')`                                                                                          |
| `DELETE /api/admin/blocked-sites/[id]` | süper admin | `audit('admin.blocked_site_delete')`                                                                                                                              |
| `GET /api/public/blocklist?host=`      | herkes      | `{blocked:false}` ya da `{blocked:true, redirectUrl}`; geçersiz host da `{blocked:false}`; `LIMITS.publicBlocklist` (IP 60/dk, küresel 5000/dk); eşleşmede hits++ |

## İstemci

`apps/web/src/lib/blocked-redirect.ts` (PREP): `isBlockedResponse`, `isAllowedRedirectUrl`, `handleBlockedResponse(json)` — allowlist'i istemcide **yeniden** doğrular, sonra `window.location.assign`. Bağlı: `UrlScanTool`, `SiteTool`, hero `story.tsx`, contact formu (W6).

`apps/web/src/components/blocked-site-hint.tsx` (W5): "girdiği anda" yönlendirme.

```tsx
import { BlockedSiteHint } from '@/components/blocked-site-hint';

// hero / hub arama kutusu (istemci bileşeni)
const [domain, setDomain] = useState('');
<input value={domain} onChange={(e) => setDomain(e.target.value)} … />
<BlockedSiteHint value={domain} />
```

- 400 ms debounce; istemci tarafı kaba normalize (`hintHostOf`), `GET /api/public/blocklist?host=`; `{blocked:true}` → `handleBlockedResponse` → yönlendirme. Görsel çıktı yok; `role="status"` (sr-only) ile duyuru. Aynı host tekrar sorulmaz; istekler AbortController ile iptal edilir; 429/ağ hatası sessiz (sunucu "Analiz et" anında zaten engeller).
- INTEGRATE: `components/landing/story.tsx` hero input'una ve `/arac` hub arama kutusuna tek satır (`.registry/W5.json` `layoutSlots`).

## Admin ekranı — `/admin/blocked-sites`

Form (alan adı, YouTube bağlantısı, not; `?hostname=` ile ön-dolu — `/admin/scans` "Yasakla"), "Test et" kutusu, tablo (alan adı, yönlendirme, not, isabet, tarih; md altında kart listesi), satır içi düzenleme, silme `ConfirmDialog` (alan adı yazılarak). Her mutasyon `router.refresh()`.

## Testler

- `tests/unit/blocklist.test.ts` (PREP), `tests/unit/blocklist-match.test.ts` (12 eşleşme vakası, kamu son eki, girdi doğrulaması).
- `tests/integration/blocked-sites.test.ts`: 401/403, CRUD + audit, 409, YouTube dışı 400, kamu son eki 400, public uç + hits, 61. istek 429, 3 tool route'unda 200 `{blocked}` + `fetchCalls=0`.
- `tests/e2e/blocked-redirect.spec.ts` (yazıldı, INTEGRATE koşar): `page.route('**youtube.com**')` ile dış ağ yok; araç sayfası `?url=` → youtube; alt alan adı; admin ekle/test/sil; mobil taşma.

## Sınırlar / kararlar

- Önbellek 60 sn instance-yerel: değişiklik diğer sunucu örneklerinde en geç bir dakikada etkinleşir.
- Yönlendirme öncesi bilgilendirme ekranı yok (sabah kararı 5).
- Kamu son eki listesi yerel sabit; eksik bir son ek eklenmek istenirse `PUBLIC_SUFFIX_HOSTNAMES` genişletilir.
