'use client';

import { useId, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useHydrated } from '@/lib/use-hydrated';
import { useRefreshGuard } from '@/lib/use-refresh-guard';

type Competitor = { id: string; name: string; aliases: string[]; website: string | null };

export function CompetitorsManager({
  initial,
  readOnly = false,
  limit,
}: {
  initial: Competitor[];
  readOnly?: boolean;
  limit: number;
}) {
  const refresh = useRefreshGuard(initial.length);
  const hydrated = useHydrated();
  const ids = { name: useId(), alias: useId(), site: useId() };
  const [name, setName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Competitor | null>(null);
  const [removing, setRemoving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/competitors', {
        method: 'POST',
        json: {
          name: name.trim(),
          aliases: aliasesText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          website: website || undefined,
        },
      });
      setName('');
      setAliasesText('');
      setWebsite('');
      refresh();
    } catch (err) {
      setError(errorMessage(err, 'Rakip eklenemedi'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await apiFetch(`/api/competitors/${removeTarget.id}`, { method: 'DELETE' });
      setRemoveTarget(null);
      refresh();
    } catch (err) {
      setError(errorMessage(err, 'Silinemedi'));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      {!readOnly && (
        <form onSubmit={add} className="card p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor={ids.name} className="eyebrow block mb-2">
                Rakip adı
              </label>
              <input
                id={ids.name}
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adisyo"
                required
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor={ids.alias} className="eyebrow block mb-2">
                Alternatif yazımlar
              </label>
              <input
                id={ids.alias}
                className="input"
                value={aliasesText}
                onChange={(e) => setAliasesText(e.target.value)}
                placeholder="adisyo.com, Adisyo POS"
                aria-describedby={`${ids.alias}-help`}
              />
              <p id={`${ids.alias}-help`} className="text-[11px] text-ink-faint mt-1">
                Virgülle ayırın.
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
                placeholder="https://..."
              />
            </div>
          </div>
          {error && <InlineAlert className="mt-4">{error}</InlineAlert>}
          <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
            <span className="text-[11.5px] text-ink-faint">
              {initial.length}/{limit} rakip
            </span>
            <button
              type="submit"
              disabled={!hydrated || saving || !name.trim() || initial.length >= limit}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              aria-busy={saving}
            >
              <Plus className="w-4 h-4" aria-hidden />
              {saving ? 'Ekleniyor…' : 'Rakip ekle'}
            </button>
          </div>
        </form>
      )}
      {readOnly && error && <InlineAlert>{error}</InlineAlert>}

      <ul className="card mt-6 divide-y divide-hairline" aria-label="Rakipler">
        {initial.length === 0 && (
          <li className="p-8 text-center text-ink-muted text-[14px]">Henüz rakip eklemediniz.</li>
        )}
        {initial.map((c) => (
          <li key={c.id} className="p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-display text-[16px] truncate">{c.name}</div>
              {c.aliases.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {c.aliases.map((a, i) => (
                    <span key={i} className="chip">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              {c.website && <div className="text-[11px] text-ink-faint font-mono mt-1 truncate">{c.website}</div>}
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setRemoveTarget(c)}
                className="text-ink-faint hover:text-danger p-2 shrink-0"
                aria-label={`${c.name} rakibini sil`}
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!removeTarget}
        title="Rakibi sil"
        description={
          <>
            <b>{removeTarget?.name}</b> silinecek. Geçmiş ölçümlerdeki bahisler korunur, yeni ölçümlerde bu rakip
            aranmaz.
          </>
        }
        confirmLabel="Sil"
        destructive
        busy={removing}
        onConfirm={confirmRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </>
  );
}
