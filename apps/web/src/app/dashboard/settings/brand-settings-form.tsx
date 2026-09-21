'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Save } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

type Brand = { id: string; name: string; aliases: string[]; website: string | null };

export function BrandSettingsForm({ brands, readOnly = false }: { brands: Brand[]; readOnly?: boolean }) {
  const router = useRouter();
  const ids = { name: useId(), alias: useId(), site: useId() };
  const existing = brands[0];
  const [name, setName] = useState(existing?.name ?? '');
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? []);
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [aliasInput, setAliasInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addAlias = () => {
    const v = aliasInput.trim();
    if (!v) return;
    if (!aliases.some((a) => a.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr'))) setAliases([...aliases, v]);
    setAliasInput('');
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving || readOnly) return;
    setSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const body = { name, aliases, website: website || null };
      if (existing) await apiFetch(`/api/brands/${existing.id}`, { method: 'PATCH', json: body });
      else await apiFetch('/api/brands', { method: 'POST', json: body });
      setSavedAt(new Date().toLocaleTimeString('tr-TR'));
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Kaydedilemedi'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-5 sm:p-7" aria-describedby={readOnly ? undefined : undefined}>
      <fieldset disabled={readOnly} className="space-y-5 min-w-0">
        <div>
          <label htmlFor={ids.name} className="eyebrow block mb-2">
            Marka adı (ana)
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
          <label htmlFor={ids.alias} className="eyebrow block mb-2">
            Alternatif yazımlar / domain
          </label>
          <div className="flex gap-2">
            <input
              id={ids.alias}
              className="input"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="acme.com, Acme Corp"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAlias();
                }
              }}
            />
            <button type="button" className="btn-secondary !px-4" onClick={addAlias} aria-label="Alternatif yazım ekle">
              <Plus className="w-4 h-4" aria-hidden />
            </button>
          </div>
          <ul className="flex flex-wrap gap-2 mt-3" aria-label="Alternatif yazımlar">
            {aliases.map((a, i) => (
              <li key={`${a}-${i}`} className="chip own">
                {a}
                <button
                  type="button"
                  onClick={() => setAliases(aliases.filter((_, j) => j !== i))}
                  aria-label={`${a} kaldır`}
                >
                  <X className="w-3 h-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[11.5px] text-ink-faint mt-2">
            AI cevaplarda bu yazımlardan herhangi biri geçerse marka bahsi olarak sayılır. En fazla 20.
          </p>
        </div>
        <div>
          <label htmlFor={ids.site} className="eyebrow block mb-2">
            Web sitesi
          </label>
          <input
            id={ids.site}
            className="input"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
          />
        </div>
      </fieldset>

      {error && <InlineAlert className="mt-5">{error}</InlineAlert>}
      <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t-hairline border-hairline flex-wrap">
        <span className={`text-[12px] ${savedAt ? 'text-positive' : 'text-ink-faint'}`} role="status">
          {savedAt ? `Kaydedildi · ${savedAt}` : 'Değişiklikler hemen aktif olur.'}
        </span>
        <button
          type="submit"
          disabled={saving || readOnly}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          aria-busy={saving}
        >
          <Save className="w-4 h-4" aria-hidden />
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
