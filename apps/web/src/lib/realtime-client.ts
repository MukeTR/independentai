'use client';

/**
 * Supabase Realtime istemci köprüsü (private Broadcast + Presence).
 *
 *  - Token: GET /api/realtime/token (10 dk); süresi dolmadan ~60 sn önce yenilenir, `setAuth` ile
 *    bağlantıya uygulanır. Sunucu { enabled:false } derse bağlantı 'polling' moduna geçer.
 *  - Kanal: `channel(topic, { config: { private: true } })` — RLS (realtime.messages) doğrular.
 *  - Yeniden bağlanma: CHANNEL_ERROR/TIMED_OUT/CLOSED → üstel geri çekilme (1s…30s, jitter);
 *    5 ardışık başarısızlıkta 'polling' fallback (UI: "canlı bağlantı yok, 30 sn'de bir yenileniyor").
 *  - Dedupe: payload.eventId son 500 olay için hatırlanır; tekrar teslim yok sayılır.
 *  - Görünürlük: sekme gizlenince bağlantı korunur; görünür olunca token tazeliği kontrol edilir.
 *  - Payload minimum ve güvenlidir (sunucu sanitize eder); istemci hiçbir zaman broadcast GÖNDERMEZ.
 *
 * Çekirdek `createRealtimeConnection` React'ten bağımsızdır (durumu callback ile bildirir); böylece
 * panel sağlayıcısı React state tutmadan çalışır ve hydration sürerken ağacı yeniden render etmez.
 */
import { startTransition, useEffect, useRef, useState } from 'react';
import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';

export type RealtimeStatus = 'idle' | 'connecting' | 'live' | 'polling' | 'disabled';

export type RealtimeEvent = {
  event: string;
  entityId?: string;
  status?: string;
  progress?: number;
  summary?: string;
  jobId?: string;
  ts: string;
  eventId: string;
  [k: string]: unknown;
};

type TokenResponse =
  | { enabled: false; reason?: string }
  | {
      enabled: true;
      token: string;
      expiresAt: number;
      ttlSec: number;
      url: string;
      anonKey: string;
      topics: string[];
      tenantId: string;
    };

const REFRESH_MARGIN_MS = 60_000;
const MAX_BACKOFF_MS = 30_000;
const FAIL_THRESHOLD = 5;
const DEDUPE_SIZE = 500;

let sharedClient: SupabaseClient | null = null;
let sharedUrl = '';

function clientFor(url: string, anonKey: string): SupabaseClient {
  if (sharedClient && sharedUrl === url) return sharedClient;
  sharedClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  sharedUrl = url;
  return sharedClient;
}

async function fetchToken(): Promise<TokenResponse | null> {
  try {
    const res = await fetch('/api/realtime/token', { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    return (await res.json()) as TokenResponse;
  } catch {
    return null;
  }
}

export type RealtimeConnectionOptions = {
  /** Dinlenecek topic'ler; boşsa bağlantı kurulmaz ('idle'). Sunucu izin vermiyorsa kanal açılmaz. */
  topics: string[];
  onEvent?: (topic: string, evt: RealtimeEvent) => void;
  onStatus?: (status: RealtimeStatus) => void;
  /** Polling modunda periyodik çağrılır (varsayılan 30 sn) */
  onPoll?: () => void;
  pollIntervalMs?: number;
};

export type RealtimeConnection = { stop: () => void; getStatus: () => RealtimeStatus };

/**
 * React'ten bağımsız bağlantı denetleyicisi. `stop()` tüm zamanlayıcıları ve kanalları kapatır.
 */
export function createRealtimeConnection(opts: RealtimeConnectionOptions): RealtimeConnection {
  const { topics, onEvent, onStatus, onPoll, pollIntervalMs = 30_000 } = opts;
  const topicsKey = topics.slice().sort().join('|');
  let status: RealtimeStatus = 'idle';
  let disposed = false;
  let client: SupabaseClient | null = null;
  let channels: RealtimeChannel[] = [];
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let failures = 0;
  let expiresAt = 0;
  const seen = new Set<string>();
  const seenOrder: string[] = [];

  const setStatus = (next: RealtimeStatus) => {
    if (disposed || status === next) return;
    status = next;
    if (next === 'polling' && onPoll && !pollTimer) pollTimer = setInterval(() => onPoll(), pollIntervalMs);
    if (next !== 'polling' && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    onStatus?.(next);
  };

  const remember = (id: string): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    seenOrder.push(id);
    if (seenOrder.length > DEDUPE_SIZE) {
      const old = seenOrder.shift();
      if (old) seen.delete(old);
    }
    return true;
  };

  const teardownChannels = () => {
    for (const ch of channels) {
      try {
        client?.removeChannel(ch);
      } catch {
        /* yoksay */
      }
    }
    channels = [];
  };

  const scheduleReconnect = () => {
    if (disposed) return;
    failures += 1;
    if (failures >= FAIL_THRESHOLD) {
      setStatus('polling');
      return;
    }
    const base = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** failures);
    reconnectTimer = setTimeout(() => void connect(), base + Math.floor(Math.random() * 500));
  };

  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    const wait = Math.max(5_000, expiresAt - Date.now() - REFRESH_MARGIN_MS);
    refreshTimer = setTimeout(async () => {
      if (disposed) return;
      const t = await fetchToken();
      if (!t || !t.enabled) {
        scheduleReconnect();
        return;
      }
      expiresAt = t.expiresAt;
      await client?.realtime.setAuth(t.token);
      scheduleRefresh();
    }, wait);
  };

  const connect = async () => {
    if (disposed) return;
    if (status !== 'polling') setStatus('connecting');
    const t = await fetchToken();
    if (disposed) return;
    if (!t) {
      scheduleReconnect();
      return;
    }
    if (!t.enabled) {
      setStatus('polling');
      return;
    }
    const allowed = new Set(t.topics);
    const wanted = topicsKey.split('|').filter((x) => allowed.has(x));
    if (!wanted.length) {
      setStatus('polling');
      return;
    }
    client = clientFor(t.url, t.anonKey);
    expiresAt = t.expiresAt;
    await client.realtime.setAuth(t.token);
    teardownChannels();
    let subscribed = 0;
    for (const topic of wanted) {
      const ch = client.channel(topic, { config: { private: true } });
      ch.on('broadcast', { event: '*' }, (msg: { event: string; payload: RealtimeEvent }) => {
        const p = msg.payload;
        if (!p || typeof p !== 'object') return;
        const id = typeof p.eventId === 'string' ? p.eventId : `${msg.event}:${p.ts ?? ''}:${p.entityId ?? ''}`;
        if (!remember(id)) return;
        onEvent?.(topic, { ...p, event: p.event ?? msg.event });
      });
      ch.subscribe((state) => {
        if (disposed) return;
        if (state === 'SUBSCRIBED') {
          subscribed += 1;
          failures = 0;
          setStatus('live');
        } else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT') {
          subscribed = Math.max(0, subscribed - 1);
          teardownChannels();
          scheduleReconnect();
        } else if (state === 'CLOSED') {
          subscribed = Math.max(0, subscribed - 1);
          if (subscribed === 0) scheduleReconnect();
        }
      });
      channels.push(ch);
    }
    scheduleRefresh();
  };

  const onVisible = () => {
    if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
    if (expiresAt && Date.now() > expiresAt - REFRESH_MARGIN_MS) {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void connect(), 0);
    }
  };

  if (!topicsKey) {
    setStatus('idle');
  } else {
    document.addEventListener('visibilitychange', onVisible);
    void connect();
  }

  return {
    getStatus: () => status,
    stop: () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      if (refreshTimer) clearTimeout(refreshTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearInterval(pollTimer);
      teardownChannels();
    },
  };
}

