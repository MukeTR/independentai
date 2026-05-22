'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

type Competitor = { id: string; name: string; aliases: string[]; website: string | null };

export function CompetitorsManager({ initial }: { initial: Competitor[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [website, setWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/proxy/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          aliases: aliasesText.split(',').map((s) => s.trim()).filter(Boolean),
          website: website || undefined,
        }),
      });
      setName('');
      setAliasesText('');
      setWebsite('');
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/proxy/competitors/${id}`, { method: 'DELETE' });
    router.refresh();
  }

  return (
    <>
      <form onSubmit={add} className="card p-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="eyebrow block mb-2">Rakip adı</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adisyo" />
          </div>
          <div>
            <label className="eyebrow block mb-2">Alternatif yazımlar</label>
            <input className="input" value={aliasesText} onChange={(e) => setAliasesText(e.target.value)} placeholder="adisyo.com, Adisyo POS" />
          </div>
          <div>
            <label className="eyebrow block mb-2">Web sitesi</label>
            <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <button type="submit" disabled={saving || !name.trim()} className="btn-primary mt-5 inline-flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" />
          Rakip ekle
        </button>
      </form>

      <div className="card mt-6 divide-y divide-hairline">
        {initial.length === 0 && <div className="p-8 text-center text-ink-muted text-[14px]">Henüz rakip eklemediniz.</div>}
        {initial.map((c) => (
          <div key={c.id} className="p-5 flex items-center justify-between">
            <div>
              <div className="font-display text-[16px]">{c.name}</div>
              {c.aliases.length > 0 && (
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {c.aliases.map((a, i) => (
                    <span key={i} className="chip">{a}</span>
                  ))}
                </div>
              )}
              {c.website && <div className="text-[11px] text-ink-faint font-mono mt-1">{c.website}</div>}
            </div>
            <button onClick={() => remove(c.id)} className="text-ink-faint hover:text-danger">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
