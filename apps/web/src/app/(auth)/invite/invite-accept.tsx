'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

export function InviteAccept({
  token,
  tenantName,
  currentTenantName,
}: {
  token: string;
  tenantName: string;
  currentTenantName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/team/accept', { method: 'POST', json: { token } });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <InlineAlert tone="warning">
        Daveti kabul ettiğinizde mevcut tek kişilik hesabınız (<b>{currentTenantName}</b>) ve içindeki veriler silinir;{' '}
        <b>{tenantName}</b> ekibine taşınırsınız. Bu işlem geri alınamaz.
      </InlineAlert>
      {error && <InlineAlert>{error}</InlineAlert>}
      <button
        type="button"
        onClick={accept}
        disabled={loading}
        className="btn-primary disabled:opacity-50"
        aria-busy={loading}
      >
        {loading ? 'Katılınıyor…' : 'Daveti kabul et ve katıl'}
      </button>
    </div>
  );
}
