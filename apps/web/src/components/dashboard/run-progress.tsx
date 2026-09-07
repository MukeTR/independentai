'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useRealtimeEvent, useRealtimeStatus } from '@/components/realtime-provider';

type RunRow = { status: string; leaseExpiresAt: string | null };

const POLL_LIVE_MS = 10_000; // canlı bağlantı varken emniyet yoklaması
const POLL_FALLBACK_MS = 3_000; // canlı bağlantı yokken
const MAX_TOTAL_MS = 180_000;

/**
 * Devam eden ölçüm göstergesi.
 *  - Realtime: `run.completed` (entityId = promptId) gelir gelmez hafif JSON ucunu (GET /api/prompts/:id)
 *    yoklar; tüm run'lar bitmişse `router.refresh()`.
 *  - Polling fallback her zaman açık: canlı bağlantı varsa 10 sn, yoksa 3 sn. Toplam ~3 dk.
 *  - Tazeleme 8 sn içinde yansımazsa tam yenileme (router cache'e bağımlılığı kaldırır).
 */
export function RunProgress({ promptId, inProgress, count }: { promptId: string; inProgress: boolean; count: number }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const refreshedAt = useRef<number | null>(null);
  const checkRef = useRef<() => Promise<void>>(async () => undefined);
  const { status } = useRealtimeStatus();
  const live = status === 'live';

  useEffect(() => {
    if (!inProgress) return;
    let cancelled = false;
    let inFlight = false;
    const startedAt = Date.now();

    const check = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res = await fetch(`/api/prompts/${promptId}`, { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) return;
        const data = (await res.json()) as { runs?: RunRow[] };
        const now = Date.now();
        const pending = (data.runs ?? []).filter(
          (r) =>
            (r.status === 'PENDING' || r.status === 'RUNNING') &&
            (!r.leaseExpiresAt || new Date(r.leaseExpiresAt).getTime() > now),
        );
        if (pending.length === 0 && !cancelled) {
          setDone(true);
          if (!refreshedAt.current) {
            refreshedAt.current = Date.now();
            router.refresh();
          }
        }
      } catch {
        /* geçici ağ hatası — sonraki tik */
      } finally {
        inFlight = false;
      }
    };
    checkRef.current = check;

    const id = setInterval(
      () => {
        if (Date.now() - startedAt > MAX_TOTAL_MS) {
          clearInterval(id);
          return;
        }
        if (refreshedAt.current && Date.now() - refreshedAt.current > 8000) {
          window.location.reload();
          return;
        }
        void check();
      },
      live ? POLL_LIVE_MS : POLL_FALLBACK_MS,
    );

    return () => {
      cancelled = true;
      clearInterval(id);
      checkRef.current = async () => undefined;
    };
  }, [inProgress, promptId, router, live]);

  // Canlı olay: bu prompt'un bir run'ı bitti → beklemeden doğrula.
  useRealtimeEvent('run.completed', (evt) => {
    if (evt.entityId !== promptId) return;
    void checkRef.current();
  });

  if (!inProgress) return null;
  return (
    <span role="status" aria-live="polite" className="chip !text-[11px] inline-flex items-center gap-1.5">
      <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
      {done ? 'Sonuçlar yükleniyor…' : `${count} model ölçülüyor…`}
    </span>
  );
}
