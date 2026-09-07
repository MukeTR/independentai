/**
 * Independent AI — Universal AI Discovery Sensor (tarayıcı SDK'sı)
 *
 * Tek bir `<script>` etiketiyle her siteye kurulur; `/sensor/v1.js` adresinden servis edilir.
 *
 * Tasarım ilkeleri:
 *  - **Fail-open**: tüm gövde try/catch içindedir. Sensör hata alırsa müşterinin sitesi etkilenmez;
 *    hiçbir istisna dışarı sızmaz, hiçbir hata müşterinin konsolunu kirletmez.
 *  - **Çerezsiz**: çerez yazılmaz/okunmaz. Anonim oturum anahtarı yalnızca `sessionStorage`'da
 *    (erişilemiyorsa yalnızca bellekte) tutulur ve 12 saat sonra düşer. Kalıcı kullanıcı profili yok.
 *  - **Parmak izi yok**: canvas/audio/WebGL/ekran/font ölçümü yok, `localStorage` yok, cihaz kimliği yok.
 *  - **PII yok**: DOM/form metni, tıklanan elemanın yazısı, query string, hash ve tam referrer URL'i
 *    ASLA gönderilmez. Referrer'dan yalnızca hostname, adresten yalnızca pathname çıkarılır.
 *  - **Session replay yok**: klavye/fare/scroll kaydı alınmaz.
 *  - **Global kirlilik yok**: yalnızca `window.independentAI` tanımlanır. (SPA ölçümü için
 *    `history.pushState`/`replaceState` sarmalanır — orijinal davranış korunarak çağrılır.)
 *
 * Ölçüm sözleşmesi `src/server/discovery/events.ts` ile aynıdır:
 *   { id, sid, t, p?, r?, ts?, et?, ei?, el?, n?, v?, c?, sv?, u? }
 */

/** Sürüm — her yayında artır; olayla birlikte `sv` alanında gönderilir. */
const SDK_VERSION = '1.0.0';

/** `track()` ile kabul edilen tek alan kümesi. Bunun dışındaki her şey sessizce atılır. */
type SafeProps = {
  entityType?: unknown;
  entityId?: unknown;
  entityLabel?: unknown;
  value?: unknown;
  currency?: unknown;
};

/** Collector'a giden telin biçimi (kısa alan adları = küçük gövde). */
type WireEvent = {
  id: string;
  sid: string;
  t: string;
  p?: string;
  r?: string;
  ts?: number;
  et?: string;
  ei?: string;
  el?: string;
  n?: string;
  v?: number;
  c?: string;
  sv?: string;
  u?: Record<string, string>;
};

type ReportInput = { provider?: unknown; intent?: unknown; text?: unknown };

type SensorApi = {
  track: (name: unknown, props?: SafeProps) => void;
  /** Ziyaretçinin gönüllü bildirimi (hangi AI, ne sordu). Opsiyoneldir; site sahibi çağırır. */
  report: (input?: ReportInput) => void;
  /** Bu sekmedeki anonim oturum anahtarı (çerezsiz, 12 saat). Kişi kimliği DEĞİLDİR. */
  sessionId: () => string;
  version: string;
  q: unknown[];
};

const SESSION_TTL_MS = 12 * 3_600_000;
const MAX_QUEUE = 20;
const MAX_RETRY = 2;
const FLUSH_DELAY_MS = 800;
const PAGE_VIEW_DEDUPE_MS = 500;
const STORE_KEY = 'iai.s';
const COLLECT_PATH = '/api/collect/v1/';
/** Sunucunun tanıdığı olay tipleri; listede olmayan ad `custom` + `n` olarak gider. */
const KNOWN_TYPES =
  ' page_view content_view cta_click form_start form_submit sign_up demo_request phone_click booking' +
  ' application subscribe product_view add_to_cart purchase custom ';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'];

