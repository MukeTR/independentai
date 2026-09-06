'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

type RunRow = { status: string; leaseExpiresAt: string | null };

/**
 * Devam eden ölçüm göstergesi.
 * Sunucu `inProgress` derken hafif JSON ucunu (GET /api/prompts/:id) 3 sn'de bir yoklar; tüm run'lar
 * bitince `router.refresh()` ile sayfayı tazeler. Tazeleme 8 sn içinde yansımazsa tam yenileme yapar
 * (router cache'e bağımlılığı kaldırır). Toplam süre ~3 dk ile sınırlıdır.
 */
export function RunProgress({ promptId, inProgress, count }: { promptId: string; inProgress: boolean; count: number }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const refreshedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!inProgress) return;
    let cancelled = false;
    let ticks = 0;
    const id = setInterval(async () => {
      ticks += 1;
      if (ticks > 60) {
        clearInterval(id);
        return;
      }
      if (refreshedAt.current && Date.now() - refreshedAt.current > 8000) {
        window.location.reload();
        return;
      }
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
      }
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [inProgress, promptId, router]);

  if (!inProgress) return null;
  return (
    <span role="status" aria-live="polite" className="chip !text-[11px] inline-flex items-center gap-1.5">
      <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
      {done ? 'Sonuçlar yükleniyor…' : `${count} model ölçülüyor…`}
    </span>
  );
}
