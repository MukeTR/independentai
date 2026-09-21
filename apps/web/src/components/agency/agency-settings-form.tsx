'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';

export function AgencySettingsForm({
  initial,
  readOnly,
}: {
  initial: { name: string; website: string };
  readOnly: boolean;
}) {
  const hydrated = useHydrated();
  const router = useRouter();
  const ids = { name: useId(), site: useId() };
  const [name, setName] = useState(initial.name);
  const [website, setWebsite] = useState(initial.website);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = name !== initial.name || website !== initial.website;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || readOnly) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiFetch('/api/agency', { method: 'PATCH', json: { name, website: website || null } });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-5 sm:p-6 space-y-4">
      <fieldset disabled={readOnly} className="space-y-4 min-w-0">
        <div>
          <label htmlFor={ids.name} className="eyebrow block mb-1.5">
            Ajans adı
          </label>
          <input
            id={ids.name}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div>
          <label htmlFor={ids.site} className="eyebrow block mb-1.5">
            Web sitesi <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
          </label>
          <input
            id={ids.site}
            className="input"
            type="text"
            inputMode="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="ajans.com"
          />
        </div>
      </fieldset>
      {error && <InlineAlert>{error}</InlineAlert>}
      {saved && !dirty && (
        <p className="text-[12px] text-positive" role="status">
          Kaydedildi.
        </p>
      )}
      {!readOnly && (
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hydrated || saving || !dirty || !name.trim()}
            className="btn-primary !py-2 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
            aria-busy={saving}
          >
            <Save className="w-4 h-4" aria-hidden /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      )}
    </form>
  );
}
