'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Save } from 'lucide-react';

type Brand = { id: string; name: string; aliases: string[]; website: string | null };

export function BrandSettingsForm({ brands }: { brands: Brand[] }) {
  const router = useRouter();

  // Existing brand (edit) or new (create)
  const existing = brands[0];

  const [name, setName] = useState(existing?.name ?? '');
  const [aliases, setAliases] = useState<string[]>(existing?.aliases ?? []);
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [aliasInput, setAliasInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const body = JSON.stringify({ name, aliases, website: website || undefined });
    try {
      if (existing) {
        await fetch(`/api/brands/${existing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body });
      } else {
        await fetch('/api/brands', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      }
      setSavedAt(new Date().toLocaleTimeString('tr-TR'));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-7">
      <div className="space-y-5">
        <div>
          <label className="eyebrow block mb-2">Marka adı (ana)</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="eyebrow block mb-2">Alternatif yazımlar / domain</label>
          <div className="flex gap-2">
            <input
              className="input"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="acme.com, Acme Corp"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (aliasInput.trim()) {
                    setAliases([...aliases, aliasInput.trim()]);
                    setAliasInput('');
                  }
                }
              }}
            />
            <button
              type="button"
              className="btn-secondary !px-4"
              onClick={() => {
                if (aliasInput.trim()) {
                  setAliases([...aliases, aliasInput.trim()]);
                  setAliasInput('');
                }
              }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {aliases.map((a, i) => (
              <span key={i} className="chip own">
                {a}
                <button type="button" onClick={() => setAliases(aliases.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <p className="text-[11.5px] text-ink-faint mt-2">
            AI cevaplarda bu yazımlardan herhangi biri geçerse marka bahsi olarak sayılır.
          </p>
        </div>

        <div>
          <label className="eyebrow block mb-2">Web sitesi</label>
          <input className="input" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
        </div>
      </div>

      <div className="flex items-center justify-between mt-7 pt-5 border-t-hairline border-hairline">
        {savedAt ? (
          <span className="text-[12px] text-positive">Kaydedildi · {savedAt}</span>
        ) : (
          <span className="text-[12px] text-ink-faint">Değişiklikler hemen aktif olur.</span>
        )}
        <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
}
