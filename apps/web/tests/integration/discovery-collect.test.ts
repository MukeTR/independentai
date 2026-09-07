/**
 * Collector güvenliği ve doğruluğu — tarayıcı ve sunucu/edge kanalları.
 * Odak: anahtar/origin sınırı, dedupe, hedef dönüşümü, PII/IP sızmaması, imza ve replay.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createTenant, call, flushAfter, prisma, uniq } from './helpers';
import { POST as collectEvent, OPTIONS as collectOptions } from '@/app/api/collect/v1/event/route';
import { POST as collectBatch } from '@/app/api/collect/v1/batch/route';
import { POST as collectServer } from '@/app/api/collect/v1/server/route';
import { hashKey, PUBLIC_KEY_PREFIX } from '@/server/discovery/sites';
import { signPayload } from '@/server/discovery/crawler-ingest';
import { encrypt } from '@/server/crypto';

const ORIGIN = 'https://ornek.com';

async function seedSite(
  opts: { status?: 'PENDING' | 'ACTIVE' | 'PAUSED' | 'REVOKED'; secret?: string; domain?: string } = {},
) {
  const { tenant, user } = await createTenant();
  const publicKey = `${PUBLIC_KEY_PREFIX}${uniq('k')}${'a'.repeat(20)}`;
  const domain = opts.domain ?? `${uniq('d')}.example`;
  const site = await prisma.trackedSite.create({
    data: {
      tenantId: tenant.id,
      domain,
      normalizedOrigin: `https://${domain}`,
      allowedOrigins: [`https://${domain}`, ORIGIN],
      publicKeyHash: hashKey(publicKey),
      publicKeyPrefix: `${publicKey.slice(0, 11)}…`,
      status: opts.status ?? 'ACTIVE',
      ...(opts.secret ? { ingestSecretEnc: encrypt(opts.secret), ingestSecretPrefix: 'iaix_x…' } : {}),
    },
  });
  return { tenant, user, site, publicKey };
}

function event(over: Record<string, unknown> = {}) {
  return {
    id: uniq('evt') + '12345678',
    sid: uniq('sid') + '1234567',
    t: 'page_view',
    p: '/',
    ts: Date.now(),
    ...over,
  };
}

async function send(publicKey: string, events: unknown, headers: Record<string, string> = {}) {
  return call(collectEvent, {
    method: 'POST',
    url: '/api/collect/v1/event',
    body: { k: publicKey, e: events },
    headers: { origin: ORIGIN, ...headers },
  });
}

beforeEach(() => {
  // Her testte taze IP: hız sınırı kovaları testler arası taşmasın.
});

describe('tarayıcı collector — yetki', () => {
  it('geçerli anahtar + kayıtlı origin → 202 ve olay yazılır', async () => {
    const { site, publicKey } = await seedSite({ status: 'PENDING' });
    const r = await send(publicKey, [event({ p: '/fiyatlar?utm_source=x#alt', r: 'https://chatgpt.com/c/1' })]);
    expect(r.status).toBe(202);
    await flushAfter();

    const stored = await prisma.aiJourneyEvent.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(stored.path).toBe('/fiyatlar'); // query ve hash düşürüldü
    const session = await prisma.aiAcquisitionSession.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(session.sourceClass).toBe('AI_REFERRAL');
    expect(session.provider).toBe('openai');
    expect(session.referrerHost).toBe('chatgpt.com'); // tam URL değil, yalnızca host

    // İlk geçerli olay siteyi doğrular ve aktifleştirir
    const after = await prisma.trackedSite.findUniqueOrThrow({ where: { id: site.id } });
    expect(after.status).toBe('ACTIVE');
    expect(after.verifiedAt).not.toBeNull();
    expect(after.lastBrowserEventAt).not.toBeNull();
  });

  it('geçersiz anahtar 401; duraklatılmış 403; iptal edilmiş 403', async () => {
    expect((await send(`${PUBLIC_KEY_PREFIX}yoksa${'x'.repeat(20)}`, [event()])).status).toBe(401);
    const paused = await seedSite({ status: 'PAUSED' });
    expect((await send(paused.publicKey, [event()])).status).toBe(403);
    const revoked = await seedSite({ status: 'REVOKED' });
    expect((await send(revoked.publicKey, [event()])).status).toBe(403);
  });

  it('kayıtlı olmayan origin reddedilir (403) ve hiçbir şey yazılmaz', async () => {
    const { site, publicKey } = await seedSite();
    const r = await send(publicKey, [event()], { origin: 'https://baskasite.com' });
    expect(r.status).toBe(403);
    expect(r.json.code).toBe('origin_not_allowed');
    await flushAfter();
    expect(await prisma.aiJourneyEvent.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });

  it('origin başlığı yoksa reddedilir', async () => {
    const { publicKey } = await seedSite();
    const r = await call(collectEvent, {
      method: 'POST',
      url: '/api/collect/v1/event',
      body: { k: publicKey, e: [event()] },
    });
    expect(r.status).toBe(403);
  });

  it('CORS yalnızca kayıtlı origin’i yansıtır, wildcard yok', async () => {
    const { publicKey } = await seedSite();
    const ok = await send(publicKey, [event()]);
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(ok.headers.get('vary')).toContain('Origin');
    expect(ok.headers.get('access-control-allow-credentials')).toBeNull();

    const pre = await call(collectOptions, {
      method: 'OPTIONS',
      url: `/api/collect/v1/event?k=${publicKey}`,
      headers: { origin: ORIGIN },
    });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe(ORIGIN);

    const badPre = await call(collectOptions, {
      method: 'OPTIONS',
      url: `/api/collect/v1/event?k=${publicKey}`,
      headers: { origin: 'https://kotu.com' },
    });
    expect(badPre.status).toBe(403);
    expect(badPre.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('bir sitenin anahtarı başka tenant’a yazamaz (cross-tenant)', async () => {
    const a = await seedSite();
    const b = await seedSite();
    await send(a.publicKey, [event()]);
    await flushAfter();
    expect(await prisma.aiJourneyEvent.count({ where: { tenantId: b.tenant.id } })).toBe(0);
    expect(await prisma.aiJourneyEvent.count({ where: { tenantId: a.tenant.id } })).toBe(1);
  });
});

describe('tarayıcı collector — doğrulama ve dedupe', () => {
  it('aynı eventId ikinci kez yazılmaz', async () => {
    const { site, publicKey } = await seedSite();
    const e = event();
    await send(publicKey, [e]);
    await flushAfter();
    await send(publicKey, [e]);
    await flushAfter();
    expect(await prisma.aiJourneyEvent.count({ where: { trackedSiteId: site.id } })).toBe(1);
  });

  it('bilinmeyen olay tipi ve eski/ileri zaman damgası yazılmaz', async () => {
    const { site, publicKey } = await seedSite();
    await send(publicKey, [
      event({ t: 'kotu_olay' }),
      event({ ts: Date.now() + 3_600_000 }),
      event({ ts: Date.now() - 40 * 3_600_000 }),
    ]);
    await flushAfter();
    expect(await prisma.aiJourneyEvent.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });

  it('gövde çok büyükse 413', async () => {
    const { publicKey } = await seedSite();
    const big = await call(collectEvent, {
      method: 'POST',
      url: '/api/collect/v1/event',
      body: { k: publicKey, e: [event({ el: 'x'.repeat(40_000) })] },
      headers: { origin: ORIGIN },
    });
    expect(big.status).toBe(413);
  });

  it('parti sınırı aşılırsa 413 (batch ucu 20 olay)', async () => {
    const { publicKey } = await seedSite();
    const many = Array.from({ length: 25 }, () => event());
    const r = await call(collectBatch, {
      method: 'POST',
      url: '/api/collect/v1/batch',
      body: { k: publicKey, e: many },
      headers: { origin: ORIGIN },
    });
    expect([400, 413]).toContain(r.status);
  });

  it('site hız sınırı dolduğunda 429 + Retry-After döner ve olay yazılmaz', async () => {
    const { site, publicKey } = await seedSite();
    // Kovayı sınıra kadar doldur (600/dk); sonraki istek reddedilmeli.
    await prisma.rateLimitBucket.create({
      data: { key: `collect:site:${site.id}`, count: 600, resetAt: new Date(Date.now() + 60_000) },
    });
    const r = await send(publicKey, [event()]);
    expect(r.status).toBe(429);
    expect(r.json.code).toBe('rate_limited');
    expect(r.headers.get('retry-after')).toBeTruthy();
    await flushAfter();
    expect(await prisma.aiJourneyEvent.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });

  it('aylık kota dolduğunda 429 quota_exceeded döner', async () => {
    const { site, publicKey } = await seedSite();
    await prisma.rateLimitBucket.create({
      data: { key: `collect:quota:${site.id}`, count: 250_000, resetAt: new Date(Date.now() + 30 * 86_400_000) },
    });
    const r = await send(publicKey, [event()]);
    expect(r.status).toBe(429);
    expect(r.json.code).toBe('quota_exceeded');
  });

  it('PII ve ham IP hiçbir kayda yazılmaz', async () => {
    const { site, publicKey } = await seedSite();
    await send(publicKey, [event({ p: '/hesap/ali@ornek.com', el: 'Ali Veli +90 532 111 22 33', et: 'profile' })], {
      'x-forwarded-for': '203.0.113.77',
    });
    await flushAfter();
    const rows = await prisma.aiJourneyEvent.findMany({ where: { trackedSiteId: site.id } });
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain('ali@ornek.com');
    expect(dump).not.toContain('203.0.113.77');
    expect(dump).toContain('[email]');
    const sessions = JSON.stringify(await prisma.aiAcquisitionSession.findMany({ where: { trackedSiteId: site.id } }));
    expect(sessions).not.toContain('203.0.113.77');
  });
});

describe('hedef dönüşümü', () => {
  it('yol hedefi eşleşir, oturum dönüşür ve aynı hedef ikinci kez sayılmaz', async () => {
    const { site, publicKey } = await seedSite();
    const goal = await prisma.siteGoal.create({
      data: {
        tenantId: site.tenantId,
        trackedSiteId: site.id,
        name: 'Teşekkürler',
        type: 'LEAD',
        matchMethod: 'PATH',
        pathPattern: '/tesekkurler',
      },
    });
    const sid = `${uniq('sid')}1234567`;
    await send(publicKey, [event({ sid, p: '/', r: 'https://claude.ai/x' })]);
    await flushAfter();
    await send(publicKey, [event({ sid, p: '/tesekkurler' })]);
    await flushAfter();

    const session = await prisma.aiAcquisitionSession.findFirstOrThrow({
      where: { trackedSiteId: site.id, sessionKey: sid },
    });
    expect(session.convertedAt).not.toBeNull();
    expect(session.goalId).toBe(goal.id);
    expect(session.provider).toBe('anthropic');

    // Aynı hedefe ikinci kez ulaşmak yeni dönüşüm saymaz
    const firstConvertedAt = session.convertedAt;
    await send(publicKey, [event({ sid, p: '/tesekkurler' })]);
    await flushAfter();
    const again = await prisma.aiAcquisitionSession.findFirstOrThrow({ where: { id: session.id } });
    expect(again.convertedAt).toEqual(firstConvertedAt);
    const conversions = await prisma.aiJourneyEvent.count({ where: { sessionId: session.id, goalId: goal.id } });
    expect(conversions).toBe(2); // olaylar yazılır ama dönüşüm bir kez sayılır
  });

  it('data-iai-event hedefi özel olay adıyla eşleşir', async () => {
    const { site, publicKey } = await seedSite();
    await prisma.siteGoal.create({
      data: {
        tenantId: site.tenantId,
        trackedSiteId: site.id,
        name: 'Teklif',
        type: 'LEAD',
        matchMethod: 'DATA_ATTRIBUTE',
        attributeValue: 'teklif_al',
      },
    });
    await send(publicKey, [event({ t: 'custom', n: 'teklif_al' })]);
    await flushAfter();
    const ev = await prisma.aiJourneyEvent.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(ev.goalId).not.toBeNull();
  });
});

describe('sunucu/edge collector', () => {
  const SECRET = 'iaix_test_secret_value_1234567890';

  async function sendServer(publicKey: string, body: unknown, opts: { secret?: string; ts?: string } = {}) {
    const raw = JSON.stringify(body);
    const ts = opts.ts ?? String(Date.now());
    const sig = signPayload(opts.secret ?? SECRET, ts, raw);
    return call(collectServer, {
      method: 'POST',
      url: '/api/collect/v1/server',
      body,
      headers: { 'x-iai-key': publicKey, 'x-iai-timestamp': ts, 'x-iai-signature': sig },
    });
  }

  it('geçerli imza → 202 ve crawler kaydı; edge doğrulaması VERIFIED yapar', async () => {
    const { site, publicKey } = await seedSite({ secret: SECRET });
    const r = await sendServer(publicKey, {
      hits: [
        {
          id: `${uniq('h')}12345678`,
          ua: 'Mozilla/5.0 (compatible; GPTBot/1.2)',
          path: '/urun/1?x=1',
          status: 200,
          verified: true,
          src: 'cloudflare',
        },
      ],
    });
    expect(r.status).toBe(202);
    await flushAfter();
    const hit = await prisma.aiCrawlerEvent.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(hit.canonicalBotId).toBe('openai.gptbot');
    expect(hit.verification).toBe('VERIFIED');
    expect(hit.verificationMethod).toBe('edge');
    expect(hit.path).toBe('/urun/1'); // query düşürüldü
    const site2 = await prisma.trackedSite.findUniqueOrThrow({ where: { id: site.id } });
    expect(site2.lastServerEventAt).not.toBeNull();
  });

  it('yalnızca user-agent → UNVERIFIED (asla VERIFIED değil)', async () => {
    const { site, publicKey } = await seedSite({ secret: SECRET });
    await sendServer(publicKey, { hits: [{ id: `${uniq('h')}12345678`, ua: 'ClaudeBot/1.0', path: '/' }] });
    await flushAfter();
    const hit = await prisma.aiCrawlerEvent.findFirstOrThrow({ where: { trackedSiteId: site.id } });
    expect(hit.verification).toBe('UNVERIFIED');
    expect(hit.verificationMethod).toBe('user_agent');
  });

  it('Google-Extended ve bilinmeyen UA ziyaret üretmez', async () => {
    const { site, publicKey } = await seedSite({ secret: SECRET });
    await sendServer(publicKey, {
      hits: [
        { id: `${uniq('h')}12345678`, ua: 'Google-Extended', path: '/' },
        {
          id: `${uniq('h')}12345678`,
          ua: 'Mozilla/5.0 (Windows NT 10.0; rv:120.0) Gecko/20100101 Firefox/120.0',
          path: '/',
        },
      ],
    });
    await flushAfter();
    expect(await prisma.aiCrawlerEvent.count({ where: { trackedSiteId: site.id } })).toBe(0);
  });

  it('imza yanlışsa 401; zaman damgası eskiyse 401; sır yoksa 403', async () => {
    const { publicKey } = await seedSite({ secret: SECRET });
    const bad = await sendServer(
      publicKey,
      { hits: [{ id: `${uniq('h')}12345678`, ua: 'GPTBot', path: '/' }] },
      { secret: 'yanlis-sir-degeri-123456' },
    );
    expect(bad.status).toBe(401);
    expect(bad.json.code).toBe('bad_signature');

    const stale = await sendServer(
      publicKey,
      { hits: [{ id: `${uniq('h')}12345678`, ua: 'GPTBot', path: '/' }] },
      { ts: String(Date.now() - 20 * 60_000) },
    );
    expect(stale.status).toBe(401);
    expect(stale.json.code).toBe('stale_timestamp');

    const noSecret = await seedSite();
    const r = await sendServer(noSecret.publicKey, { hits: [{ id: `${uniq('h')}12345678`, ua: 'GPTBot', path: '/' }] });
    expect(r.status).toBe(403);
    expect(r.json.code).toBe('no_ingest_secret');
  });

  it('aynı hit iki kez gönderilirse tek kayıt kalır', async () => {
    const { site, publicKey } = await seedSite({ secret: SECRET });
    const hit = { id: `${uniq('h')}12345678`, ua: 'PerplexityBot/1.0', path: '/blog' };
    await sendServer(publicKey, { hits: [hit] });
    await flushAfter();
    await sendServer(publicKey, { hits: [hit] });
    await flushAfter();
    expect(await prisma.aiCrawlerEvent.count({ where: { trackedSiteId: site.id } })).toBe(1);
  });

  it('IP yalnızca doğrulama içindir; kayıtta bulunmaz', async () => {
    const { site, publicKey } = await seedSite({ secret: SECRET });
    await sendServer(publicKey, {
      hits: [{ id: `${uniq('h')}12345678`, ua: 'GPTBot/1.0', path: '/', ip: '198.51.100.9' }],
    });
    await flushAfter();
    const rows = JSON.stringify(await prisma.aiCrawlerEvent.findMany({ where: { trackedSiteId: site.id } }));
    expect(rows).not.toContain('198.51.100.9');
  });
});
