/**
 * Yasaklı siteler — admin CRUD (403 admin değil, normalize, YouTube dışı 400, kamu son eki 400, çakışma 409,
 * audit satırları), public blocklist ucu ve 3 farklı public tool route'unda 200 {blocked} + fetch 0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { call, createTenant, loginAs, logout, prisma } from './helpers';
import { GOOD_HOME, GOOD_ROBOTS, GOOD_SITEMAP, GOOD_LLMS } from '../fixtures/commerce-html';

const fetchCalls: string[] = [];
vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (rawUrl: string) => {
      fetchCalls.push(rawUrl);
      const u = new URL(rawUrl);
      const body = (text: string, type = 'text/html; charset=utf-8', status = 200) => ({
        status,
        ok: status < 400,
        url: rawUrl,
        headers: new Headers({ 'content-type': type }),
        text,
        truncated: false,
        redirects: [],
      });
      if (u.pathname === '/robots.txt') return body(GOOD_ROBOTS, 'text/plain');
      if (u.pathname === '/sitemap.xml') return body(GOOD_SITEMAP, 'application/xml');
      if (u.pathname === '/llms.txt') return body(GOOD_LLMS, 'text/plain');
      return body(GOOD_HOME);
    },
  };
});

import { GET as listSites, POST as createSite } from '@/app/api/admin/blocked-sites/route';
import { PATCH as patchSite, DELETE as deleteSite } from '@/app/api/admin/blocked-sites/[id]/route';
import { GET as publicBlocklist } from '@/app/api/public/blocklist/route';
import { POST as aiCrawler } from '@/app/api/tools/ai-crawler/route';
import { POST as platformDetect } from '@/app/api/tools/platform-detect/route';
import { POST as contentAudit } from '@/app/api/tools/content-audit/route';
import { clearBlocklistCache } from '@/server/blocklist';

const YT = 'https://www.youtube.com/watch?v=yanit';
type SiteRow = { id: string; hostname: string; redirectUrl: string; note: string | null; hits: number };

beforeEach(() => {
  fetchCalls.length = 0;
  clearBlocklistCache();
});

describe('admin yetkisi', () => {
  it('oturumsuz 401; sıradan OWNER 403 (GET/POST/PATCH/DELETE)', async () => {
    expect((await call(listSites)).status).toBe(401);
    const { user } = await createTenant();
    await loginAs(user);
    expect((await call(listSites)).status).toBe(403);
    expect((await call(createSite, { method: 'POST', body: { hostname: 'x.example', redirectUrl: YT } })).status).toBe(
      403,
    );
    expect((await call(patchSite, { method: 'PATCH', body: { note: 'x' }, params: { id: 'nope' } })).status).toBe(403);
    expect((await call(deleteSite, { method: 'DELETE', params: { id: 'nope' } })).status).toBe(403);
    expect(await prisma.blockedSite.count()).toBe(0);
  });
});

describe('admin CRUD', () => {
  it('ekle (normalize + audit) → çakışma 409 → düzenle → listede → sil (audit)', async () => {
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const r = await call(createSite, {
      method: 'POST',
      body: { hostname: 'https://WWW.Engelli.Example/yol?x=1', redirectUrl: YT, note: ' spam ' },
    });
    expect(r.status).toBe(201);
    const row = r.json as unknown as SiteRow;
    expect(row.hostname).toBe('engelli.example');
    expect(row.note).toBe('spam');
    expect(row.hits).toBe(0);
    expect(r.text).not.toMatch(/passwordHash|secret|sk-/i);
    expect(await prisma.auditLog.count({ where: { action: 'admin.blocked_site_create', targetId: row.id } })).toBe(1);

    const dup = await call(createSite, { method: 'POST', body: { hostname: 'engelli.example', redirectUrl: YT } });
    expect(dup.status).toBe(409);

    const p = await call(patchSite, {
      method: 'PATCH',
      body: { redirectUrl: 'https://youtu.be/abc', note: null },
      params: { id: row.id },
    });
    expect(p.status).toBe(200);
    expect((p.json as unknown as SiteRow).redirectUrl).toBe('https://youtu.be/abc');
    expect((p.json as unknown as SiteRow).note).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: 'admin.blocked_site_update', targetId: row.id } })).toBe(1);

    const list = await call(listSites);
    expect(list.status).toBe(200);
    expect((list.json as unknown as { items: SiteRow[] }).items.map((x) => x.hostname)).toEqual(['engelli.example']);

    // "Test et": alt alan adı eşleşir, hits ARTMAZ
    const t = await call(listSites, { url: '/api/admin/blocked-sites?host=shop.engelli.example' });
    expect(t.json).toMatchObject({ hostname: 'shop.engelli.example', blocked: true, matched: 'engelli.example' });
    expect((await prisma.blockedSite.findUniqueOrThrow({ where: { id: row.id } })).hits).toBe(0);

    const d = await call(deleteSite, { method: 'DELETE', params: { id: row.id } });
    expect(d.status).toBe(200);
    expect(await prisma.blockedSite.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'admin.blocked_site_delete', targetId: row.id } })).toBe(1);
    expect((await call(deleteSite, { method: 'DELETE', params: { id: row.id } })).status).toBe(404);
  });

  it('YouTube dışı yönlendirme 400; kamu son eki 400; geçersiz alan adı 400 — kayıt yok', async () => {
    const { user } = await createTenant({ superAdmin: true });
    await loginAs(user);
    const vimeo = await call(createSite, {
      method: 'POST',
      body: { hostname: 'x.example', redirectUrl: 'https://vimeo.com/1' },
    });
    expect(vimeo.status).toBe(400);
    expect(String(vimeo.json.message)).toMatch(/Yalnızca youtube\.com \/ youtu\.be bağlantıları/);
    for (const redirectUrl of [
      'http://www.youtube.com/watch?v=a',
      'https://m.youtube.com/watch?v=a',
      'https://youtube.com.evil.example/',
    ]) {
      expect((await call(createSite, { method: 'POST', body: { hostname: 'x.example', redirectUrl } })).status).toBe(
        400,
      );
    }
    for (const hostname of ['com.tr', 'gov.tr', 'co.uk', 'www.org.tr', 'github.io']) {
      const r = await call(createSite, { method: 'POST', body: { hostname, redirectUrl: YT } });
      expect(r.status, hostname).toBe(400);
      expect(String(r.json.message)).toMatch(/kamu son eki/);
    }
    for (const hostname of ['acme', 'acme.com:8080', 'user@acme.com', '', '127.0.0.1']) {
      expect((await call(createSite, { method: 'POST', body: { hostname, redirectUrl: YT } })).status, hostname).toBe(
        400,
      );
    }
    expect(await prisma.blockedSite.count()).toBe(0);
  });
});

describe('public blocklist ucu', () => {
  it('eşleşme {blocked, redirectUrl} + hits++; alt alan adı; bilinmeyen/geçersiz {blocked:false}', async () => {
    const site = await prisma.blockedSite.create({ data: { hostname: 'engelli.example', redirectUrl: YT } });
    const r = await call(publicBlocklist, {
      url: '/api/public/blocklist?host=https://shop.engelli.example/x',
      headers: { 'x-forwarded-for': '198.51.100.201' },
    });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ blocked: true, redirectUrl: YT });
    await new Promise((res) => setTimeout(res, 50));
    expect((await prisma.blockedSite.findUniqueOrThrow({ where: { id: site.id } })).hits).toBe(1);

    const ok = await call(publicBlocklist, {
      url: '/api/public/blocklist?host=temiz.example',
      headers: { 'x-forwarded-for': '198.51.100.202' },
    });
    expect(ok.json).toEqual({ blocked: false });
    const bad = await call(publicBlocklist, {
      url: '/api/public/blocklist?host=%20',
      headers: { 'x-forwarded-for': '198.51.100.203' },
    });
    expect(bad.status).toBe(200);
    expect(bad.json).toEqual({ blocked: false });
    expect((await call(publicBlocklist, { headers: { 'x-forwarded-for': '198.51.100.204' } })).json).toEqual({
      blocked: false,
    });
  });

  it('IP başına 60/dk: 61. istek 429', async () => {
    let last = { status: 0 };
    for (let i = 0; i <= 60; i += 1) {
      last = await call(publicBlocklist, {
        url: '/api/public/blocklist?host=x.example',
        headers: { 'x-forwarded-for': '198.51.100.210' },
      });
    }
    expect(last.status).toBe(429);
  });
});

describe('3 farklı public tool route — 200 {blocked} + fetch 0, kayıt yok', () => {
  it('ai-crawler (handlePublicScan), platform-detect, content-audit', async () => {
    logout();
    await prisma.blockedSite.create({ data: { hostname: 'engelli.example', redirectUrl: YT } });
    const cases = [
      { h: aiCrawler, url: 'https://engelli.example/', ip: '198.51.100.221' },
      { h: platformDetect, url: 'shop.engelli.example', ip: '198.51.100.222' },
      { h: contentAudit, url: 'http://www.engelli.example/sayfa', ip: '198.51.100.223' },
    ];
    for (const c of cases) {
      const r = await call(c.h, { method: 'POST', body: { url: c.url }, headers: { 'x-forwarded-for': c.ip } });
      expect(r.status, c.url).toBe(200);
      expect(r.json, c.url).toEqual({ blocked: true, redirectUrl: YT });
    }
    expect(fetchCalls.length).toBe(0);
    expect(await prisma.publicScan.count()).toBe(0);
    expect(await prisma.audit.count()).toBe(0);
    expect(await prisma.lead.count()).toBe(0);
    await new Promise((res) => setTimeout(res, 50));
    expect((await prisma.blockedSite.findFirstOrThrow()).hits).toBe(3);

    // Temiz site normal taranır (kontrol)
    const ok = await call(aiCrawler, {
      method: 'POST',
      body: { url: 'temiz.example' },
      headers: { 'x-forwarded-for': '198.51.100.224' },
    });
    expect(ok.status).toBe(200);
    expect((ok.json as unknown as { blocked?: boolean }).blocked).toBeUndefined();
    expect(fetchCalls.length).toBeGreaterThan(0);
  });
});
