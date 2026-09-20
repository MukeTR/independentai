# Ajans tespiti

Amaç: ürünü ajans gibi (birden çok müşteri sitesi için) kullanan hesapları ve ziyaretçileri yakalayıp **Yanıt Agency ortaklık programına** yönlendirmek. Karar mekanizması deterministik ağırlıklı skordur; hiçbir alan LLM'e gitmez.

## Model

`AgencySignal { subject: TENANT|VISITOR, subjectId (tenantId | visitorHash), score, reasons: [{key, weight, evidence}], hostnames[] (≤20), status: CANDIDATE|CONTACTED|CONVERTED|DISMISSED|DECLARED, declaredAt?, note?, computedAt }` — `@@unique([subject, subjectId])`.

KVKK: `visitorHash = sha256(VISITOR_SALT|ip|uaFamily)` pseudonim; ham IP/UA saklanmaz; ajans ön-analizinde alan adları yazılmaz (yalnız `preanalysis_used` nedeni).

## Sinyaller ve ağırlıklar (`server/agency-signal.ts` `AGENCY_WEIGHTS`, spec §5.3)

| Anahtar            | Özne           | Kanıt                                                                                                                                                                    | Puan |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| `many_hosts`       | VISITOR/TENANT | 30 günde farklı **eTLD+1** (alt alan adları tek site): 2 → 15, 3–4 → 30, ≥5 → 45                                                                                         | ≤45  |
| `many_sectors`     | VISITOR/TENANT | QUESTION_COVERAGE taramalarında ≥2 farklı sektör                                                                                                                         | 15   |
| `email_keyword`    | TENANT         | kullanıcı e-postasının yerel kısmı/alan adı: ajans, agency, digital, dijital, medya, media, reklam, creative, kreatif, studio, stüdyo, marketing, pazarlama, growth, seo | 20   |
| `website_mismatch` | TENANT         | `Tenant.website` dışında ≥2 farklı eTLD+1 taranmış                                                                                                                       | 15   |
| `many_competitors` | TENANT         | Competitor ≥15 veya `Brand.isOwn=false` ≥3                                                                                                                               | 10   |
| `industry_agency`  | TENANT         | `Tenant.industry === 'ajans'` (onboarding sektör seçimi)                                                                                                                 | 40   |
| `compare_heavy`    | VISITOR/TENANT | 7 günde ≥3 `rakip-kiyas`                                                                                                                                                 | 10   |
| `preanalysis_used` | VISITOR        | `agency-preanalysis` çağrısı                                                                                                                                             | 10   |
| beyan              | —              | "Ben ajansım" → score 100, status DECLARED                                                                                                                               | —    |
| zaten ajans        | TENANT         | `Tenant.kind=AGENCY` / AgencyAccount → **hesaplanmaz**, admin "Zaten ajans" sekmesi                                                                                      | —    |

Skor = min(100, Σ). Eşikler (`AGENCY_THRESHOLDS`): **≥50 aday** (admin listesi), **≥70 ∧ TENANT → uygulama içi band** (ziyaretçiye band yok — ofis IP yanlış pozitifi). Örnekler: 5 site → 45 (aday değil); 5 site + 2 sektör → 60 aday; sektör ajans + 3 site → 70 band.

## Hesaplama zamanları

1. **Olay anında**: her public taramada `after(() => touchAgencySignal({visitorHash, tenantId, hostname}))` (`handlePublicScan`) — oturumlu taramada tenant, kayıtsızda ziyaretçi; ajans ön-analizi `markPreanalysisUsed(visitorHash)`.
2. **Onboarding sonunda**: `computeTenantSignal(tenantId)` (`api/onboarding` `after()`), `Tenant.industry` set edildikten sonra.
3. **Gece** (`daily-run` hop 0): `runAgencySignals({deadlineAt})` — son 30 günde taraması olan tenant'lar ∪ sektörü ajans olanlar ∪ açık adaylar (≤500) + ≥2 taramalı ziyaretçiler (≤500); deadline geçince `partial:true` ile erken döner.

Kurallar: skorsuz ziyaretçi için satır açılmaz; **DECLARED/DISMISSED** satırların skoru ve durumu yeniden hesapta ezilmez (yalnız kanıt ve `computedAt` tazelenir); CONTACTED/CONVERTED'da durum korunur, skor güncellenir.

