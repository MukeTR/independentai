import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Derlenmiş sensörün çalışma davranışı — jsdom OLMADAN, elle kurulan sahte global'lerle.
 * (vitest ortamı `node`; jsdom bağımlılığı eklemiyoruz.)
 *
 * Doğrulananlar: yüklenirken hata fırlatmaz, `track()` bilinmeyen alanları atar, SPA gezinmesi
 * ikinci `page_view` üretir ve giden gövdede query/hash/DOM metni bulunmaz.
 */
const BUNDLE = readFileSync(path.resolve(__dirname, '../../src/generated/sensor-v1.bundle.js'), 'utf8');

/** Gizlilik testinde aranan işaretler — hiçbiri gövdeye girmemeli. */
const SECRET_QUERY = 'GIZLI_SORGU_DEGERI';
const SECRET_HASH = 'GIZLI_HASH_PARCASI';
const SECRET_REF_PATH = 'GIZLI_REFERRER_YOLU';
const SECRET_DOM_TEXT = 'GIZLI_BUTON_METNI';

type Listener = (ev?: unknown) => void;
type WireEvent = Record<string, unknown>;
type Payload = { k: string; e: WireEvent[] };
type Beacon = { url: string; blob: Blob };
type SensorApi = { track: (name: unknown, props?: Record<string, unknown>) => void; version: string; q: unknown[] };

function makeElement(attrs: Record<string, string>) {
  const el = {
    // Gerçek DOM'da metin vardır; SDK bunu ASLA okumamalı.
    textContent: SECRET_DOM_TEXT,
    innerText: SECRET_DOM_TEXT,
    getAttribute: (name: string): string | null => attrs[name] ?? null,
    closest: (sel: string): unknown => (sel === '[data-iai-event]' && attrs['data-iai-event'] ? el : null),
  };
  return el;
}

function makeEnv(overrides: { dnt?: string | null; gpc?: boolean; respectDnt?: boolean } = {}) {
  const winListeners = new Map<string, Listener[]>();
  const docListeners = new Map<string, Listener[]>();
  const store = new Map<string, string>();
  const beacons: Beacon[] = [];
  const fetches: { url: string; init: Record<string, unknown> }[] = [];
  let beaconOk = true;

  const add = (map: Map<string, Listener[]>) => (type: string, fn: Listener) => {
    const list = map.get(type) ?? [];
    list.push(fn);
    map.set(type, list);
  };

  const scriptAttrs: Record<string, string> = { 'data-site': 'iais_test_public_key_123' };
  if (overrides.respectDnt) scriptAttrs['data-respect-dnt'] = '1';
  const script = {
    src: 'https://sensor.example/sensor/v1.js',
    getAttribute: (name: string): string | null => scriptAttrs[name] ?? null,
  };

  const location = {
    href: `https://musteri.example/urun/1?utm_source=chatgpt&gizli=${SECRET_QUERY}#${SECRET_HASH}`,
    origin: 'https://musteri.example',
    hostname: 'musteri.example',
    pathname: '/urun/1',
    search: `?utm_source=chatgpt&utm_medium=chat&gizli=${SECRET_QUERY}`,
    hash: `#${SECRET_HASH}`,
  };

  const history: Record<string, unknown> = {
    pushState: () => undefined,
    replaceState: () => undefined,
  };

  const win: Record<string, unknown> = {
    navigator: {
      doNotTrack: overrides.dnt ?? null,
      globalPrivacyControl: overrides.gpc ?? false,
      sendBeacon: (url: string, blob: Blob): boolean => {
        if (!beaconOk) return false;
        beacons.push({ url, blob });
        return true;
      },
    },
    location,
    history,
    crypto: globalThis.crypto,
    sessionStorage: {
      getItem: (k: string): string | null => store.get(k) ?? null,
      setItem: (k: string, v: string): void => {
        store.set(k, String(v));
      },
    },
    fetch: (url: string, init: Record<string, unknown>) => {
      fetches.push({ url, init });
      return Promise.resolve({ ok: true, status: 202 });
    },
    addEventListener: add(winListeners),
  };

  const doc: Record<string, unknown> = {
    referrer: `https://chatgpt.com/c/${SECRET_REF_PATH}?q=${SECRET_QUERY}`,
    visibilityState: 'visible',
    currentScript: script,
    querySelector: () => script,
    addEventListener: add(docListeners),
  };

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = win;
  g.document = doc;

  return {
    win,
    doc,
    location,
    history,
    beacons,
    fetches,
    store,
    setBeaconOk: (v: boolean) => {
      beaconOk = v;
    },
    fire: (map: 'win' | 'doc', type: string, ev?: unknown) => {
      const list = (map === 'win' ? winListeners : docListeners).get(type) ?? [];
      for (const fn of list) fn(ev);
    },
    api: () => win.independentAI as SensorApi | undefined,
  };
}

