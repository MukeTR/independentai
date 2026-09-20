import { beforeEach, describe, expect, it, vi } from 'vitest';

/** safeFetch mock'u: istek sayar, host başına eşzamanlılığı ölçer, gecikme ve içerik türü kontrol edilebilir. */
const net = vi.hoisted(() => ({
  calls: [] as { url: string; method: string; headers: Record<string, string>; maxBytes?: number }[],
  active: new Map<string, number>(),
  maxActive: new Map<string, number>(),
  delayMs: 5,
  bodyBytes: 100,
  status: 200,
  contentType: 'text/html; charset=utf-8',
  fail: false,
}));

vi.mock('@/server/safe-fetch', async (importOriginal) => {
  const mod = await importOriginal<Record<string, unknown>>();
  return {
    ...mod,
    safeFetch: async (
      rawUrl: string,
      init: { method?: string; headers?: Record<string, string>; maxBytes?: number } = {},
    ) => {
      const host = new URL(rawUrl).hostname;
      net.calls.push({
        url: rawUrl,
        method: init.method ?? 'GET',
        headers: init.headers ?? {},
        maxBytes: init.maxBytes,
      });
      net.active.set(host, (net.active.get(host) ?? 0) + 1);
      net.maxActive.set(host, Math.max(net.maxActive.get(host) ?? 0, net.active.get(host) ?? 0));
      await new Promise((r) => setTimeout(r, net.delayMs));
      net.active.set(host, (net.active.get(host) ?? 0) - 1);
      if (net.fail) return null;
      const headers = new Headers({ 'content-type': net.contentType, 'content-length': String(net.bodyBytes) });
      const allowed = /^text\/|xml|json/i.test(net.contentType);
      const text =
        init.method === 'HEAD' || !allowed ? '' : 'x'.repeat(Math.min(net.bodyBytes, init.maxBytes ?? Infinity));
      return {
        status: net.status,
        ok: net.status < 400 && allowed,
        url: rawUrl,
        headers,
        text,
        truncated: false,
        redirects: [],
      };
    },
  };
});

import { ScanBudget } from '@/server/site-scan/budget';
import { MAX_BODY_BYTES } from '@/server/safe-fetch';

beforeEach(() => {
  net.calls.length = 0;
  net.active.clear();
  net.maxActive.clear();
  net.delayMs = 5;
  net.bodyBytes = 100;
  net.status = 200;
  net.contentType = 'text/html; charset=utf-8';
  net.fail = false;
});

const budget = (o: Partial<ConstructorParameters<typeof ScanBudget>[0]> = {}) =>
  new ScanBudget({ maxRequests: 5, maxBytes: 10_000, deadlineAt: Date.now() + 5_000, ...o });

