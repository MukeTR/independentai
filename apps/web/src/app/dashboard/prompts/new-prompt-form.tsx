'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useHydrated } from '@/lib/use-hydrated';
import { useRefreshGuard } from '@/lib/use-refresh-guard';

export function NewPromptForm({
  disabled = false,
  count,
  limit,
}: {
  disabled?: boolean;
  count: number;
  limit: number;
}) {
  const refresh = useRefreshGuard(count);
  const hydrated = useHydrated();
  const id = useId();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || saving || disabled) return;
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await apiFetch('/api/prompts', { method: 'POST', json: { text: text.trim(), language: 'tr' } });
      setText('');
      setOk('Soru eklendi. İlk ölçüm arka planda başladı; sonuçlar birkaç dakika içinde görünür.');
      refresh();
    } catch (err) {
      setError(errorMessage(err, 'Soru eklenemedi'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <label htmlFor={id} className="sr-only">
          İzlenecek soru
        </label>
        <input
          id={id}
          className="input"
          placeholder={`Örn: "Türkiye'de en iyi muhasebe yazılımı hangisi?"`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!hydrated || disabled || saving || text.trim().length < 5 || count >= limit}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          aria-busy={saving}
        >
          <Plus className="w-4 h-4" aria-hidden />
          {saving ? 'Ekleniyor…' : 'Ekle'}
        </button>
      </div>
      <div className="flex items-center justify-between mt-2 text-[11.5px] text-ink-faint">
        <span>En az 5, en fazla 500 karakter.</span>
        <span>
          {count}/{limit} soru
        </span>
      </div>
      {error && <InlineAlert className="mt-3">{error}</InlineAlert>}
      {ok && (
        <InlineAlert tone="success" className="mt-3">
          {ok}
        </InlineAlert>
      )}
    </form>
  );
}