## Uygulama içi band (`components/dashboard/agency-band.tsx` + `agency-band-client.tsx`)

`dashboard/layout.tsx` tek satır: `<AgencyBand tenantId={actor.tenantId} tenantKind={actor.tenant.kind} />`.

- Koşul: BRAND tenant ∧ skor ≥70 ∧ durum ∉ {DECLARED, DISMISSED, CONVERTED}. Tek indeksli sorgu; hata bandı gizler.
- `role="status"`; **"Ben ajansım"** → küçük panel: "e-posta adresimle iletişime geçilebilir" kutusu (isteğe bağlı) + "Beyanı gönder" → `POST /api/agency-signal/declare {contactConsent}`; **"Ortaklığı incele"** → `/solutions/agencies#ortaklik`; **kapat** → 7 gün `localStorage` (`iai_agency_band_dismissed_until`, try/catch; hidrasyon öncesi render yok).

## API

| Uç                                        | Yetki                    | Açıklama                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/agency-signal/declare`         | ADMIN/OWNER (VIEWER 403) | `{contactConsent?}`; `LIMITS.agencyDeclare` tenant 5/saat; AgencySignal → 100 DECLARED; `audit('agency.declared')`; Lead upsert source ONBOARDING, topic `ajans` (hostname = Tenant.website; yoksa tenant bağı); **e-posta yalnız kutu işaretliyse** (`contactEmail` + `consentAt`); ajans hesabı 400 |
| `GET /api/dashboard/agency-signal`        | giriş                    | `{score, status, reasons:[{key, evidence}], showBand}` — hostname listesi dönmez                                                                                                                                                                                                                      |
| `PATCH /api/admin/agency-candidates/[id]` | süper admin              | `{status?: CANDIDATE                                                                                                                                                                                                                                                                                  | CONTACTED | CONVERTED | DISMISSED, note?}`; DECLARED elle atanamaz; `audit('admin.agency_candidate_update')` |

## Admin ekranı — `/admin/agency-candidates`

Skor ≥50 adaylar (skor, durum, hesap/ziyaretçi, tenant linki, maskeli e-posta, sektör, nedenler chip'leri (+puan, evidence tooltip), host listesi, hesaplama/beyan tarihi), durum filtresi sekmeleri (sayılı), **"Zaten ajans"** sekmesi (AgencyAccount: ad, site, plan, müşteri/üye sayısı), aksiyonlar (İletişime geç · Dönüştü · Yoksay · not). KPI: aday, beyan, iletişime geçildi, dönüştü.

## İlk site taraması ve sektör (uygulama içi, W5)

- Onboarding adım 1'de **Sektör** `<select>` (`SECTOR_SLUGS`; etiketler formda yerel sabit) → `Tenant.industry`.
- `server/first-scan.ts` `runFirstSiteScan(tenantId, website)`: mevcut `runCrawlerAudit` ile `Audit` kind CRAWLER tenantId'li; 20 s bütçe; yasaklı/geçersiz site atlanır; hata yutulur; PublicScan yazılmaz. Test ortamında (`IAI_TEST_MODE=1`) ağ çağrısı yok; mock'lu testte `IAI_FIRST_SCAN_IN_TEST=1`.
- Panel kartı `components/dashboard/first-scan-card.tsx`: skor + hüküm ("N kritik, N uyarı, N tamam") + ilk 3 öneri + "Tümünü gör" → `/dashboard/tools/ai-crawler`; kurulum son 30 dk içinde bittiyse "hazırlanıyor…".

## Testler

`tests/unit/agency-score.test.ts` (kombinasyon eşikleri, eTLD+1, websiteHostOf), `tests/integration/agency-signal.test.ts` (5 host → ≥45, route after(), ön-analiz nedeni, tenant 60/100, declare → 100 + audit + Lead, VIEWER 403, 429, DECLARED/DISMISSED korunur, admin PATCH 403/400/404), `tests/integration/first-scan.test.ts`, `tests/integration/daily-run-maintenance.test.ts`.

## Sabah kararları

Eşikler (50/70), e-posta anahtar kelime listesi, `industry_agency` 40 puan (spec §10 #6); ön-analizin lead'e yazılıp yazılmayacağı (#7 — yazılmıyor, yalnız sinyal nedeni).