describe('ScanBudget.fetch', () => {
  it('istek sayar, bayt sayar, sonuç Artifact döner; UA/başlıklar safeFetch’e geçer', async () => {
    const b = budget();
    const a = await b.fetch('https://a.example/', 1000, { headers: { 'User-Agent': 'YanitBot/1.0' } });
    expect(a.ok).toBe(true);
    expect(a.text.length).toBe(100);
    expect(b.stats()).toMatchObject({ requests: 1, bytes: 100, exhausted: false, reason: null, skipped: 0 });
    expect(net.calls[0]?.headers['User-Agent']).toBe('YanitBot/1.0');
  });

  it('maxRequests dolunca ağa çıkmaz: error budget, skipped artar, exhausted/reason', async () => {
    const b = budget({ maxRequests: 2 });
    await b.fetch('https://a.example/1', 1000);
    await b.fetch('https://a.example/2', 1000);
    const third = await b.fetch('https://a.example/3', 1000);
    expect(third.error).toBe('budget');
    expect(third.ok).toBe(false);
    expect(net.calls.length).toBe(2);
    expect(b.exhausted).toBe(true);
    expect(b.stats()).toMatchObject({ requests: 2, reason: 'requests', skipped: 1 });
  });

  it('maxBytes aşılınca bütçe dolar', async () => {
    net.bodyBytes = 600;
    const b = budget({ maxBytes: 1000 });
    await b.fetch('https://a.example/1', 1000);
    expect(b.exhausted).toBe(false);
    await b.fetch('https://a.example/2', 1000);
    expect(b.exhausted).toBe(true);
    expect(b.exhaustReason).toBe('bytes');
    expect((await b.fetch('https://a.example/3', 1000)).error).toBe('budget');
  });

  it('deadline geçince bütçe dolar', async () => {
    const b = budget({ deadlineAt: Date.now() - 1 });
    expect(b.exhausted).toBe(true);
    expect(b.exhaustReason).toBe('deadline');
    expect((await b.fetch('https://a.example/', 1000)).error).toBe('budget');
    expect(net.calls.length).toBe(0);
  });

  it('host başına eşzamanlılık perHost ile sınırlı; farklı hostlar birbirini beklemez', async () => {
    net.delayMs = 20;
    const b = budget({ maxRequests: 100, perHost: 2 });
    await Promise.all([
      ...Array.from({ length: 6 }, (_, i) => b.fetch(`https://a.example/${i}`, 1000)),
      ...Array.from({ length: 3 }, (_, i) => b.fetch(`https://b.example/${i}`, 1000)),
    ]);
    expect(net.maxActive.get('a.example')).toBe(2);
    expect(net.maxActive.get('b.example')).toBe(2);
    expect(net.calls.length).toBe(9);
    expect(b.stats().requests).toBe(9);
  });

  it('tek istek gövdesi MAX_BODY_BYTES (2 MB) ile sınırlı: kalan bütçe ne olursa olsun, paralelde de', async () => {
    expect(MAX_BODY_BYTES).toBe(2 * 1024 * 1024);
    const b = budget({ maxRequests: 100, maxBytes: 20 * 1024 * 1024, perHost: 4 });
    await Promise.all(Array.from({ length: 4 }, (_, i) => b.fetch(`https://a.example/${i}`, 1000)));
    expect(net.calls).toHaveLength(4);
    for (const c of net.calls) expect(c.maxBytes).toBe(MAX_BODY_BYTES);
    // init.maxBytes daha küçükse o geçer; daha büyükse yine tavan
    net.calls.length = 0;
    await b.fetch('https://a.example/x', 1000, { maxBytes: 1000 });
    await b.fetch('https://a.example/y', 1000, { maxBytes: 5 * 1024 * 1024 });
    expect(net.calls.map((c) => c.maxBytes)).toEqual([1000, MAX_BODY_BYTES]);
    // kalan bütçe tavandan küçükse kalan geçer (en az 1024)
    const small = budget({ maxBytes: 5000 });
    net.bodyBytes = 4000;
    await small.fetch('https://a.example/1', 1000);
    await small.fetch('https://a.example/2', 1000);
    expect(net.calls.slice(-2).map((c) => c.maxBytes)).toEqual([5000, 1024]);
  });

  it('ağ hatasında error network, istek yine sayılır', async () => {
    net.fail = true;
    const b = budget();
    const a = await b.fetch('https://a.example/', 1000);
    expect(a.error).toBe('network');
    expect(b.stats().requests).toBe(1);
  });
});

describe('ScanBudget.head', () => {
  it('HEAD ile status/headers/contentType/contentLength döner; izinsiz content-type (image) olsa da okunur', async () => {
    net.contentType = 'image/jpeg';
    net.bodyBytes = 245_000;
    const b = budget();
    const h = await b.head('https://a.example/og.jpg', 1000);
    expect(net.calls[0]?.method).toBe('HEAD');
    expect(h.status).toBe(200);
    expect(h.ok).toBe(true);
    expect(h.contentType).toBe('image/jpeg');
    expect(h.contentLength).toBe(245_000);
    expect(b.stats()).toMatchObject({ requests: 1, bytes: 0 });
  });

  it('4xx durumda ok:false ama status döner; bütçe doluysa error budget', async () => {
    net.status = 404;
    const b = budget({ maxRequests: 1 });
    const h = await b.head('https://a.example/x', 1000);
    expect(h.status).toBe(404);
    expect(h.ok).toBe(false);
    const h2 = await b.head('https://a.example/y', 1000);
    expect(h2.error).toBe('budget');
    expect(net.calls.length).toBe(1);
  });

  it('ağ hatasında error network', async () => {
    net.fail = true;
    const h = await budget().head('https://a.example/x', 1000);
    expect(h.error).toBe('network');
    expect(h.status).toBe(0);
  });

  it('yarış zamanlayıcısı yanıt gelince temizlenir (event loop askıda kalmaz)', async () => {
    vi.useFakeTimers();
    try {
      net.delayMs = 0;
      const b = budget();
      const p = b.head('https://a.example/x', 5000);
      await vi.advanceTimersByTimeAsync(1);
      const h = await p;
      expect(h.status).toBe(200);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
