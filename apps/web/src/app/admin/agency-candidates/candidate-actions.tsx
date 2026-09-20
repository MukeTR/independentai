'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import type { AgencyStatusKey } from '@/lib/agency-labels';

/** Aday aksiyonları: İletişime geç · Dönüştü · Yoksay · not → PATCH /api/admin/agency-candidates/[id]. */
export function CandidateActions({ id, status, note }: { id: string; status: AgencyStatusKey; note: string | null }) {
  const router = useRouter();
  const noteId = useId();
  const [text, setText] = useState(note ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { status?: AgencyStatusKey; note?: string }, key: string) {
    if (busy) return;
    setBusy(key);
    setError(null);
    try {
      await apiFetch(`/api/admin/agency-candidates/${id}`, { method: 'PATCH', json: body });
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Güncellenemedi'));
    } finally {
      setBusy(null);
    }
  }

  const btn = (label: string, next: AgencyStatusKey, tone: 'brand' | 'positive' | 'muted') => (
    <button
      type="button"
      onClick={() => patch({ status: next }, next)}
      disabled={!!busy || status === next}
      aria-busy={busy === next}
      className={`text-[12px] px-3 py-1.5 rounded-full border disabled:opacity-40 ${
        tone === 'brand'
          ? 'border-brand/30 text-brand-deep hover:bg-brand-glow'
          : tone === 'positive'
            ? 'border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10'
            : 'border-hairline text-ink-muted hover:bg-paper-3'
      }`}
    >
      {busy === next ? '…' : label}
    </button>
  );

  return (
    <div className="w-full sm:w-[260px] shrink-0">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Aday aksiyonları">
        {btn('İletişime geç', 'CONTACTED', 'brand')}
        {btn('Dönüştü', 'CONVERTED', 'positive')}
        {btn('Yoksay', 'DISMISSED', 'muted')}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void patch({ note: text }, 'note');
        }}
        className="mt-2 flex gap-1.5"
      >
        <label htmlFor={noteId} className="sr-only">
          Not
        </label>
        <input
          id={noteId}
          className="input !py-1.5 text-[12px]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Not ekle…"
        />
        <button
          type="submit"
          className="btn-secondary !py-1.5 !px-3 text-[12px] disabled:opacity-50"
          disabled={!!busy || text === (note ?? '')}
          aria-busy={busy === 'note'}
        >
          Kaydet
        </button>
      </form>
      {error && <InlineAlert className="mt-2">{error}</InlineAlert>}
    </div>
  );
}
