# Gece programı REGISTRY sözleşmesi ve INTEGRATE adımları

Paralel iş kolları (W1–W8) paylaşılan dosyalara (nav, footer, sitemap, dock, admin nav, changelog, layout'lar,
`tool-registry.ts`) **dokunmaz**. Her W, kendi worktree'sinde `.registry/<W>.json` yazar; INTEGRATE adımı bu
dosyaları `scripts/apply-registry.mjs --check` ile doğrular ve girişleri **elle, tek commit'te** uygular.

## 1. Dosya biçimi (`<worktree>/.registry/<W>.json`)

```json
{
  "work": "W1",
  "nav": [
    {
      "panel": "Araçlar",
      "section": "Site sağlığı · ücretsiz",
      "href": "/arac/seo-karnesi",
      "title": "SEO karnesi",
      "description": "Title, meta, H1, canonical, OG — tek ekranda",
      "badge": null
    }
  ],
  "footer": [{ "column": "Ücretsiz araçlar", "href": "/arac/seo-karnesi", "label": "SEO karnesi" }],
  "sitemap": [{ "path": "/arac/seo-karnesi", "priority": 0.7, "change": "monthly", "lastmod": "TOOLS_REVISION" }],
  "dock": [
    {
      "href": "/dashboard/tools/seo-karnesi",
      "label": "SEO karnesi",
      "desc": "6 eksen",
      "icon": "Gauge",
      "cat": "Site sağlığı"
    }
  ],
  "dashboardTools": [{ "slug": "seo-karnesi", "icon": "Gauge", "category": "Site sağlığı" }],
  "registryEnable": ["seo-karnesi", "whatsapp-onizleme"],
  "adminNav": [{ "href": "/admin/leads", "label": "Lead'ler", "icon": "Inbox", "order": 20 }],
  "layoutSlots": [
    {
      "layout": "home",
      "component": "AnnouncementBanner",
      "props": { "placement": "LANDING" },
      "import": "@/components/announcement-banner"
    }
  ],
  "blogInlineTools": [
    { "slug": "whatsapp-link-onizlemesi-bos-gorunuyor", "toolSlug": "whatsapp-onizleme", "title": "…", "body": "…" }
  ],
  "blogSpread": ["BATCH_5"],
  "capabilities": [{ "key": "site_tools", "label": "…", "status": "live", "note": "…" }],
  "llmsTxt": [{ "section": "Ücretsiz araçlar", "href": "/arac/seo-karnesi", "label": "SEO karnesi", "note": "…" }],
  "docsIndex": [{ "file": "docs/araclar/seo-karnesi.md", "title": "SEO karnesi" }],
  "changelog": [{ "type": "NEW", "item": "…" }]
}
```

Kurallar:

- `href`/`path` hedefi W'nin **sahip olduğu** `page.tsx` olmalı (`apps/web/src/app/(marketing)|(home)|app/<yol>/page.tsx`).
  `#anchor` verilirse hedef dosyada `id="…"` aranır; bulunamazsa uyarı (hata değil).
- `nav/footer/sitemap` girişleri registry'den türetilen araç (`/arac/<slug>`) ve sektör (`/sektor/<slug>`) linkleri için
  **gerekmez**; `registryEnable` yeter. Yalnız ek sayfalar (`/arac`, `/demo`, `/yanit-agency`, `/bot`, `/sektor`) için yazılır.
- `registryEnable` slug'ları `apps/web/src/lib/tool-registry.ts` `TOOL_REGISTRY` içinde olmalı ve `/arac/<slug>/page.tsx`
  W'nin worktree'sinde bulunmalı.
- `sitemap.lastmod` bir SABİT adı (`TOOLS_REVISION`, `SECTORS_REVISION`, `STORY_REVISION`) ya da `YYYY-MM-DD`; `new Date()` yasak.
- `capabilities.status` ∈ `live | beta | roadmap`; `changelog.type` ∈ `NEW | IMPROVED | FIXED`.
- `layoutSlots.layout` ∈ `home | marketing | dashboard | admin | pricing`; `import` `@/…` ile başlıyorsa dosya varlığı denetlenir.

## 2. Doğrulama

```bash
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
node scripts/apply-registry.mjs --check .registry/W1.json                       # ana ağaçta
node scripts/apply-registry.mjs --check --root ../iai-w1 ../iai-w1/.registry/W1.json  # W worktree'sinde sayfa arar
node scripts/apply-registry.mjs --check --json .registry/*.json                 # makine okunur
```

Çıkış kodu `1` = en az bir hata. Uyarılar (anchor doğrulanamadı, registry okunamadı) INTEGRATE'te elle bakılır.

## 3. INTEGRATE adımları (tek ajan, ana ağaç; PROGRAM_SPEC §9)

