# Ajans modeli (Faz A0)

Bu belge ajans hesabının veri modelini, rollerini, erişim çözümlemesini, limitlerini, portföy
toplulaştırmasını, rapor paylaşım linklerinin güvenliğini ve bilinen sınırları anlatır. Kod: `apps/web/src/server/agency.ts`,
`authz.ts`, `entitlement.ts`, `report-share.ts`; API `apps/web/src/app/api/agency/*`, `api/share/[token]`; UI `apps/web/src/app/agency/*`.

## 1. Model

- **Tenant.kind** `BRAND` (varsayılan) | `AGENCY`. Ajansın "ev" tenant'ı `AGENCY`'dir: marka verisi (Brand/Prompt/ModelRun) taşımaz; ajans üyeleri (User) buraya bağlıdır.
- **AgencyAccount** ↔ ev tenant'ı 1:1 (ad, web sitesi, plan LAUNCH|STUDIO|SCALE).
- **AgencyMembership** (userId, role OWNER|ADMIN|STRATEGIST|ANALYST, status ACTIVE|SUSPENDED, allClients). Bir kullanıcı aynı anda tek ajansa üye olabilir.
- **AgencyWorkspace** = müşteri çalışma alanı: ajans ↔ müşteri BRAND tenant'ı (1:1, `tenantId` unique). status ACTIVE|PAUSED|ARCHIVED, ajans içi `label`/`tags` (müşteriye gösterilmez), `ownerMemberId` (sorumlu).
- **WorkspaceAccess** (membershipId, workspaceId, roleOverride?) — `allClients=false` üyelerin atamaları; `roleOverride` o müşteride rolü daraltır/genişletir.
- **AgencyInvite** (e-posta, rol, allClients, workspaceIds, sha256 tokenHash, 7 gün). **AgencyLinkRequest** (tek kullanımlık onay linki, 7 gün, PENDING→ACCEPTED). **ReportShare** (aşağıda).

İki yol ile müşteri eklenir:

1. **Yeni müşteri** (`POST /api/agency/clients`): ajans, BRAND tenant + AlertConfig + AgencyWorkspace oluşturur (transaction, `FOR UPDATE` kilidiyle limit). Kullanıcısı olmayan bu tenant'a yalnızca ajans erişir.
2. **Mevcut hesabı bağla** (`POST /api/agency/link` → `/agency/link/<token>`): marka tenant'ının **kendi OWNER'ı** onaylar (`acceptLinkRequest`); ajans veriyi sahiplenmez, erişim alır. Bağlantı kesilirse (`DELETE /api/agency/clients/:id`, OWNER) yalnızca ilişki silinir; tenant ve verisi kalır.

Ajansa dönüşüm (`POST /api/agency`, onboarding "Ajans olarak müşterilerim için"): yalnızca verisiz (brand/prompt yok) ve tek kişilik BRAND tenant'ının OWNER'ı; `directOnly` (ajans üzerinden yasak). Tenant `kind=AGENCY`, `onboardingCompletedAt` set; OWNER üyeliği `allClients=true`.

## 2. Roller

| Yetki                                                     | OWNER | ADMIN              | STRATEGIST   | ANALYST          |
| --------------------------------------------------------- | ----- | ------------------ | ------------ | ---------------- |
| Portföy/atanan müşterileri görme, ekip listesini görme    | ✓     | ✓                  | ✓            | ✓                |
| Müşteri panelinde yazma (soru/rakip/ölçüm/paylaşım linki) | ✓     | ✓                  | ✓ (atandığı) | —                |
| Tüm müşterilere otomatik erişim (`allClients`)            | ✓     | ✓ (zorunlu)        | opsiyonel    | opsiyonel        |
| Müşteri oluşturma / PATCH (durum, etiket, sorumlu)        | ✓     | ✓                  | —            | —                |
| Davet, rol/kapsam/askıya alma, atama                      | ✓     | ✓ (Owner atayamaz) | —            | —                |
| Bağlantı kesme (unlink)                                   | ✓     | —                  | —            | —                |
| Sahiplik devri                                            | ✓     | —                  | —            | —                |
| Müşteri hesabını silme, müşteri sahipliğini devretme      | —     | —                  | —            | — (`directOnly`) |