export type UseRealtimeOptions = RealtimeConnectionOptions & {
  /** Kapalıysa hiçbir bağlantı kurulmaz (SSR, ayar) */
  enabled?: boolean;
};

/**
 * Bağımsız kullanım için React hook'u (durum state'te; güncellemeler transition içinde).
 * Panel genelinde `components/realtime-provider.tsx` tercih edilir (store tabanlı, hydration-güvenli).
 */
export function useRealtime(opts: UseRealtimeOptions) {
  const { topics, onEvent, enabled = true, onPoll, pollIntervalMs = 30_000 } = opts;
  const [status, setStatus] = useState<RealtimeStatus>('idle');
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const onEventRef = useRef(onEvent);
  const onPollRef = useRef(onPoll);
  onEventRef.current = onEvent;
  onPollRef.current = onPoll;
  const topicsKey = topics.slice().sort().join('|');

  useEffect(() => {
    if (!enabled) {
      startTransition(() => setStatus('disabled'));
      return;
    }
    const conn = createRealtimeConnection({
      topics: topicsKey ? topicsKey.split('|') : [],
      pollIntervalMs,
      onStatus: (s) => startTransition(() => setStatus(s)),
      onEvent: (topic, evt) => {
        startTransition(() => setLastEventAt(Date.now()));
        onEventRef.current?.(topic, evt);
      },
      onPoll: () => onPollRef.current?.(),
    });
    return () => conn.stop();
  }, [enabled, topicsKey, pollIntervalMs]);

  return { status, isLive: status === 'live', lastEventAt };
}

/**
 * Presence: "kim çevrimiçi" — yalnızca kısa meta (ad/rol/sayfa). E-posta paylaşılmaz.
 * Presence yazımı RLS'de yalnızca üyeler için açıktır (kanal: `<topic>:presence`).
 */
export function usePresence(
  topic: string | null,
  meta: { name: string; role: string; page?: string } | null,
  enabled = true,
) {
  const [members, setMembers] = useState<
    { key: string; name: string; role: string; page?: string; onlineAt: string }[]
  >([]);
  const metaKey = meta ? `${meta.name}|${meta.role}|${meta.page ?? ''}` : '';
  const stableMeta = useRef(meta);
  stableMeta.current = meta;

  useEffect(() => {
    if (!enabled || !topic || !metaKey) return;
    let disposed = false;
    let ch: RealtimeChannel | null = null;
    let client: SupabaseClient | null = null;
    (async () => {
      const t = await fetchToken();
      if (disposed || !t || !t.enabled || !t.topics.includes(topic)) return;
      client = clientFor(t.url, t.anonKey);
      await client.realtime.setAuth(t.token);
      ch = client.channel(`${topic}:presence`, {
        config: {
          private: true,
          presence: { key: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` },
        },
      });
      ch.on('presence', { event: 'sync' }, () => {
        if (!ch) return;
        const state = ch.presenceState<{ name: string; role: string; page?: string; onlineAt: string }>();
        const list: { key: string; name: string; role: string; page?: string; onlineAt: string }[] = [];
        for (const [key, presences] of Object.entries(state)) {
          const p = presences[0];
          if (p) list.push({ key, name: p.name, role: p.role, page: p.page, onlineAt: p.onlineAt });
        }
        startTransition(() => setMembers(list));
      });
      ch.subscribe(async (state) => {
        if (state === 'SUBSCRIBED' && ch && stableMeta.current) {
          await ch.track({ ...stableMeta.current, onlineAt: new Date().toISOString() });
        }
      });
    })();
    return () => {
      disposed = true;
      if (ch && client) client.removeChannel(ch);
    };
  }, [topic, metaKey, enabled]);

  return members;
}
