'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, Copy, Check, KeyRound } from 'lucide-react';

type Token = { id: string; name: string; prefix: string; lastUsedAt: string | null; createdAt: string };

export function ApiTokensManager() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/api-tokens').then((r) => r.json()).then(setTokens).catch(() => setTokens([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/api-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewToken(data.token);
        setTokens([{ id: data.id, name: data.name, prefix: data.prefix, lastUsedAt: null, createdAt: data.createdAt }, ...tokens]);
        setName('');
      }
    } finally {
      setCreating(false);
    }
  }

  async function del(id: string) {
    await fetch(`/api/api-tokens?id=${id}`, { method: 'DELETE' });
    setTokens(tokens.filter((t) => t.id !== id));
  }

  function copy() {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {newToken && (
        <div className="card p-5 border-brand/30 bg-brand-glow/40">
          <div className="text-[13px] font-medium text-brand-deep">Token oluşturuldu — bir daha gösterilmeyecek, şimdi kopyalayın:</div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-[12.5px] font-mono bg-paper-1 border border-hairline rounded-lg px-3 py-2 break-all">{newToken}</code>
            <button onClick={copy} className="btn-primary inline-flex items-center gap-1.5 shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="card p-6">
        <label className="text-[14px] font-medium">Yeni API token</label>
        <div className="flex gap-2 mt-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Token adı — örn. Zapier entegrasyonu" className="input flex-1" />
          <button type="submit" disabled={creating} className="btn-primary inline-flex items-center gap-1.5 whitespace-nowrap">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Oluştur
          </button>
        </div>
      </form>

      <div className="card p-6">
        <h3 className="font-display text-[16px] flex items-center gap-2"><KeyRound className="w-4 h-4 text-brand" /> Token'larınız</h3>
        <div className="mt-4 space-y-2">
          {tokens.length === 0 && <div className="text-[13px] text-ink-faint">Henüz token yok.</div>}
          {tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-4 py-3">
              <div>
                <div className="text-[13.5px]">{t.name}</div>
                <div className="text-[11.5px] text-ink-faint font-mono mt-0.5">{t.prefix}</div>
              </div>
              <button onClick={() => del(t.id)} className="text-ink-faint hover:text-danger shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6 bg-paper-2/40">
        <div className="eyebrow mb-2">Kullanım</div>
        <pre className="text-[12px] font-mono text-ink-muted overflow-x-auto whitespace-pre">{`curl -H "Authorization: Bearer iai_live_..." \\
  https://independentai.space/api/v1/visibility?days=30`}</pre>
        <p className="text-[12.5px] text-ink-muted mt-3">Görünürlük skoru, ses payı, trend, model kırılımı ve atıf kaynaklarını JSON döndürür.</p>
      </div>
    </div>
  );
}
