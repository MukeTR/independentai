'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/**
 * `router.refresh()` + yakınsama koruması.
 * Bir mutasyondan sonra sunucu bileşeni tazelenmeli; `watch` (ör. liste uzunluğu) 3 sn içinde
 * değişmezse tam sayfa yenilemesine düşer. Böylece Next router cache'inin nadir yarış
 * durumlarında kullanıcı eski listeye bakıp kalmaz.
 */
export function useRefreshGuard(watch: unknown, timeoutMs = 3000): () => void {
  const router = useRouter();
  const pending = useRef<{ value: unknown; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    if (pending.current && pending.current.value !== watch) {
      clearTimeout(pending.current.timer);
      pending.current = null;
    }
  }, [watch]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current.timer);
    },
    [],
  );

  return useCallback(() => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = {
      value: watch,
      timer: setTimeout(() => {
        pending.current = null;
        window.location.reload();
      }, timeoutMs),
    };
    router.refresh();
  }, [router, watch, timeoutMs]);
}
