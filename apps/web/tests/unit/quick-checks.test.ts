import { describe, expect, it } from 'vitest';
import {
  BLOCK_GPT_ROBOTS,
  GOOD_LLMS,
  GOOD_PAGE,
  GOOD_ROBOTS,
  GOOD_URL,
  POOR_PAGE,
  POOR_URL,
  pageOf,
} from '../fixtures/site-html-core';
import { QUICK_CHECK_KEYS, quickChecks, type QuickCheck } from '@/server/site-scan/quick-checks';
import type { HeadResult } from '@/server/site-scan/budget';

const byKey = (list: QuickCheck[]) => Object.fromEntries(list.map((c) => [c.key, c])) as Record<string, QuickCheck>;

const head = (status: number, contentType: string | null, contentLength: number | null = null): HeadResult => ({
  status,
  ok: status < 400,
  url: 'https://iyi-site.example/img/og.jpg',
  headers: new Headers(),
  contentType,
  contentLength,
  latencyMs: 10,
  redirects: [],
});

describe('quickChecks', () => {
  it('14 madde, sabit sırada, her birinde label/status/value/group', () => {
    const list = quickChecks(pageOf(GOOD_URL, GOOD_PAGE));
    expect(list).toHaveLength(14);
    expect(list.map((c) => c.key)).toEqual([...QUICK_CHECK_KEYS]);
    for (const c of list) {
      expect(c.label).toBeTruthy();
      expect(['pass', 'warn', 'fail']).toContain(c.status);
      expect(typeof c.value).toBe('string');
      expect(['identity', 'aiAccess', 'technical', 'shareability']).toContain(c.group);
    }
  });

  it('GOOD sayfa: kimlik/teknik maddeler pass; HSTS başlığı yoksa warn', () => {
    const c = byKey(
      quickChecks(pageOf(GOOD_URL, GOOD_PAGE, { robots: GOOD_ROBOTS, llms: GOOD_LLMS }), {
        ogHead: head(200, 'image/jpeg', 180_000),
      }),
    );
    for (const k of [
      'title',
      'description',
      'h1',
      'canonical',
      'viewport',
      'lang',
      'ogImage',
      'ogImageAbsolute',
      'jsonLdTypes',
      'organizationSchema',
      'https',
      'gptBotAllowed',
      'llmsTxt',
    ])
      expect(c[k]?.status, k).toBe('pass');
    expect(c.hsts?.status).toBe('warn');
    expect(c.ogImageAbsolute?.value).toBe('176 KB');
    expect(c.jsonLdTypes?.value).toBe('Organization, WebSite');
  });

  it('HSTS başlığı varsa pass', () => {
    const c = byKey(
      quickChecks(pageOf(GOOD_URL, GOOD_PAGE, { headers: { 'strict-transport-security': 'max-age=31536000' } })),
    );
    expect(c.hsts?.status).toBe('pass');
  });

  it('POOR sayfa: title/description/organization/https/viewport fail; h1 warn; og göreli fail; canonical warn', () => {
    const c = byKey(quickChecks(pageOf(POOR_URL, POOR_PAGE)));
    expect(c.title?.status).toBe('fail');
    expect(c.description?.status).toBe('fail');
    expect(c.h1?.status).toBe('warn');
    expect(c.h1?.value).toBe('2 adet H1');
    expect(c.canonical?.status).toBe('warn');
    expect(c.viewport?.status).toBe('fail');
    expect(c.lang?.status).toBe('warn');
    expect(c.ogImage?.status).toBe('pass');
    expect(c.ogImageAbsolute?.status).toBe('fail');
    expect(c.jsonLdTypes?.status).toBe('pass');
    expect(c.organizationSchema?.status).toBe('fail');
    expect(c.https?.status).toBe('fail');
    expect(c.hsts?.status).toBe('fail');
    expect(c.gptBotAllowed?.status).toBe('pass'); // robots yok → varsayılan izin
    expect(c.llmsTxt?.status).toBe('warn');
  });

  it('GPTBot robots ile engelliyse fail; kural kanıtta', () => {
    const c = byKey(quickChecks(pageOf(GOOD_URL, GOOD_PAGE, { robots: BLOCK_GPT_ROBOTS })));
    expect(c.gptBotAllowed?.status).toBe('fail');
    expect(c.gptBotAllowed?.value).toMatch(/Engelli/);
  });

  it('og:image HEAD: 404 fail, image dışı content-type fail, http görsel warn, HEAD yoksa tam adres pass', () => {
    const p = pageOf(GOOD_URL, GOOD_PAGE);
    expect(byKey(quickChecks(p, { ogHead: head(404, null) })).ogImageAbsolute?.status).toBe('fail');
    expect(byKey(quickChecks(p, { ogHead: head(200, 'text/html') })).ogImageAbsolute?.status).toBe('fail');
    expect(byKey(quickChecks(p)).ogImageAbsolute?.status).toBe('pass');
    const httpImg = pageOf(
      GOOD_URL,
      GOOD_PAGE.replace('https://iyi-site.example/img/og.jpg"', 'http://iyi-site.example/img/og.jpg"'),
    );
    expect(byKey(quickChecks(httpImg)).ogImageAbsolute?.status).toBe('warn');
  });

  it('title uzunluk sınırları: <10 veya >70 warn; canonical farklı host fail', () => {
    const shortTitle = pageOf(GOOD_URL, GOOD_PAGE.replace(/<title>[^<]*<\/title>/, '<title>Kısa</title>'));
    expect(byKey(quickChecks(shortTitle)).title?.status).toBe('warn');
    const otherHost = pageOf(
      GOOD_URL,
      GOOD_PAGE.replace(
        'rel="canonical" href="https://iyi-site.example/"',
        'rel="canonical" href="https://baska.example/"',
      ),
    );
    expect(byKey(quickChecks(otherHost)).canonical?.status).toBe('fail');
  });
});
