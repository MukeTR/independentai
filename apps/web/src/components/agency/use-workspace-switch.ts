'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';

/**
 * Çalışma alanı değişimi: POST /api/agency/workspace → `iai_ws` çerezi → hedef sayfa + refresh.
 * tenantId null → portföye dönüş (çerez silinir).
 */
export function useWorkspaceSwitch() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchTo = useCallback(
    async (tenantId: string | null, dest?: string): Promise<boolean> => {
      if (busy) return false;
      setBusy(true);
      setError(null);
      try {
        await apiFetch('/api/agency/workspace', { method: 'POST', json: { tenantId } });
        router.push(dest ?? (tenantId ? '/dashboard' : '/agency'));
        router.refresh();
        return true;
      } catch (err) {
        setError(errorMessage(err));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [busy, router],
  );

  return { switchTo, busy, error, clearError: () => setError(null) };
}