Efektif tenant rolü (`agencyRoleToTenantRole`): OWNER→OWNER, ADMIN/STRATEGIST→ADMIN, ANALYST→VIEWER. `WorkspaceAccess.roleOverride` varsa o müşteride override kullanılır. Son OWNER düşürülemez/çıkarılamaz; OWNER askıya alınamaz; kullanıcı kendini çıkaramaz. Rol/atama/kapsam değişimi hedefin `sessionVersion`'ını artırır (eski oturum ve Realtime token'ı düşer); işlem yapan kişi kendini etkilerse route çerezi yeniler.

## 3. Erişim çözümleme (çerez + DB doğrulama)

- Aktif çalışma alanı **yalnızca** `iai_ws` çerezinde tutulur (httpOnly, SameSite=Lax, path=/, prod'da Secure, 30 gün). Çerez bir _ipucudur_; kullanıcının gönderdiği tenantId'ye asla güvenilmez.
- `POST /api/agency/workspace {tenantId}`: `resolveAccessibleWorkspace` → AgencyWorkspace (`agencyId` = üyenin ajansı, `status != ARCHIVED`) **ve** (`membership.allClients` **veya** WorkspaceAccess satırı) yoksa **404** (var/yok bilgisi sızmaz). `{tenantId:null}` çerezi siler.
- Her istekte `getActor()`: çerezdeki tenantId yeniden DB'de doğrulanır. Geçersizse (başka ajansın müşterisi, atanmamış, arşivlenmiş, unlink edilmiş) **sessizce ajans ev tenant'ına düşülür**; UI seçim ekranını gösterir (`requirePageActor({brandContext:true})` → `/agency/clients?select=1`).
- `Actor.tenantId` efektif tenant; `viaAgency=true` ise `directOnly` uçlar 403. Ajans ev tenant'ında `brandContext` uçlar 403 ("Önce bir müşteri çalışma alanı seçin").
- PAUSED alan: `entitlement.active=false`, `reason='workspace_paused'` → yazma/çalıştırma 403, okuma serbest; gece kuyruğu bu tenant'ı atlar. ARCHIVED alan çözümlenmez (erişilemez), listeden düşer (`?includeArchived=1` ile görünür).
- Realtime: `allowedRealtimeTopics` = `agency:<id>` + erişilebilir (arşiv dışı) `tenant:<id>` listesi; aynı kural Supabase RLS'de. Ajans portalı `RealtimeProvider`'ı bu topic'lerle kurar; portföy `agency.changed | run.completed | integration.sync` olaylarında ve 30 sn polling ile yenilenir.

## 4. Limitler (entitlement.ts — tek kaynak)

| Plan                                 | Koltuk | Müşteri | Paylaşım linki (müşteri başına aktif) | Beyaz etiket              |
| ------------------------------------ | ------ | ------- | ------------------------------------- | ------------------------- |
| LAUNCH (lansman, ücretsiz)           | 5      | 10      | 20                                    | yok                       |
| STUDIO (fiyat yok, süper admin atar) | 15     | 40      | 100                                   | var (kodda kullanılmıyor) |
| SCALE (fiyat yok, süper admin atar)  | 100    | 500     | 1000                                  | var (kodda kullanılmıyor) |

- Koltuk = ACTIVE üyelik + bekleyen davet (aynı e-postaya yenileme sayılmaz). Müşteri = ARCHIVED olmayan çalışma alanı. Limitler transaction içinde `SELECT … FOR UPDATE` ile yarışa kapalı; aşımda 403 `plan_limit`.
- Ajans deneme süresi ev tenant'ının `trialEndsAt` + ek süre; dolduğunda ajans ev tenant'ı salt-okunur (yeni müşteri/davet kapalı). Müşteri alanında müşteri tenant'ının kendi planı geçerlidir (+ PAUSED).
- Doğrudan marka hesabında paylaşım linki limiti 10.

## 5. Portföy toplulaştırması (`listClientCards` / `summarizePortfolio`)

- Müşteri değerleri `packages/shared/src/metrics.ts` ile hesaplanır: `visibility` = son 30 gün `visibilityOf`, `sov` = `shareOfVoiceOf`; hatalı run'lar paydaya girmez (docs/METRICS.md).
- **Delta7** = visibility(son 7 gün) − visibility(önceki 7 gün); önceki pencerede <3 geçerli run varsa 0 (gürültü bastırma). **Delta30** aynı mantıkla 30/60.
- **Ortalama görünürlük/SoV** = **müşteri başına eşit ağırlıklı** ortalama (büyük müşteri baskın olmasın); verisi olmayan (`health=idle`) müşteriler ortalamaya girmez. UI tooltip'i bunu belirtir.
- **Sağlık**: `idle` (60 günde run yok) → `critical` (7 günde ≥3 hatalı run **veya** mağaza bağlantısı ERROR **veya** delta7 ≤ −15) → `warn` (≥1 hatalı run **veya** delta7 ≤ −5 **veya** son GEO/COMMERCE denetiminde ≥3 "fail") → aksi `good`.
- Özet: `rising` (delta7 ≥ +5), `falling` (≤ −5), `critical`, `failedRuns7d` (toplam), `syncIssues` (lastErrorCode dolu), `needsAction` (critical|warn|PAUSED).
- Kart sorgusu tenant başına değil toplu: tek `modelRun.findMany` (60 gün, ≤20k satır) + tek `audit.findMany`; 500 müşteriye kadar.

## 6. Rapor paylaşım linkleri (ReportShare)

- Marka bağlamında oluşturulur (`POST /api/agency/shares`, `requireActor({write:true, brandContext:true})`); ajans ev tenant'ında 403. Aralık 7|30|90 gün, etiket ≤80, geçerlilik **≤90 gün**.
- Token 32 byte rastgele (base64url); DB'de yalnızca **sha256**. Düz metin link **yalnızca oluşturma yanıtında bir kez** döner; liste ucunda token yoktur.
- İptal: `DELETE /api/agency/shares/:id` → `revokedAt` → link anında geçersiz. Public uç `GET /api/share/:token`: 404 (yok) / **410** (iptal veya süresi dolmuş); IP başına 60/saat + küresel 5000/saat; `X-Robots-Tag: noindex`. Sayfa `/share/:token` `robots: noindex`; App Router sayfası özel durum kodu döndüremediği için "gone" ekranı HTTP 200 ile render edilir (JSON ucu 410 verir).
- İçerik: marka adı, görünürlük/SoV (+önceki dönem), ortalama sıra, öneri oranı, günlük trend, modele göre kırılım, en iyi 10 soru (metin), en fazla 8 rakip (ad, SoV). **Yok**: e-posta, kullanıcı, AI yanıt metni, atıflar, API token, kişisel veri. `views`/`lastViewedAt` best-effort artırılır.
- Beyaz etiket lansmanda yok: her rapor "Independent AI ile hazırlandı" imzası taşır (dürüstlük ilkesi).

## 7. Davet ve bağlama akışları

- Davet: OWNER/ADMIN; rol ADMIN|STRATEGIST|ANALYST (ADMIN → allClients zorunlu). E-posta `mailer.sendEmail` ile (RESEND yoksa link yanıtta `delivery:'link'`). Link `/agency/invite/<token>`; kabul için davetli e-postasıyla giriş şart; kullanıcının hesabı **verisiz ve tek kişilik** olmalı (aksi 409); kabulde kullanıcı ajans ev tenant'ına taşınır, eski boş tenant silinir, `sessionVersion` artar → route yeni oturum çerezini yazar, `iai_ws` silinir. Yeniden gönder = yeni token (eski silinir); iptal = davet silinir.
- Bağlama: `/agency/link/<token>` marka OWNER'ına "X ajansı hesabınıza erişim istiyor; veriniz size ait; istediğinizde kesebilirsiniz" ekranı; onay tek kullanımlık; ajans müşteri limiti burada da uygulanır.

## 8. Bilinen sınırlar

- Beyaz etiket, PDF rapor, webhook yok. `AgencyAccount.logoUrl/accentColor` alanları kullanılmıyor.
- Aktivite akışı (`/api/activity`) E görevinin kapsamı; portföyde "son aktivite" `User.lastActiveAt`'a dayanır (E dolduruyor).
- Bir kullanıcı tek ajansa üye olabilir; marka hesabı olan bir kullanıcı ajansa katılmak için yeni kullanıcı hesabı açmalı.
- Unlink sonrası "yetim" tenant (kullanıcısız, ajansın oluşturduğu) erişilemez ama silinmez; temizlik politikası ROADMAP.
- Dashboard layout'u (E görevi) ajans ev tenant'ında `/agency`'ye yönlendirmeli; aksi halde boş panel görünür.
- Paylaşım sayfası için HTTP 410 yalnızca JSON uçta; HTML sayfada 200 + "geçerli değil" ekranı.
- `hallucinations` alanı kartta 0 sabit (halüsinasyon aracı sonuçları henüz tenant bazında saklanmıyor).
