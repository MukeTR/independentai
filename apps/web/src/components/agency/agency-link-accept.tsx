'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';

export function AgencyLinkAccept({ token, agencyName }: { token: string; agencyName: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function accept() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/agency/link/accept', { method: 'POST', json: { token } });
      setDone(true);
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  if (done)
    return (
      <InlineAlert tone="success">
        Bağlantı onaylandı. {agencyName} ekibi hesabınıza erişebilir; panele yönlendiriliyorsunuz…
      </InlineAlert>
    );

  return (
    <div className="space-y-4">
      {error && <InlineAlert>{error}</InlineAlert>}
      <button
        type="button"
        onClick={accept}
        disabled={!hydrated || loading}
        className="btn-primary disabled:opacity-50"
        aria-busy={loading}
      >
        {loading ? 'Onaylanıyor…' : `${agencyName} erişimini onayla`}
      </button>
    </div>
  );
}
