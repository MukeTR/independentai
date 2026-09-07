import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  normalizeHost,
  normalizeOrigin,
  redactPii,
  safeToken,
  toEventType,
  normalizeEvent,
  MAX_FUTURE_SKEW_MS,
  MAX_PAST_SKEW_MS,
  IncomingEventSchema,
} from '@/server/discovery/events';
import { classifySource, providerLabel, AI_SOURCES } from '@/server/discovery/ai-sources';
import { matchBot, verifyBot, BOT_REGISTRY, CONTROL_TOKEN_IDS } from '@/server/discovery/bots';
import { pathMatches, matchGoal } from '@/server/discovery/goals';
import { buildAllowedOrigins, originAllowed, hashKey, computeHealth } from '@/server/discovery/sites';
import { signPayload, signaturesMatch } from '@/server/discovery/crawler-ingest';
import { dimKeyOf, dayStart } from '@/server/discovery/rollup';
import type { SiteGoal, TrackedSite } from '@independentai/db';

describe('olay normalizasyonu', () => {
  it('yolu query/hash olmadan, PII temizlenmiş döndürür', () => {
    expect(normalizePath('/urunler/kahve?utm_source=x#bolum')).toBe('/urunler/kahve');
    expect(normalizePath('https://ornek.com/a/b/?q=1')).toBe('/a/b');
    expect(normalizePath('a/b')).toBe('/a/b');
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/hesap/ali@ornek.com')).toBe('/hesap/[email]');
    expect(normalizePath('//a///b//')).toBe('/a/b');
  });

  it('host ve origin normalize eder, geçersizi reddeder', () => {
    expect(normalizeHost('https://WWW.Ornek.com:443/x')).toBe('ornek.com');
    expect(normalizeHost('chatgpt.com')).toBe('chatgpt.com');
    expect(normalizeHost('localhost')).toBeNull();
    expect(normalizeHost('')).toBeNull();
    expect(normalizeOrigin('ornek.com')).toBe('https://ornek.com');
    expect(normalizeOrigin('https://ornek.com:8443/yol')).toBe('https://ornek.com:8443');
    expect(normalizeOrigin('ftp://ornek.com')).toBeNull();
  });

  it('PII kalıplarını temizler', () => {
    expect(redactPii('mail ali@ornek.com ve tel +90 532 111 22 33')).toContain('[email]');
    expect(redactPii('tel +905321112233')).toContain('[phone]');
    expect(redactPii('abcABC123defGHI456jklMNO789pqrstu')).toContain('[token]');
  });

  it('serbest değerleri güvenli kısaltır', () => {
    expect(safeToken('  Ürün Kartı  ')).toBe('Ürün Kartı');
    expect(safeToken('<script>alert(1)</script>')).toBe('scriptalert1script');
    expect(safeToken('x'.repeat(200), 10)).toHaveLength(10);
    expect(safeToken(42)).toBeNull();
  });

  it('olay adını enum’a çevirir; bilinmeyeni reddeder', () => {
    expect(toEventType('page_view')).toBe('PAGE_VIEW');
    expect(toEventType('DEMO_REQUEST')).toBe('DEMO_REQUEST');
    expect(toEventType('demo-request')).toBe('DEMO_REQUEST');
    expect(toEventType('hack')).toBeNull();
    expect(toEventType(5)).toBeNull();
  });

  it('zaman kayması sınırlarını uygular', () => {
    const now = Date.now();
    const base = { id: 'evt-12345678', sid: 'sess-1234567', t: 'page_view' };
    expect(normalizeEvent({ ...base, ts: now + MAX_FUTURE_SKEW_MS + 60_000 }, now)).toEqual({
      ok: false,
      reason: 'timestamp_in_future',
    });
    expect(normalizeEvent({ ...base, ts: now - MAX_PAST_SKEW_MS - 60_000 }, now)).toEqual({
      ok: false,
      reason: 'timestamp_too_old',
    });
    const ok = normalizeEvent({ ...base, ts: now }, now);
    expect(ok.ok).toBe(true);
  });

  it('yalnızca allowlist UTM alanlarını taşır', () => {
    const r = normalizeEvent({
      id: 'evt-12345678',
      sid: 'sess-1234567',
      t: 'page_view',
      u: { utm_source: 'chatgpt', utm_term: 'gizli', utm_campaign: 'lansman' },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event.utm).toEqual({ utm_source: 'chatgpt', utm_campaign: 'lansman' });
    expect(JSON.stringify(r.event.utm)).not.toContain('gizli');
  });

  it('şema aşırı büyük/eksik gövdeyi reddeder', () => {
    expect(IncomingEventSchema.safeParse({ id: 'x', sid: 'y', t: 'page_view' }).success).toBe(false);
    expect(IncomingEventSchema.safeParse({ id: 'evt-12345678', sid: 'sess-1234567' }).success).toBe(false);
    expect(
      IncomingEventSchema.safeParse({ id: 'evt-12345678', sid: 'sess-1234567', t: 'page_view', v: -5 }).success,
    ).toBe(false);
  });
});

describe('AI kaynak sınıflandırması', () => {
  it('bilinen AI hostlarını tam eşleşmeyle tanır', () => {
    expect(classifySource({ referrerHost: 'chatgpt.com' })).toMatchObject({
      sourceClass: 'AI_REFERRAL',
      provider: 'openai',
    });
    expect(classifySource({ referrerHost: 'https://claude.ai/chat/123' })).toMatchObject({ provider: 'anthropic' });
    expect(classifySource({ referrerHost: 'gemini.google.com' })).toMatchObject({ provider: 'google' });
  });

  it('benzer ama farklı hostları AI saymaz (substring yok)', () => {
    for (const host of ['notchatgpt.com', 'chatgpt.com.evil.co', 'openai.example.com', 'fake-claude.ai']) {
      expect(classifySource({ referrerHost: host }).sourceClass, host).not.toBe('AI_REFERRAL');
    }
  });

  it('arama motorunu ORGANIC, referrersizi DIRECT sayar', () => {
    expect(classifySource({ referrerHost: 'google.com' }).sourceClass).toBe('ORGANIC');
    expect(classifySource({ referrerHost: null }).sourceClass).toBe('DIRECT');
    expect(classifySource({}).reason).toBe('no_referrer');
  });

  it('UTM yalnızca referrer YOKKEN ve tanınan adla AI sayılır', () => {
    expect(classifySource({ utm: { utm_source: 'chatgpt' } })).toMatchObject({
      sourceClass: 'AI_REFERRAL',
      reason: 'utm_ai',
    });
    expect(classifySource({ utm: { utm_source: 'newsletter' } }).sourceClass).toBe('DIRECT');
    // Referrer varsa gerçek referrer kazanır (UTM uydurulabilir)
    expect(classifySource({ referrerHost: 'google.com', utm: { utm_source: 'chatgpt' } }).sourceClass).toBe('ORGANIC');
  });

  it('kendi sitesinden gelen gezinme kaynak sayılmaz', () => {
    expect(classifySource({ referrerHost: 'ornek.com', siteHost: 'ornek.com' }).sourceClass).toBe('DIRECT');
  });

  it('sağlayıcı etiketi bilinmeyende uydurmaz', () => {
    expect(providerLabel('openai')).toBe('ChatGPT');
    expect(providerLabel(null)).toBe('Bilinmiyor');
    expect(AI_SOURCES.every((s) => s.hosts.every((h) => h === h.toLowerCase()))).toBe(true);
  });
});

describe('bot doğrulama', () => {
  it('user-agent’tan botu bulur; en uzun token kazanır', () => {
    expect(matchBot('Mozilla/5.0 (compatible; GPTBot/1.2)')?.canonicalId).toBe('openai.gptbot');
    expect(matchBot('Applebot-Extended/1.0')?.canonicalId).toBe('apple.applebot-extended');
    expect(matchBot('Applebot/0.1')?.canonicalId).toBe('apple.applebot');
    expect(matchBot('Mozilla/5.0 (normal tarayıcı)')).toBeNull();
  });

  it('yalnızca user-agent asla VERIFIED üretmez', () => {
    const v = verifyBot('GPTBot/1.0');
    expect(v.verification).toBe('UNVERIFIED');
    expect(v.method).toBe('user_agent');
    expect(v.ignore).toBe(false);
  });

  it('edge/IP/ters DNS/imza sinyalleri VERIFIED yapar', () => {
    expect(verifyBot('GPTBot/1.0', { edgeVerified: true })).toMatchObject({ verification: 'VERIFIED', method: 'edge' });
    expect(verifyBot('GPTBot/1.0', { ipRangeVerified: true })).toMatchObject({
      verification: 'VERIFIED',
      method: 'ip_range',
    });
    expect(verifyBot('Googlebot/2.1', { reverseDnsVerified: true })).toMatchObject({
      verification: 'VERIFIED',
      method: 'reverse_dns',
    });
    expect(verifyBot('PerplexityBot/1.0', { signatureVerified: true })).toMatchObject({
      verification: 'VERIFIED',
      method: 'signature',
    });
  });

  it('Google-Extended ayrı ziyaret üretmez (kontrol token’ı)', () => {
    const v = verifyBot('Google-Extended');
    expect(v.ignore).toBe(true);
    expect(v.reason).toBe('control_token_only');
    expect(CONTROL_TOKEN_IDS.has('google.google-extended')).toBe(true);
    expect(CONTROL_TOKEN_IDS.has('apple.applebot-extended')).toBe(true);
  });

  it('bilinmeyen bot yok sayılır ve registry tutarlıdır', () => {
    expect(verifyBot('SomeRandomCrawler/1.0').ignore).toBe(true);
    const ids = BOT_REGISTRY.map((b) => b.canonicalId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BOT_REGISTRY.every((b) => b.userAgents.every((u) => u === u.toLowerCase()))).toBe(true);
  });
});

describe('hedef eşleştirme', () => {
  const goal = (over: Partial<SiteGoal>): SiteGoal =>
    ({
      id: 'g1',
      tenantId: 't',
      trackedSiteId: 's',
      name: 'Hedef',
      type: 'LEAD',
      matchMethod: 'EVENT',
      pathPattern: null,
      eventName: null,
      attributeValue: null,
      defaultValue: null,
      currency: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...over,
    }) as SiteGoal;

  const evt = (over: Partial<Parameters<typeof matchGoal>[1]> = {}) => ({
    dedupeKey: 'e1',
    sessionKey: 's1',
    type: 'PAGE_VIEW' as const,
    customName: null,
    path: '/tesekkurler',
    referrerHost: null,
    occurredAt: new Date(),
    entityType: null,
    entityId: null,
    entityLabel: null,
    value: null,
    currency: null,
    sdkVersion: null,
    utm: null,
    ...over,
  });

  it('yol deseni: tam ve joker eşleşme', () => {
    expect(pathMatches('/tesekkurler', '/tesekkurler')).toBe(true);
    expect(pathMatches('/tesekkurler', '/tesekkurler/2')).toBe(false);
    expect(pathMatches('/rezervasyon*', '/rezervasyon/onay')).toBe(true);
    expect(pathMatches('/fiyat*', '/fiyatlandirma')).toBe(true);
    expect(pathMatches('/a', '/A')).toBe(true);
  });

  it('olay adı ve data-attribute eşleşir', () => {
    const g = goal({ matchMethod: 'EVENT', eventName: 'demo_request' });
    expect(matchGoal([g], evt({ type: 'DEMO_REQUEST' }))?.id).toBe('g1');
    const d = goal({ id: 'g2', matchMethod: 'DATA_ATTRIBUTE', attributeValue: 'teklif_al' });
    expect(matchGoal([d], evt({ type: 'CUSTOM', customName: 'teklif_al' }))?.id).toBe('g2');
    expect(matchGoal([d], evt({ type: 'CUSTOM', customName: 'baska' }))).toBeNull();
  });

  it('yol hedefi yalnızca sayfa görüntülemede sayılır', () => {
    const g = goal({ matchMethod: 'PATH', pathPattern: '/tesekkurler' });
    expect(matchGoal([g], evt({ type: 'PAGE_VIEW' }))?.id).toBe('g1');
    expect(matchGoal([g], evt({ type: 'CTA_CLICK' }))).toBeNull();
  });

  it('pasif hedef eşleşmez', () => {
    const g = goal({ matchMethod: 'PATH', pathPattern: '/tesekkurler', isActive: false });
    expect(matchGoal([g], evt())).toBeNull();
  });
});

describe('site anahtarları ve origin', () => {
  const site = {
    normalizedOrigin: 'https://ornek.com',
    allowedOrigins: ['https://ornek.com', 'https://www.ornek.com', 'https://blog.ornek.com'],
  };

  it('origin exact eşleşir; yabancı origin reddedilir', () => {
    expect(originAllowed(site, 'https://ornek.com')).toBe(true);
    expect(originAllowed(site, 'https://www.ornek.com')).toBe(true);
    expect(originAllowed(site, 'https://blog.ornek.com')).toBe(true);
    expect(originAllowed(site, 'https://kotu.com')).toBe(false);
    expect(originAllowed(site, 'https://ornek.com.kotu.com')).toBe(false);
    expect(originAllowed(site, null)).toBe(false);
  });

  it('allowlist www ve kullanıcı eklerini içerir, çöpü atar', () => {
    const list = buildAllowedOrigins('https://ornek.com', ['https://app.ornek.com', 'çöp', 'ftp://x.com']);
    expect(list).toContain('https://ornek.com');
    expect(list).toContain('https://www.ornek.com');
    expect(list).toContain('https://app.ornek.com');
    expect(list.some((o) => o.includes('ftp'))).toBe(false);
  });

  it('anahtar özeti deterministik ve ham anahtarı içermez', () => {
    const h = hashKey('iais_abc');
    expect(h).toHaveLength(64);
    expect(h).not.toContain('iais_');
    expect(hashKey('iais_abc')).toBe(h);
  });

  it('kurulum sağlığı: script yoksa uyarı, sunucu yoksa crawler uyarısı', () => {
    const base = {
      lastBrowserEventAt: null,
      lastServerEventAt: null,
      verifiedAt: null,
      status: 'PENDING',
    } as unknown as TrackedSite;
    const h = computeHealth(base);
    expect(h.browser).toBe('missing');
    expect(h.server).toBe('missing');
    expect(h.verified).toBe(false);
    expect(h.hints.some((x) => x.includes('Crawler ölçümü'))).toBe(true);

    const ok = computeHealth({
      ...base,
      lastBrowserEventAt: new Date(),
      lastServerEventAt: new Date(),
      verifiedAt: new Date(),
      status: 'ACTIVE',
    } as unknown as TrackedSite);
    expect(ok.browser).toBe('ok');
    expect(ok.server).toBe('ok');
    expect(ok.hints).toHaveLength(0);
  });
});

describe('sunucu ingest imzası', () => {
  it('imza gövde+zaman damgasına bağlıdır ve sabit zamanlı karşılaştırılır', () => {
    const sig = signPayload('gizli', '1000', '{"hits":[]}');
    expect(signPayload('gizli', '1000', '{"hits":[]}')).toBe(sig);
    expect(signPayload('gizli', '1001', '{"hits":[]}')).not.toBe(sig);
    expect(signPayload('gizli', '1000', '{"hits":[1]}')).not.toBe(sig);
    expect(signPayload('baska', '1000', '{"hits":[]}')).not.toBe(sig);
    expect(signaturesMatch(sig, sig)).toBe(true);
    expect(signaturesMatch(sig, `${sig.slice(0, -1)}0`)).toBe(false);
    expect(signaturesMatch(sig, 'kisa')).toBe(false);
  });
});

describe('rollup anahtarları', () => {
  it('boyut anahtarı sıra bağımsız ve null’a dayanıklıdır', () => {
    expect(dimKeyOf({ a: '1', b: null })).toBe(dimKeyOf({ b: null, a: '1' }));
    expect(dimKeyOf({ a: '1', b: null })).not.toBe(dimKeyOf({ a: '1', b: '2' }));
  });

  it('gün başlangıcı UTC’dir', () => {
    const d = dayStart(new Date('2026-09-07T21:30:00+03:00'));
    expect(d.toISOString()).toBe('2026-09-07T00:00:00.000Z');
  });
});
