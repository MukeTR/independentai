'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';

export function AgencyInviteAccept({
  token,
  agencyName,
  currentTenantName,
}: {
  token: string;
  agencyName: string;
  currentTenantName: string;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/agency/invites/accept', { method: 'POST', json: { token } });
      router.push('/agency');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <InlineAlert tone="warning">
        Kabul ettiğinizde mevcut tek kişilik hesabınız (<b>{currentTenantName}</b>) kapatılır ve <b>{agencyName}</b>{' '}
        ajans ekibine taşınırsınız. Marka verisi olan bir hesapla katılamazsınız.
      </InlineAlert>
      {error && <InlineAlert>{error}</InlineAlert>}
      <button
        type="button"
        onClick={accept}
        disabled={!hydrated || loading}
        className="btn-primary disabled:opacity-50"
        aria-busy={loading}
      >
        {loading ? 'Katılınıyor…' : 'Daveti kabul et ve ajansa katıl'}
      </button>
    </div>
  );
}