function load(): void {
  new Function(BUNDLE)();
}

async function payloads(beacons: Beacon[]): Promise<{ url: string; raw: string; body: Payload }[]> {
  const out: { url: string; raw: string; body: Payload }[] = [];
  for (const b of beacons) {
    const raw = await b.blob.text();
    out.push({ url: b.url, raw, body: JSON.parse(raw) as Payload });
  }
  return out;
}

function allEvents(list: { body: Payload }[]): WireEvent[] {
  return list.flatMap((p) => p.body.e);
}

describe('sensor runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.window;
    delete g.document;
  });

  it('sahte global olmadan yüklenince hata fırlatmaz', () => {
    const g = globalThis as unknown as Record<string, unknown>;
    delete g.window;
    delete g.document;
    expect(() => load()).not.toThrow();
  });

  it('data-site yoksa sessizce çıkar', async () => {
    const env = makeEnv();
    const script = { src: 'https://sensor.example/sensor/v1.js', getAttribute: () => null };
    env.doc.currentScript = script;
    env.doc.querySelector = () => script;
    expect(() => load()).not.toThrow();
    vi.advanceTimersByTime(2000);
    expect(env.beacons).toHaveLength(0);
    expect(env.api()).toBeUndefined();
  });

  it('yüklenince ilk page_view üretir ve sendBeacon ile gönderir', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);

    expect(env.beacons).toHaveLength(1);
    const [first] = await payloads(env.beacons);
    expect(first?.url).toBe('https://sensor.example/api/collect/v1/event');
    expect(first?.body.k).toBe('iais_test_public_key_123');
    const ev = first?.body.e[0] as WireEvent;
    expect(ev.t).toBe('page_view');
    expect(ev.p).toBe('/urun/1');
    expect(ev.r).toBe('chatgpt.com');
    expect(ev.sv).toBe('1.0.0');
    expect(ev.u).toEqual({ utm_source: 'chatgpt', utm_medium: 'chat' });
    expect(String(ev.sid)).toHaveLength(32);
  });

  it('gövdede query, hash, tam referrer URL veya DOM metni bulunmaz', async () => {
    const env = makeEnv();
    load();
    const el = makeElement({ 'data-iai-event': 'demo_request', 'data-iai-entity-id': 'plan-pro' });
    env.fire('doc', 'click', { target: el });
    vi.advanceTimersByTime(1000);

    const list = await payloads(env.beacons);
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) {
      expect(p.raw).not.toContain(SECRET_QUERY);
      expect(p.raw).not.toContain(SECRET_HASH);
      expect(p.raw).not.toContain(SECRET_REF_PATH);
      expect(p.raw).not.toContain(SECRET_DOM_TEXT);
      expect(p.raw).not.toContain('?');
      expect(p.raw).not.toContain('#');
    }
  });

  it('track() yalnızca izin verilen alanları geçirir', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);
    env.beacons.length = 0;
    env.api()?.track('demo_request', {
      entityType: 'plan',
      entityId: 'pro',
      entityLabel: 'Pro paket',
      value: 12.5,
      currency: 'try',
      email: 'kullanici@ornek.com',
      password: 'HAYIR',
      nested: { a: 1 },
    });
    vi.advanceTimersByTime(1000);

    const list = await payloads(env.beacons);
    const ev = allEvents(list)[0] as WireEvent;
    expect(ev.t).toBe('demo_request');
    expect(ev.et).toBe('plan');
    expect(ev.ei).toBe('pro');
    expect(ev.el).toBe('Pro paket');
    expect(ev.v).toBe(12.5);
    expect(ev.c).toBe('TRY');
    expect(Object.keys(ev).sort()).toEqual(['c', 'ei', 'el', 'et', 'id', 'p', 'r', 'sid', 'sv', 't', 'ts', 'u', 'v']);
    expect(list[0]?.raw).not.toContain('kullanici@ornek.com');
    expect(list[0]?.raw).not.toContain('HAYIR');
  });

  it('bilinmeyen olay adı custom + n olarak gider', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);
    env.beacons.length = 0;
    env.api()?.track('Yeni Kayıt Akışı');
    vi.advanceTimersByTime(1000);
    const ev = allEvents(await payloads(env.beacons))[0] as WireEvent;
    expect(ev.t).toBe('custom');
    // Türkçe harfler korunur, boşluk `_` olur, büyük harf küçültülür.
    expect(ev.n).toBe('yeni_kayıt_akışı');
  });

  it('data-iai-event tıklaması custom olay + n üretir, DOM metnini göndermez', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);
    env.beacons.length = 0;
    const el = makeElement({
      'data-iai-event': 'demo_request',
      'data-iai-entity-type': 'plan',
      'data-iai-entity-id': 'pro',
      'data-iai-entity-label': 'Pro',
    });
    env.fire('doc', 'click', { target: el });
    vi.advanceTimersByTime(1000);

    const ev = allEvents(await payloads(env.beacons))[0] as WireEvent;
    expect(ev.t).toBe('custom');
    expect(ev.n).toBe('demo_request');
    expect(ev.et).toBe('plan');
    expect(ev.ei).toBe('pro');
    expect(ev.el).toBe('Pro');
  });

  it('SPA pushState ikinci page_view üretir, aynı yol 500 ms içinde tekrarlanmaz', async () => {
    const env = makeEnv();
    load();
    // Aynı yol için 500 ms içinde ikinci page_view üretilmez.
    (env.history.pushState as () => void)();
    vi.advanceTimersByTime(10);
    vi.advanceTimersByTime(1000);
    expect(allEvents(await payloads(env.beacons))).toHaveLength(1);

    // Yeni yol → ikinci page_view
    env.beacons.length = 0;
    env.location.pathname = '/fiyatlandirma';
    (env.history.pushState as () => void)();
    vi.advanceTimersByTime(1000);

    const evs = allEvents(await payloads(env.beacons));
    expect(evs).toHaveLength(1);
    expect(evs[0]?.t).toBe('page_view');
    expect(evs[0]?.p).toBe('/fiyatlandirma');
  });

  it('sayfa gizlenince kuyruk /batch ucuna boşaltılır', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);
    env.beacons.length = 0;

    env.api()?.track('sign_up');
    env.api()?.track('subscribe');
    env.doc.visibilityState = 'hidden';
    env.fire('doc', 'visibilitychange');

    const list = await payloads(env.beacons);
    expect(list).toHaveLength(1);
    expect(list[0]?.url).toBe('https://sensor.example/api/collect/v1/batch');
    expect(list[0]?.body.e).toHaveLength(2);
  });

  it('kuyruk 20 olayla sınırlı, taşarsa en eski düşer', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);
    env.beacons.length = 0;

    for (let i = 0; i < 25; i += 1) env.api()?.track('custom', { entityId: `e${i}` });
    env.fire('win', 'pagehide');

    const list = await payloads(env.beacons);
    const evs = allEvents(list);
    expect(evs).toHaveLength(20);
    expect(evs[0]?.ei).toBe('e5');
    expect(evs[19]?.ei).toBe('e24');
  });

  it('sendBeacon başarısız olursa keepalive fetch ile gönderir', async () => {
    const env = makeEnv();
    env.setBeaconOk(false);
    load();
    vi.advanceTimersByTime(1000);

    expect(env.beacons).toHaveLength(0);
    expect(env.fetches).toHaveLength(1);
    const init = env.fetches[0]?.init ?? {};
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBe(true);
    expect(init.mode).toBe('cors');
    expect(init.credentials).toBe('omit');
    expect(init.headers).toEqual({ 'Content-Type': 'text/plain' });
  });

  it('oturum anahtarı sessionStorage içinde 12 saat TTL ile tutulur, çerez yazılmaz', async () => {
    const env = makeEnv();
    load();
    vi.advanceTimersByTime(1000);
    const raw = env.store.get('iai.s');
    expect(raw).toBeTruthy();
    const [id, exp] = String(raw).split('.');
    expect(id).toHaveLength(32);
    expect(Number(exp) - Date.now()).toBeLessThanOrEqual(12 * 3_600_000);
    expect(Number(exp) - Date.now()).toBeGreaterThan(11 * 3_600_000);
    expect(env.store.size).toBe(1);
  });

  it('data-respect-dnt="1" + DNT sinyali ölçümü tamamen kapatır', async () => {
    const env = makeEnv({ respectDnt: true, dnt: '1' });
    load();
    vi.advanceTimersByTime(2000);
    expect(env.beacons).toHaveLength(0);
    expect(env.fetches).toHaveLength(0);
    expect(env.api()).toBeUndefined();
  });

  it('data-respect-dnt yokken GPC sinyali temel ölçümü durdurmaz', async () => {
    const env = makeEnv({ gpc: true });
    load();
    vi.advanceTimersByTime(1000);
    expect(env.beacons).toHaveLength(1);
  });

  it('script yüklenmeden önceki q kuyruğunu boşaltır', async () => {
    const env = makeEnv();
    (env.win as Record<string, unknown>).independentAI = {
      q: [
        ['track', 'sign_up'],
        ['booking', { entityId: 'r1' }],
      ],
    };
    load();
    vi.advanceTimersByTime(1000);

    const evs = allEvents(await payloads(env.beacons));
    const types = evs.map((e) => e.t);
    expect(types).toContain('sign_up');
    expect(types).toContain('booking');
    expect(types).toContain('page_view');
  });
});
