'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function AgencyError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[agency error]', error.digest ?? error.message);
  }, [error]);
  return (
    <div className="card p-8 text-center max-w-lg mx-auto mt-10" role="alert">
      <div className="eyebrow">Hata</div>
      <h2 className="font-display text-[22px] mt-2">Bir şeyler ters gitti</h2>
      <p className="text-[14px] text-ink-muted mt-2">
        Portföy yüklenirken beklenmeyen bir hata oluştu. Tekrar deneyebilir veya portföye dönebilirsiniz.
      </p>
      {error.digest && <p className="text-[11px] text-ink-faint font-mono mt-2">Referans: {error.digest}</p>}
      <div className="flex justify-center gap-2 mt-6">
        <button type="button" onClick={reset} className="btn-primary !py-2 !px-4 text-[13px]">
          Tekrar dene
        </button>
        <Link href="/agency" className="btn-secondary !py-2 !px-4 text-[13px]">
          Portföye dön
        </Link>
      </div>
    </div>
  );
}
