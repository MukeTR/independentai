'use client';

/**
 * Panel geneli Realtime bağlamı — STORE tabanlı (context değil).
 *
 * Neden: sağlayıcı React state tutup context değeri değiştirseydi, hydration sürerken bu değişim henüz
 * hydrate olmamış Suspense sınırlarını (sayfa içeriği) istemci render'ına düşürüyordu (DOM geçici olarak
 * çiftleniyor, useId değerleri değişiyor). Burada sağlayıcı hiç yeniden render olmaz: bağlantı bir
 * effect içinde başlar, durum ve olaylar modül düzeyinde bir store/event bus'a yazılır; tüketiciler
 * `useSyncExternalStore` ve abonelikle kendi başlarına güncellenir.
 *
 *  - Olay geldiğinde `router.refresh()` (en fazla 2 sn'de bir) → server component'ler tazelenir.
 *  - Sayfalar `useRealtimeEvent('integration.sync', cb)` ile hedefli dinler.
 *  - 'polling' modunda 30 sn'de bir refresh; UI "canlı bağlantı yok" rozeti gösterir.
 */
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createRealtimeConnection, type RealtimeEvent, type RealtimeStatus } from '@/lib/realtime-client';

type Handler = (evt: RealtimeEvent, topic: string) => void;
type StoreState = { status: RealtimeStatus; lastEventAt: number | null };

const SERVER_STATE: StoreState = { status: 'idle', lastEventAt: null };

// ── Modül düzeyi store (uygulama başına tek Realtime bağlantısı) ──
let state: StoreState = SERVER_STATE;
const stateListeners = new Set<() => void>();
function setState(patch: Partial<StoreState>) {
  const next = { ...state, ...patch };
  if (next.status === state.status && next.lastEventAt === state.lastEventAt) return;
  state = next;
  for (const l of stateListeners) l();
}
function subscribeState(l: () => void) {
  stateListeners.add(l);
  return () => {
    stateListeners.delete(l);
  };
}
function getState() {
  return state;
}

// ── Olay bus'ı ──
const handlers = new Map<string, Set<Handler>>();
function subscribeEvent(event: string, h: Handler) {
  const set = handlers.get(event) ?? new Set<Handler>();
  set.add(h);
  handlers.set(event, set);
  return () => {
    set.delete(h);
  };
}
function emit(topic: string, evt: RealtimeEvent) {
  for (const h of handlers.get(evt.event) ?? []) h(evt, topic);
  for (const h of handlers.get('*') ?? []) h(evt, topic);
}

export function RealtimeProvider({
  topics,
  children,
  autoRefresh = true,
}: {
  topics: string[];
  children: ReactNode;
  autoRefresh?: boolean;
}) {
  const router = useRouter();
  const topicsKey = topics.slice().sort().join('|');

  useEffect(() => {
    if (!topicsKey) {
      setState({ status: 'disabled' });
      return;
    }
    let lastRefresh = 0;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (!autoRefresh) return;
      const since = Date.now() - lastRefresh;
      if (since >= 2000) {
        lastRefresh = Date.now();
        router.refresh();
        return;
      }
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        lastRefresh = Date.now();
        router.refresh();
      }, 2000 - since);
    };
    const conn = createRealtimeConnection({
      topics: topicsKey.split('|'),
      onStatus: (status) => setState({ status }),
      onEvent: (topic, evt) => {
        setState({ lastEventAt: Date.now() });
        emit(topic, evt);
        // İlerleme olayları sık gelir; yalnızca durum değişimlerinde sayfayı tazele
        if (evt.status !== 'running') scheduleRefresh();
      },
      onPoll: autoRefresh ? () => router.refresh() : undefined,
    });
    return () => {
      conn.stop();
      if (refreshTimer) clearTimeout(refreshTimer);
      setState({ status: 'idle' });
    };
  }, [topicsKey, autoRefresh, router]);

  return <>{children}</>;
}

export function useRealtimeStatus(): { status: RealtimeStatus; lastEventAt: number | null } {
  return useSyncExternalStore(subscribeState, getState, () => SERVER_STATE);
}

/** Belirli bir olayı (veya '*') dinle; handler kimliği değişse de abonelik korunur. */
export function useRealtimeEvent(event: string, handler: Handler): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribeEvent(event, (evt, topic) => ref.current(evt, topic)), [event]);
}

/** Küçük durum rozeti (a11y: role=status). */
export function RealtimeBadge({ className = '' }: { className?: string }) {
  const { status } = useRealtimeStatus();
  if (status === 'disabled' || status === 'idle') return null;
  const map: Record<RealtimeStatus, { label: string; dot: string; title: string }> = {
    live: { label: 'Canlı', dot: 'bg-emerald-500', title: 'Gerçek zamanlı bağlantı açık' },
    connecting: { label: 'Bağlanıyor', dot: 'bg-amber-400 animate-pulse', title: 'Gerçek zamanlı bağlantı kuruluyor' },
    polling: { label: '30 sn', dot: 'bg-ink-faint', title: 'Canlı bağlantı yok; 30 saniyede bir yenileniyor' },
    idle: { label: '', dot: '', title: '' },
    disabled: { label: '', dot: '', title: '' },
  };
  const m = map[status];
  return (
    <span
      role="status"
      title={m.title}
      className={`inline-flex items-center gap-1.5 text-[11px] text-ink-muted ${className}`}
    >
      <span aria-hidden className={`inline-block w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
