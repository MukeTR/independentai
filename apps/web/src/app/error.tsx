'use client';

import Link from 'next/link';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper">
      <div className="card p-8 text-center max-w-md" role="alert">
        <div className="eyebrow">Hata</div>
        <h1 className="font-display text-[24px] mt-2">Beklenmeyen bir hata oluştu</h1>
        <p className="text-[14px] text-ink-muted mt-2">
          Lütfen tekrar deneyin. Sorun sürerse bize yazın: destek@independentai.space
        </p>
        {error.digest && <p className="text-[11px] text-ink-faint font-mono mt-2">Referans: {error.digest}</p>}
        <div className="flex justify-center gap-2 mt-6">
          <button type="button" onClick={reset} className="btn-primary !py-2 !px-4 text-[13px]">
            Tekrar dene
          </button>
          <Link href="/" className="btn-secondary !py-2 !px-4 text-[13px]">
            Ana sayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
