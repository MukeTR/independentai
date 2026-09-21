# Pazarlama hikâyesi ve dürüstlük etiketleri (W7 · 21 Eyl 2026)

Bu belge pazarlama yüzeyinin (landing + `(marketing)` sayfaları) tek hikâyesini, sayfa sayfa yapıyı, dürüstlük
etiketi kurallarını ve bunları koruyan testi anlatır. Kod tek kaynaktır: yetenek matrisi
`packages/shared/src/capabilities.ts`, teklif `OFFER` / `getOffer()`, skor formülleri `docs/METRICS.md` ve
`docs/COMMERCE_SCORING.md`.

## 1. Tek cümle (her yüzeyde aynı)

> Müşteriniz satın almadan önce yapay zekâya soruyor: sizi mi öneriyor, rakibinizi mi? Yanıt ölçer, nedenini
> gösterir, takip eder — siz düzeltin ya da Yanıt Agency düzeltsin.

Üç katman: **Ücretsiz** (site araçları + sektör sayfaları + kalıcı rapor; hesap yok, e-posta duvarı yok, LLM yok) ·
**Yanıt SaaS** (`OFFER.saasMonthlyTry`/ay, `OFFER.trialDays` gün deneme, kart yok) · **Yanıt Agency**
(`OFFER.agencyFromMonthlyTry`/ay'dan sprint, teklifle, capability `agency_service: beta`).

Yasak dil: garanti, hükmedin, "Türkiye'nin ilk", kaynaksız yüzde, "6 ay", "13 GEO", eski marka adı (istisnalar
aşağıda). KOBİ'ye "GEO/AEO" değil "ChatGPT sizi öneriyor mu?".

## 2. Landing akışı (`(home)/page.tsx`)

SORU → CEVAP → GÖRÜNMÜYORSUN → NEDEN → YAPILACAKLAR → UYGULA → ÖLÇ → BÜYÜ. Her bölüm aynı hayali şirketi
(`DEMO.domain = acme.example`) takip eder; ziyaretçi alan adı girerse hero canlı GEO denetimini çalıştırır, kalan
bölümler temsili kalır.

| Bileşen          | Rol                                          | Etiket / karar                                                                                                                                                                  |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hero-scan`      | Canlı tarama + temsili akış                  | "temsili" rozeti demo modunda; `BlockedSiteHintSlot` yuvası (PREP-A `BlockedSiteHint` INTEGRATE'te bağlanır); Agency linki `/yanit-agency` "teklifle"                           |
| `ceo-screen`     | Dört sayı                                    | Her kartta "temsili"                                                                                                                                                            |
| `problem-action` | Bulduk → yapılacaklar kaydırıcısı            | "Yapılacaklar · yakında" + "temsili"; iş listesi ekranı yol haritasında olduğu açık yazılır                                                                                     |
| `task-board`     | Haftalık liste ön izlemesi                   | "Yapılacaklar · yakında"; halka "temsili olarak" güncellenir; etki tahmini yerine öncelik etiketi                                                                               |
| `two-paths`      | SaaS vs Agency                               | SaaS listesi `two-paths-data.ts` → yalnız `live\|beta` yetenekler (test doğrular); Yapılacaklar ayrı "yakında" satırı; Agency "hizmet · teklifle" + beta rozeti, PR maddesi yok |
| `method-reveal`  | Yöntem açık                                  | `.example` kaynaklar, "otorite puanı" kaldırıldı (atıf sayımı beta, temsili)                                                                                                    |
| `case-study`     | Uçtan uca yöntem                             | "Temsili senaryo — gerçek vaka değil" rozeti; `.example` alan adları; "elle yaptık / müşterimiz ilk sırada" iddiası yok                                                         |
| `index-teaser`   | Türkiye AI Görünürlük Endeksi (hazırlanıyor) | "yakında · örnek tablo temsili"; markalar hayali                                                                                                                                |
| `feature-bento`  | Modül kartları                               | Rozet `CAPABILITIES`'ten türer (beta / yakında); Tasks → "Yapılacaklar · yakında"                                                                                               |
| `final-cta`      | Kapanış                                      | `OFFER` satırı (sayfa `getOffer()` ile geçer); Agency → `/yanit-agency` "(teklifle)"                                                                                            |

## 3. Sayfa sayfa (§7.1)

| Yol                   | Title                                                        | Bölümler / anchor                                                                                                                                                                | CTA                                   |
| --------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `/features`           | Özellikler — Ölç, anla, düzelt                               | `#tracking` Ölç · `#analytics` Anla · `#detection` · `#tools` Düzelt · `#reports` · `#trust` · `#capabilities`                                                                   | `/arac` + `/pricing`                  |
| `/how-it-works`       | Nasıl çalışır — Analiz → Düzelt → Ölç                        | 5 adım · `#skor` formüller · günlük akış · tasarım kararları · kısıtlar                                                                                                          | `/arac/seo-karnesi` + `/arac`         |
| `/use-cases`          | Kim için — 9 sektör, 4 rol                                   | 9 sektör kartı (`/sektor/*`, görsel) `#saas #ecommerce #agency #enterprise …` · 4 rol                                                                                            | `/register` + `/yanit-agency`         |
| `/solutions/agencies` | Ajanslar için Yanıt — müşteri portföyü ve ortaklık programı  | portal · `#on-analiz` · `#ortaklik` (beyaz etiket yakında, limitler entitlement'tan) · roller · dürüst kapsam                                                                    | "Ben ajansım" `/register?src=partner` |
| `/yanit-agency`       | Yanıt Agency — analizi biz yaptık, uygulamayı da biz yapalım | ne yaparız (4; PR yok) · sprint modeli (`agencyFromMonthlyTry`, teklifle) · kimler için / kime uymaz · SSS (5)                                                                   | `/contact?src=agency`                 |
| `/about`              | Yanıt nedir?                                                 | `#mission` (TÜİK 2026 %92,3 · TÜİK 2025 %19,2 · Digital 2026 %94,49) · `#principles` · `#team` (rol; isim yok)                                                                   | `/register` + `/yanit-agency`         |
| `/bot`                | YanitBot — tarayıcımız hakkında                              | ne çeker / asla · bütçe (≤120 istek / 5 MB / 25 s; önbellek 24 sa yeni, 10 dk eski) · kimlik (UA + geçiş UA) · `#engelleme` UA engeli bugün, robots.txt uyumu yakında · iletişim | `/contact#form`                       |
| `/resources`          | Kaynaklar                                                    | 7 kart (rehber, sözlük, blog, docs, araçlar, sürüm notları, YanitBot)                                                                                                            | —                                     |
| `/resources/glossary` | Sözlük                                                       | +atıf, görünürlük boşluğu, hazırlık skoru, sahipsiz soru, YanitBot; sentiment/LLM bayat satırlar düzeltildi                                                                      | `/arac`                               |
| `/resources/geo-101`  | GEO 101                                                      | Bölüm 02 kaynaksız rakamlar → TÜİK/Digital/EY; TR bölümü charset + reklam mevzuatı + KVKK; araçlar bölümü güncel                                                                 | —                                     |
| `/docs`               | Dokümantasyon                                                | hızlı başlangıç · `#skorlar` (`#sov #arac-skoru #sinirlamalar`) · kavramlar · pratikler · `#araclar` `/api/tools/*`                                                              | —                                     |
| `/docs/api`           | API Referansı                                                | + `#tools` ücretsiz araç uçları tablosu; Destek → `/contact#form`                                                                                                                | —                                     |
| rank checker ×3       | (mevcut)                                                     | + görünür SSS (5) + `FaqJsonLd`; breadcrumb `/arac`                                                                                                                              | —                                     |

`/contact` W6'nındır: `#sales`, `#press` doğrulandı; `#form` W6 ekler. Tüm "Ekiple görüş"/mailto bağlantıları
`/contact#sales` ya da `/contact?src=…` olur.

## 4. Dürüstlük etiketi kuralları

1. **Temsili veri** görünür "temsili" chip'i taşır (hero, CEO ekranı, problem-action, task-board, iki yol, yöntem,
   vaka, endeks). Alan adları `.example` (RFC 2606).
2. **Kodda olmayan özellik** "yakında" rozetiyle ve dürüst cümleyle anlatılır: Yapılacaklar (Task), beyaz etiket,
   PDF, webhooks, veri export, endeks. Rozet kaynağı `CAPABILITIES` (`feature-bento`, `/features#capabilities`).
3. **Beta** rozet zorunlu: sentiment, atıf, mağaza bağlantıları, `agency_service`.
4. **Vaat dili yok**: garanti/sonuç sözü/sıralama vaadi yok; "ölçeriz, gösteririz, takip ederiz". Sağlık, hukuk,
   mali müşavirlik için "bilgilendirme ve görünürlük ölçümü" dili.
5. **Rakamlar yalnız kaynaklı** (TÜİK, Digital 2026, EY, TÜSİAD). Yıl çifti: %92,3 → TÜİK 2026; %19,2 → TÜİK 2025.
6. **Eski marka** yalnız "eski adıyla Independent AI" (about) ve tüzel kişi yazımı "Yanıt (Independent AI)"
   (contact/legal; sabah kararı #11).
7. **KVKK cümlesi** her form/araç altında: "Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ
   servislerine göndermiyoruz."

## 5. Test (`apps/web/tests/unit/marketing-copy.test.ts`, 45 test)

Kaynak taraması (`(marketing)`, `(home)`, `components/landing|marketing`; `legal/*` ve `blog/*` hariç):

- Yasak ifadeler: `6 ay` (satırda "kaldırıldı" muaf), `Independent AI` (iki istisna), `garanti` (±80 karakterde
  olumsuzlama muaf: yok/değil/vermiyoruz/kaçının…), `Türkiye'nin ilk`, `13 GEO`, `hükmed`.
- `mailto:` yok (contact hariç); Yanıt Agency anlatımında `PR` yok.
- TÜİK çifti: `92,3` → 120 karakterde `2026` ve `TÜİK 2025` yok; `19,2` → `2025` ve `TÜİK 2026` yok.
- Temsili bileşenlerde `temsili`; case-study/method-reveal `.example`; demo alan adı `.example`;
  task-board/problem-action/two-paths/feature-bento `yakında`.
- `SAAS_ITEMS` yalnız `live|beta` capability; `AGENCY_ITEMS` PR/garanti yok.
- Anchor id'leri (§7.1), `/yanit-agency` ve `/bot` varlığı ve içeriği, rank checker `FaqJsonLd`, `story.tsx` yuvası,
  yetim bileşenlerin silindiği.

E2E (`tests/e2e/marketing.spec.ts`): yazıldı, INTEGRATE koşar (`E2E_PORT=3201`).

## 6. Silinenler

`components/marketing/{tool-bento,mock-dashboard,counter,prompt-card-mock}.tsx` — import eden yoktu.

## 7. Registry (`.registry/W7.json`)

Nav (Çözümler › Kime göre; Ürün › Özellikler anchor'ları; Kaynaklar; Şirket), footer, sitemap (`STORY_REVISION`;
`/yanit-agency` 0.8, `/solutions/agencies` 0.8, `/bot` 0.3), layoutSlots (`BlockedSiteHint` → `story.tsx`),
capabilities (`agency_service: beta`, `tasks: roadmap`), llmsTxt (Yanıt Agency, ajans ortaklığı, YanitBot),
changelog IMPROVED ×3 + FIXED ×1.

Footer: spec "Şirket + Yasal birleşimi" gereği dört `/legal/*` girişi `Şirket` sütununda listelenir (label'lar mevcut
`footer.tsx` FOOTER_LINKS'ten; sayfalar W7'nin değil, INTEGRATE `footer.tsx`'te Yasal sütununu Şirket altına taşırken
bu girişleri kullanır; sabah kararı #13).

## 8. INTEGRATE için notlar

- **`(home)/page.tsx` (W7 sahipliğinde değil, yasak listede de değil):** yalnız 3 satır — `@independentai/shared`
  import'u (`formatTry`) ve `<FinalCta trialDays={offer.trialDays} price={formatTry(offer.saasMonthlyTry)} />` props
  geçişi. W4 (`AnnouncementBanner` layoutSlot) ve W5 aynı dosyaya dokunabilir; merge'de bu 3 satır bilinçli
  korunur.
- **`layoutSlots` (`BlockedSiteHint` → home):** `story.tsx`'teki `BlockedSiteHintSlot` (null döner) PREP-A
  bileşeniyle değiştirilir; `startScan` catch bloğundaki "INTEGRATE yuvası" yorumuna `handleBlockedResponse(err)`
  (`lib/blocked-redirect.ts`) eklenir. Registry girişi §2.9 şemasıyla sade tutuldu (ek `note` anahtarı yok).
- **`/bot` ve `/docs#araclar` şimdiki-zaman beyanları PREP-A'ya bağlı** — canlıya çıkmadan kontrol listesi:
  (1) `server/safe-fetch.ts` UA → `SCAN_UA` (`YanitBot/1.0`), (2) PREP `fetch-page.ts`'te `Accept-Language: tr-TR`
  ve 403/503 → "bot koruması nedeniyle taranamadı" mesajı gerçekten var mı, (3) `ScanBudget` varsayılanları
  120 istek / 5 MB / 25 s ve `SCAN_POLICY` host limiti 12/sa (çok istekli 6) mı. Farklıysa `/bot` (`#engelleme`,
  bütçe satırı) ve `/docs#araclar` cümleleri + `marketing-copy.test.ts` `/bot` beklentisi güncellenir. PREP çekirdeği
  ve UA geçişi olmadan `/bot` yayına alınmaz.
- **Hedefi W6/W8'de olan iç linkler:** `/arac` (features CTA ×2, how-it-works ikincil CTA, yanit-agency "Önce
  sitemi tara"), `/sektor` + 9× `/sektor/<slug>` (use-cases), `/contact#form` (bot, docs/api, features). INTEGRATE
  sonrası `seo.test` anchor/hedef kontrolü ve E2E `/contact#form` ile doğrulanır. W6 (`/rapor/[token]`) gecikirse
  `solutions/agencies` "Programda ne var" listesindeki "kalıcı rapor linki" satırına `yakında` chip'i eklenir.
- **Fiyat tek kaynak:** `/features`, `/yanit-agency`, `/solutions/agencies` Yanıt Agency başlangıç fiyatını
  `getOffer().agencyFromMonthlyTry` ile gösterir; statik `OFFER` pazarlama sayfalarında yalnız `fairUse` için
  (test kilidi: `marketing-copy.test.ts` "/features: ... tek kaynak").
- `features/page.tsx` `PUBLIC_TOOL_COUNT`: `+ TOOL_REGISTRY.filter((t) => t.enabled).length` satırı eklenir.
- `use-cases/page.tsx` `SECTORS` sabiti `data/sectors.ts` `SECTORS`'tan türetilebilir (slug/görsel adları aynı).
- `two-paths.tsx` ve `yanit-agency/page.tsx` `capability('agency_service')` try/catch ile "beta"ya düşer; capabilities
  girişi eklenince rozet matristen okunur.
- `/bot` sayfası kodla tutarlı: kesin engelleme yolu sunucu/WAF düzeyinde UA engeli (403/503 → `waf:true`, tarama
  durur); **robots.txt uyumu "yakında" etiketli** çünkü ne `geo-audit` (robots.txt'yi yalnız GPTBot için okur) ne PREP
  `fetch-page.ts` YanitBot Disallow'una uymayı tanımlıyor. INTEGRATE görevi: `fetch-page.ts` (ve `ScanBudget.fetch`)
  → hedef `robots.txt`'de `User-agent: YanitBot` + `Disallow: /` görülürse tarama iptal (`{blocked:'robots'}` hükmü);
  eklenince `/bot` `#engelleme` chip'i ve cümlesi güncellenir, `marketing-copy.test.ts` `/bot` beklentisi değişir.
- **UA geçişi:** `server/safe-fetch.ts:283` hâlâ `IndependentAI-GEOBot/1.0 (+https://independentai.space)` gönderir
  (geo-audit, content-audit, platform-detect, agency-preanalysis, commerce). `/bot` bunu "geçiş" satırı ve ikinci
  robots bloğuyla açıkça söyler. INTEGRATE: safe-fetch UA sabitini `SCAN_UA` ile değiştir (spec risk 18 yalnız
  charset/decode için "değişmez" der; UA sabiti additive), sonra `/bot`'tan `LEGACY_UA` satırı ve ikinci robots
  bloğu kaldırılır.
- **Bütçe/önbellek rakamları** `/bot` ve `/docs#araclar`'da spec §3.4 ile aynı: ≤120 istek / 5 MB / 25 s, host başına
  12/sa (çok istekli 6), önbellek yeni 11 türde 24 sa, eski 3 türde 10 dk. `ScanBudget` varsayılanları değişirse
  iki sayfa da güncellenir.
- **Süre taahhüdü:** "24 saat içinde döneriz" W7 sayfalarından çıkarıldı → "bir iş günü içinde" (`/bot`,
  `/yanit-agency`). W6'nın `contact/page.tsx:9,53` aynı "24 saat" cümlesini taşıyor; SALES_EMAIL/RESEND kararı
  (#10) netleşene kadar INTEGRATE aynı ifadeye çeksin.
- **Dokunulmaz `pricing/page.tsx:81`** "Dijital PR, atıf ve entity çalışması" Yanıt Agency özelliği olarak duruyor;
  `/yanit-agency` ve `two-paths-data` "PR iddiası yok" kararıyla çelişir → sabah kararı #2 / INTEGRATE:
  "Kaynak ve atıf çalışması, şema/entity" olarak düzelt.
- **`/contact#form`** anchor'ı bu worktree'de yok (W6 ekler); `/bot`, `/docs/api` ve nav önerisi ona link verir.
  INTEGRATE kontrol listesi: `contact/page.tsx`'te `id="form"` var mı (test yalnız `#sales #press` doğrular).
- **Kuruluş iddiası** `/about#team`'den çıkarıldı ("2026 başında Türkiye'de kuruldu" kaynaksızdı) → "Türkiye
  merkezli, bağımsız bir üründür"; tarih/yer eklenecekse sabah onayıyla.
- `/docs#araclar` ve `/docs/api#tools` yeni site araçlarını `/api/tools/site/<slug>` olarak anar; PREP'in gerçek yolu
  farklıysa iki tabloya satır eklerken düzeltilir.
