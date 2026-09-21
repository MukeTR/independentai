import { describe, expect, it } from 'vitest';
import { SECTOR_SLUGS, TOOL_REGISTRY, dashboardToolPath, enabledTools, toolPath } from '@/lib/tool-registry';
import { PUBLIC_SCAN_LIMITS, SCAN_POLICY } from '@/server/commerce/public-scan';
import { DASHBOARD_TOOLS, PANEL_ONLY_TOOLS } from '@/app/dashboard/tools/tools-data';

describe('tool registry', () => {
  it('slug benzersiz, ASCII kebab ve /arac yolu üretir', () => {
    const slugs = TOOL_REGISTRY.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(toolPath('seo-karnesi')).toBe('/arac/seo-karnesi');
  });
  it('18 araç: 7 yayında, 11 gece programı (kapalı)', () => {
    expect(TOOL_REGISTRY).toHaveLength(18);
    expect(enabledTools()).toHaveLength(7);
  });
  it("kind ↔ PUBLIC_SCAN_LIMITS birebir: kind'lı her araç için limit ve politika var; her limit türü bir araca ait", () => {
    const kinds = TOOL_REGISTRY.filter((t) => t.kind).map((t) => t.kind as string);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const k of kinds) {
      expect(PUBLIC_SCAN_LIMITS, k).toHaveProperty(k);
      expect(SCAN_POLICY, k).toHaveProperty(k);
    }
    expect(Object.keys(PUBLIC_SCAN_LIMITS).sort()).toEqual([...kinds].sort());
    expect(Object.keys(SCAN_POLICY).sort()).toEqual([...kinds].sort());
  });
  it('her limitte küresel tavan var; çok istekli araçlar daha sıkı', () => {
    for (const [k, spec] of Object.entries(PUBLIC_SCAN_LIMITS)) {
      expect(spec.global, k).toBeDefined();
      expect(spec.name, k).toBeTruthy();
    }
    expect(PUBLIC_SCAN_LIMITS.BROKEN_LINKS.limit).toBe(5);
    expect(PUBLIC_SCAN_LIMITS.ONPAGE_SEO.limit).toBe(10);
    expect(SCAN_POLICY.COMMERCE.cacheMs).toBe(600_000);
    expect(SCAN_POLICY.ONPAGE_SEO.cacheMs).toBe(86_400_000);
    expect(SCAN_POLICY.COMPARE.hostLimitPerHour).toBe(6);
  });
  it("endpoint /api/tools/ altında; kind'sız araçların bütçesi 0", () => {
    for (const t of TOOL_REGISTRY) {
      expect(t.endpoint, t.slug).toMatch(/^\/api\/tools\/[a-z0-9-]+$/);
      if (!t.kind) expect(t.budgetRequests, t.slug).toBe(0);
      else expect(t.budgetRequests, t.slug).toBeGreaterThan(0);
      expect(t.question.trim().endsWith('?'), t.slug).toBe(true);
    }
  });
  it('DASHBOARD_TOOLS panel araçları + (dashboard && enabled) registry girişlerinden türetilir', () => {
    const derived = TOOL_REGISTRY.filter((t) => t.dashboard && t.enabled);
    expect(DASHBOARD_TOOLS).toHaveLength(PANEL_ONLY_TOOLS.length + derived.length);
    expect(DASHBOARD_TOOLS.length).toBe(17);
    for (const t of derived) expect(DASHBOARD_TOOLS.map((d) => d.href)).toContain(dashboardToolPath(t));
    expect(new Set(DASHBOARD_TOOLS.map((d) => d.href)).size).toBe(DASHBOARD_TOOLS.length);
  });
  it('SECTOR_SLUGS 9 benzersiz slug', () => {
    expect(SECTOR_SLUGS).toHaveLength(9);
    expect(new Set(SECTOR_SLUGS).size).toBe(9);
  });
});