1. Merge sırası: PREP → `night/w1` → `w2` → `w3` → `w6` → `w4` → `w5` → `w7` → `w8`; her adımda `pnpm typecheck`.
2. `node scripts/apply-registry.mjs --check .registry/*.json` yeşil.
3. Elle, tek commit (`registry: gece programı entegrasyonu`):
   - `lib/tool-registry.ts`: `registryEnable` slug'ları `enabled:true` → dashboard TOOLS, pricing sayısı, hub, llms.txt otomatik.
   - `components/nav-data.ts`: paneller + `SITE_TOOL_LINKS` / `VISIBILITY_TOOL_LINKS` / `SECTOR_LINKS` registry'den; `nav[]` ek sayfalar.
   - `components/footer.tsx`: `footer[]` (Sektörler sütunu, Yasal → Şirket altı).
   - `app/sitemap.ts`: sabitler (`TOOLS_REVISION='2026-09-21'` …) + `sitemap[]` + `export STATIC_PAGES`.
   - `components/dock-nav.tsx` TOOLS: registry'den türet (`dock[]` yalnız kontrol amaçlı).
   - `components/marketing/commerce-tool-page.tsx`: `COMMERCE_TOOL_LINKS` registry'den (breadcrumb `/arac` PREP'te yapıldı).
   - `app/admin/layout.tsx`: `adminNav[]` order'a göre + `AdminNavLink` `aria-current`.
   - `app/(home)/layout.tsx`, `(marketing)/layout.tsx`, `dashboard/layout.tsx`: `layoutSlots[]`.
   - `packages/shared/src/capabilities.ts`: `capabilities[]` (`agency_service` **beta kalır**).
   - `app/(marketing)/changelog/page.tsx`: `v0.4.0 · 2026-09-21` altında `changelog[]` birleşimi.
   - `data/blog-posts.ts`: `blogSpread[]`; `blog/[slug]/page.tsx` INLINE_TOOLS: `blogInlineTools[]` (`SiteTool` ile).
   - `app/llms.txt/route.ts`: `llmsTxt[]` bölümleri (araç/sektör listeleri registry/SECTORS'tan).
   - `docs/COMMERCE_SCORING.md` araç indeksi → `docsIndex[]`.
4. Kapılar: `pnpm format && pnpm format:check && pnpm lint && pnpm typecheck && pnpm test --force`,
   `TEST_DATABASE_URL=…_test_int pnpm test:integration`, `pnpm build`, `E2E_PORT=3201 pnpm test:e2e`,
   `node scripts/migration-dry-run.mjs`, `node scripts/blog-audit.mjs`, `prisma migrate diff --exit-code`.
5. Commit; **push yok** (kullanıcı onayıyla sabah tek PR).

## 4. PREP çekirdeği (W'lerin salt-okur bağımlılığı)

| Modül                                     | Dışa aktarım                                                                  | Not                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `server/site-scan/core.ts`                | `defineSiteTool`, `SiteScanResult`, `verdictLine`, `newBudget`, `BUDGET_MS`   | `run(url,input)` → `handlePublicScan`                                                                                                    |
| `server/site-scan/budget.ts`              | `ScanBudget` (`fetch`, `head`, `stats`, `exhausted`)                          | `Artifact.error:'budget'`                                                                                                                |
| `server/site-scan/fetch-page.ts`          | `collectPageArtifact`, `parsePage`, `headResource`, `SCAN_UA`, `SCAN_HEADERS` | charset/WAF; doğrusal ayrıştırma                                                                                                         |
| `server/site-scan/tls-probe.ts`           | `probeTls`, `LEGACY_HANDSHAKE`, `classifyLegacyError`                         | ≤2 bağlantı; `legacyTls` null=ölçülemedi                                                                                                 |
| `server/site-scan/quick-checks.ts`        | `quickChecks` (14 madde), `QUICK_CHECK_KEYS`                                  | rakip-kiyas yalnız bunu kullanır                                                                                                         |
| `components/marketing/site-tool.tsx`      | `SiteTool`, `SiteToolResultView`, `contactHref`                               | istemci; `sectorSelect='required'` → `?url=` otomatik başlatma sektörsüz çalışmaz — W3 sunucuda `sector` yoksa ClientError (400) vermeli |
| `components/marketing/site-tool-page.tsx` | `createSiteToolPage`                                                          | `{metadata, Page}`                                                                                                                       |
| `data/sectors.ts`, `data/stats.ts`        | `SECTORS`, `STATS`                                                            | istatistik yalnız STATS'tan                                                                                                              |
| `lib/tool-registry.ts`                    | `TOOL_REGISTRY`, `SECTOR_SLUGS`, `toolBySlug`, `toolByKind`                   | tek kaynak                                                                                                                               |