function boot(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const W = window;
  const D = document;
  const NAV = W.navigator;
  const LOC = W.location;

  // ───────────── Kurulum: script etiketinden yapılandırma ─────────────

  const script = ((D.currentScript as HTMLScriptElement | null) ??
    D.querySelector('script[data-site]')) as HTMLScriptElement | null;
  if (!script) return;

  const key = attr(script, 'data-site');
  // Anahtar yoksa sensör hiç açılmaz (hata da vermez).
  if (!key) return;

  let base = attr(script, 'data-endpoint');
  if (!base) {
    try {
      base = new URL(script.src || '', LOC.href).origin;
    } catch {
      base = '';
    }
  }
  base = base.replace(/\/+$/, '');
  if (!base) return;

  // DNT / GPC: varsayılan olarak temel (çerezsiz, PII'siz) ölçüm sürer.
  // `data-respect-dnt="1"` verilirse sinyal varken ölçüm TAMAMEN kapanır.
  const priv = NAV as Navigator & { globalPrivacyControl?: boolean };
  const optedOut = priv.doNotTrack === '1' || priv.globalPrivacyControl === true;
  if (attr(script, 'data-respect-dnt') === '1' && optedOut) return;

  const referrer = referrerHost();
  const utm = readUtm();

  // ───────────── Durum ─────────────

  const queue: WireEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let memSid = '';
  let memExp = 0;
  let lastPath = '';
  let lastAt = 0;

  // ───────────── Yardımcılar ─────────────

  function attr(el: Element, name: string): string {
    try {
      const v = el.getAttribute(name);
      return v ? v.trim() : '';
    } catch {
      return '';
    }
  }

  /** `n` bayttan onaltılık kimlik. `crypto` yoksa Math.random'a düşer (yalnızca dedupe içindir). */
  function rand(bytes: number): string {
    let out = '';
    try {
      const c = W.crypto;
      if (c && typeof c.getRandomValues === 'function') {
        const a = new Uint8Array(bytes);
        c.getRandomValues(a);
        for (let i = 0; i < a.length; i += 1) out += (a[i]! + 256).toString(16).slice(1);
      }
    } catch {
      out = '';
    }
    while (out.length < bytes * 2) out += Math.floor(Math.random() * 16).toString(16);
    return out.slice(0, bytes * 2);
  }

  /** Anonim oturum anahtarı: sessionStorage (yoksa bellek), 12 saatlik TTL, çerez YOK. */
  function sessionId(): string {
    const now = Date.now();
    try {
      const raw = W.sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const i = raw.indexOf('.');
        const id = i > 0 ? raw.slice(0, i) : '';
        if (id.length >= 8 && Number(raw.slice(i + 1)) > now) return id;
      }
    } catch {
      // sessionStorage kapalı (özel mod / 3P kısıtı): bellekteki anahtarla devam.
    }
    if (memSid && memExp > now) return memSid;
    memSid = rand(16);
    memExp = now + SESSION_TTL_MS;
    try {
      W.sessionStorage.setItem(STORE_KEY, memSid + '.' + memExp);
    } catch {
      // yazılamıyorsa yalnızca bellekte kalır
    }
    return memSid;
  }

  /** Yalnızca referrer'ın HOSTNAME'i. Tam URL, yol, query ve hash asla gönderilmez. */
  function referrerHost(): string {
    try {
      const r = D.referrer;
      return r ? new URL(r).hostname : '';
    } catch {
      return '';
    }
  }

  /** Query string'ten YALNIZCA allowlist UTM alanları, temizlenmiş hâlde. */
  function readUtm(): Record<string, string> | undefined {
    let out: Record<string, string> | undefined;
    try {
      const q = new URLSearchParams(LOC.search);
      for (let i = 0; i < UTM_KEYS.length; i += 1) {
        const k = UTM_KEYS[i]!;
        const v = q.get(k);
        // ASCII dışı harfler (ör. Türkçe) korunur; kontrol karakterleri ve ayraçlar düşer.
        const clean = v
          ? v
              .replace(/[^\w .:_\u0080-\uffff-]/g, '')
              .trim()
              .slice(0, 120)
          : '';
        if (clean) {
          if (!out) out = {};
          out[k] = clean;
        }
      }
    } catch {
      return undefined;
    }
    return out;
  }

  /** Serbest metni güvenli kısa değere indirger (PII riskli karakterler ve uzunluk kırpılır). */
  function text(v: unknown, max: number): string {
    if (typeof v !== 'string') return '';
    return v.replace(/\s+/g, ' ').trim().slice(0, max);
  }

  /** Olay adını normalize eder: `Demo Request` → `demo_request`. */
  function token(v: unknown): string {
    if (typeof v !== 'string') return '';
    return (
      v
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
        // ASCII dışı harfler korunur (sunucudaki `safeToken` ile aynı davranış).
        .replace(/[^\w.:\u0080-\uffff]/g, '')
        .slice(0, 60)
    );
  }

  // ───────────── Gönderim ─────────────

  function post(url: string, body: string): Promise<boolean> {
    // `text/plain` → basit istek (preflight yok). credentials: 'omit' → çerez gönderilmez.
    return W.fetch(url, {
      method: 'POST',
      keepalive: true,
      mode: 'cors',
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain' },
      body,
    }).then((r) => r.ok || (r.status >= 400 && r.status < 500 && r.status !== 429));
  }

  /**
   * Bir partiyi gönderir. Sıra: `sendBeacon` → `fetch(keepalive)`.
   * `final` (sayfa kapanıyor) ise tekrar denenmez ve daima `/batch` kullanılır.
   */
  function send(events: WireEvent[], attempt: number, final: boolean): void {
    if (!events.length) return;
    const url = base + COLLECT_PATH + (final || events.length > 1 ? 'batch' : 'event');
    const body = JSON.stringify({ k: key, e: events });

    try {
      if (typeof NAV.sendBeacon === 'function' && typeof Blob !== 'undefined') {
        if (NAV.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
      }
    } catch {
      // sendBeacon kullanılamıyor → fetch'e düş
    }

    try {
      const done = post(url, body);
      if (final) {
        done.catch(noop);
        return;
      }
      done
        .then((settled) => {
          if (!settled) retry(events, attempt);
        })
        .catch(() => retry(events, attempt));
    } catch {
      // fetch de yoksa olay sessizce düşer
    }
  }

  function retry(events: WireEvent[], attempt: number): void {
    if (attempt >= MAX_RETRY) return;
    try {
      setTimeout(() => send(events, attempt + 1, false), 1000 * Math.pow(2, attempt));
    } catch {
      // zamanlayıcı yoksa vazgeç
    }
  }

  function flush(final: boolean): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!queue.length) return;
    send(queue.splice(0, MAX_QUEUE), 0, final);
  }

  function enqueue(ev: WireEvent): void {
    queue.push(ev);
    // Taşarsa en ESKİ olay atılır (bellek sınırı).
    while (queue.length > MAX_QUEUE) queue.shift();
    if (timer) return;
    try {
      timer = setTimeout(() => flush(false), FLUSH_DELAY_MS);
    } catch {
      flush(false);
    }
  }

  // ───────────── Olay üretimi ─────────────

  function emit(type: string, name: string, props?: SafeProps): void {
    try {
      const ev: WireEvent = {
        id: rand(16),
        sid: sessionId(),
        t: type,
        // Yalnızca pathname: query ve hash hiçbir zaman gönderilmez.
        p: LOC.pathname || '/',
        ts: Date.now(),
        sv: SDK_VERSION,
      };
      if (referrer) ev.r = referrer;
      if (name) ev.n = name;
      if (utm) ev.u = utm;

      if (props && typeof props === 'object') {
        const et = text(props.entityType, 40);
        const ei = text(props.entityId, 120);
        const el = text(props.entityLabel, 120);
        if (et) ev.et = et;
        if (ei) ev.ei = ei;
        if (el) ev.el = el;
        const v = Number(props.value);
        if (isFinite(v) && v >= 0 && props.value !== null && props.value !== undefined && props.value !== '') ev.v = v;
        const c = typeof props.currency === 'string' ? props.currency.toUpperCase().replace(/[^A-Z]/g, '') : '';
        if (c.length === 3) ev.c = c;
      }
      enqueue(ev);
    } catch {
      // olay üretilemezse sessizce vazgeç
    }
  }

  /** Genel API: bilinen tip adı doğrudan gider, bilinmeyen ad `custom` + `n` olur. */
  function track(name: unknown, props?: SafeProps): void {
    try {
      const k = token(name);
      if (!k) return;
      if (KNOWN_TYPES.indexOf(' ' + k + ' ') >= 0) emit(k, '', props);
      else emit('custom', k, props);
    } catch {
      // yok
    }
  }

  function pageView(): void {
    try {
      const p = LOC.pathname || '/';
      const now = Date.now();
      // Aynı yol için 500 ms içinde tekrar sayfa görüntüleme üretilmez.
      if (p === lastPath && now - lastAt < PAGE_VIEW_DEDUPE_MS) return;
      lastPath = p;
      lastAt = now;
      emit('page_view', '');
    } catch {
      // yok
    }
  }

  function noop(): void {
    /* yut */
  }

  // ───────────── Bağlantılar ─────────────

  /** SPA gezinmesi: pushState/replaceState sarmalanır (orijinal davranış korunur), popstate dinlenir. */
  function wrapHistory(name: 'pushState' | 'replaceState'): void {
    try {
      const h = W.history as unknown as Record<string, unknown>;
      const orig = h[name];
      if (typeof orig !== 'function') return;
      const fn = orig as (...a: unknown[]) => unknown;
      h[name] = function (this: unknown, ...args: unknown[]): unknown {
        const out = fn.apply(this, args);
        try {
          setTimeout(pageView, 0);
        } catch {
          pageView();
        }
        return out;
      };
    } catch {
      // history dokunulamıyorsa SPA ölçümü popstate ile sınırlı kalır
    }
  }

  try {
    wrapHistory('pushState');
    wrapHistory('replaceState');
    // hashchange KASITLI olarak dinlenmez: aynı sayfada sahte gezinme üretir.
    W.addEventListener('popstate', pageView);
    W.addEventListener('pagehide', () => flush(true));
    D.addEventListener('visibilitychange', () => {
      if (D.visibilityState === 'hidden') flush(true);
    });
  } catch {
    // dinleyici eklenemedi
  }

  // Kodsuz olay: `data-iai-event="…"` işaretli elemana tıklama.
  // Elemanın metni veya DOM'u ASLA gönderilmez; yalnızca öznitelik değerleri okunur.
  try {
    D.addEventListener(
      'click',
      (e: Event) => {
        try {
          const t = e.target as Element | null;
          if (!t || typeof t.closest !== 'function') return;
          const el = t.closest('[data-iai-event]');
          if (!el) return;
          const name = token(attr(el, 'data-iai-event'));
          if (!name) return;
          emit('custom', name, {
            entityType: attr(el, 'data-iai-entity-type'),
            entityId: attr(el, 'data-iai-entity-id'),
            entityLabel: attr(el, 'data-iai-entity-label'),
          });
        } catch {
          // tıklama ölçülemedi
        }
      },
      true,
    );
  } catch {
    // yok
  }

  // ───────────── Ziyaretçi bildirimi (opsiyonel) ─────────────

  /**
   * `POST /api/collect/v1/report` — ziyaretçinin gönüllü olarak bildirdiği AI kaynağı/soru.
   * `text/plain` gövde (önden yoklama yok). Gövde 2 KB ile sınırlıdır; sunucu ayrıca PII temizler.
   */
  function report(input?: ReportInput): void {
    try {
      if (!input || typeof input !== 'object') return;
      const body: Record<string, unknown> = { k: key, sid: sessionId() };
      const provider = text(input.provider, 40);
      const intent = token(input.intent);
      const note = text(input.text, 300);
      if (provider) body.provider = provider.toLowerCase();
      if (intent) body.intent = intent;
      if (note) body.text = note;
      if (!provider && !intent && !note) return;
      const payload = JSON.stringify(body);
      if (payload.length > 2048) return;
      post(base + COLLECT_PATH + 'report', payload).catch(noop);
    } catch {
      // bildirim başarısız olursa ölçüm etkilenmez
    }
  }

  // ───────────── Genel API + erken çağrı kuyruğu ─────────────

  try {
    const host = W as unknown as { independentAI?: Partial<SensorApi> };
    const prior = host.independentAI;

    const runQueued = (item: unknown): void => {
      if (!item) return;
      // Desteklenen biçimler: ['track', ad, props] · [ad, props] · arguments nesnesi
      const a = Array.isArray(item) ? item : Array.prototype.slice.call(item as ArrayLike<unknown>);
      if (!a.length) return;
      if (a[0] === 'track') track(a[1], a[2] as SafeProps | undefined);
      else if (a[0] === 'report') report(a[1] as ReportInput | undefined);
      else track(a[0], a[1] as SafeProps | undefined);
    };

    const q: unknown[] = [];
    // Script yüklendikten SONRA gelen `q.push(...)` çağrıları da anında işlensin.
    q.push = function (...items: unknown[]): number {
      for (let i = 0; i < items.length; i += 1) runQueued(items[i]);
      return 0;
    };

    host.independentAI = { track, report, sessionId, version: SDK_VERSION, q };

    const pending = prior && Array.isArray(prior.q) ? prior.q.slice(0) : [];
    for (let i = 0; i < pending.length; i += 1) runQueued(pending[i]);
  } catch {
    // API kurulamadı; otomatik ölçüm yine de çalışır
  }

  // İlk sayfa görüntüleme
  pageView();
}

try {
  boot();
} catch {
  // Fail-open: sensör asla müşterinin sitesini bozmaz.
}

export {};
