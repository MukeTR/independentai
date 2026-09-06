'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

export function VerifyClient({ token }: { token: string }) {
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/auth/verify-email', { method: 'PUT', json: { token } })
      .then(() => !cancelled && setState('ok'))
      .catch((err) => {
        if (cancelled) return;
        setError(errorMessage(err));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'pending')
    return (
      <p className="text-[14px] text-ink-muted" aria-live="polite">
        Doğrulanıyor…
      </p>
    );
  if (state === 'ok')
    return (
      <div className="space-y-4">
        <InlineAlert tone="success">E-posta adresiniz doğrulandı.</InlineAlert>
        <Link href="/dashboard" className="btn-primary inline-flex">
          Panele git
        </Link>
      </div>
    );
  return (
    <div className="space-y-4">
      <InlineAlert>{error}</InlineAlert>
      <Link href="/dashboard/settings" className="text-[13px] text-brand hover:underline">
        Ayarlardan yeni doğrulama e-postası isteyin
      </Link>
    </div>
  );
}
