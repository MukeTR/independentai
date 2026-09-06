'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Loader2, Plus, Trash2, Copy, Check, KeyRound } from 'lucide-react';
import { apiFetch, ApiError, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Token = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
};

export function ApiTokensManager({ isOwner, limit }: { isOwner: boolean; limit: number }) {
  const ids = { name: useId(), exp: useId() };
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [name, setName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Token | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    try {
      setTokens(await apiFetch<Token[]>('/api/api-tokens'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setTokens([]);
      else setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    if (isOwner) void load();
    else setTokens([]);
  }, [isOwner, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const data = await apiFetch<Token & { token: string }>('/api/api-tokens', {
        method: 'POST',
        json: { name: name.trim(), expiresInDays: expiresInDays ? Number(expiresInDays) : undefined },
      });
      setNewToken(data.token);
      setName('');
      setExpiresInDays('');
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Token oluşturulamadı'));
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await apiFetch(`/api/api-tokens?id=${encodeURIComponent(revokeTarget.id)}`, { method: 'DELETE' });
      setRevokeTarget(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRevoking(false);
    }
  }

  function copy() {
    if (!newToken) return;
    void navigator.clipboard?.writeText(newToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!isOwner) {
    return (
      <InlineAlert tone="info">API tokenlarını yalnızca hesap sahibi (Owner) oluşturabilir ve yönetebilir.</InlineAlert>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {newToken && (
        <div className="card p-5 border-brand/30 bg-brand-glow/40" role="status">
          <div className="text-[13px] font-medium text-brand-deep">
            Token oluşturuldu — bir daha gösterilmeyecek, şimdi kopyalayın:
          </div>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-[12.5px] font-mono bg-paper-1 border border-hairline rounded-lg px-3 py-2 break-all">
              {newToken}
            </code>
            <button
              type="button"
              onClick={copy}
              className="btn-primary inline-flex items-center gap-1.5 shrink-0"
              aria-label="Tokenı kopyala"
            >
              {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="card p-5 sm:p-6">
        <label htmlFor={ids.name} className="text-[14px] font-medium">
          Yeni API token
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mt-3">
          <input
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Token adı — örn. Zapier entegrasyonu"
            className="input"
            maxLength={60}
            required
          />
          <div>
            <label htmlFor={ids.exp} className="sr-only">
              Geçerlilik
            </label>
            <select
              id={ids.exp}
              className="input"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            >
              <option value="">Süresiz</option>
              <option value="30">30 gün</option>
              <option value="90">90 gün</option>
              <option value="365">1 yıl</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim() || (tokens?.length ?? 0) >= limit}
            className="btn-primary inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            aria-busy={creating}
          >
            {creating ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="w-4 h-4" aria-hidden />
            )}{' '}
            Oluştur
          </button>
        </div>
        <p className="text-[11.5px] text-ink-faint mt-2">
          {tokens?.length ?? 0}/{limit} aktif token · kapsam: read:visibility · 60 istek/dk
        </p>
        {error && <InlineAlert className="mt-3">{error}</InlineAlert>}
      </form>

      <div className="card p-5 sm:p-6">
        <h3 className="font-display text-[16px] flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-brand" aria-hidden /> Tokenlarınız
        </h3>
        <ul className="mt-4 space-y-2" aria-label="API tokenları">
          {tokens === null && (
            <li className="text-[13px] text-ink-faint" aria-busy="true">
              Yükleniyor…
            </li>
          )}
          {tokens?.length === 0 && <li className="text-[13px] text-ink-faint">Henüz token yok.</li>}
          {tokens?.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] truncate">{t.name}</div>
                <div className="text-[11.5px] text-ink-faint font-mono mt-0.5">
                  {t.prefix} ·{' '}
                  {t.lastUsedAt
                    ? `son kullanım ${new Date(t.lastUsedAt).toLocaleDateString('tr-TR')}`
                    : 'hiç kullanılmadı'}
                  {t.expiresAt ? ` · ${new Date(t.expiresAt).toLocaleDateString('tr-TR')} tarihine kadar` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevokeTarget(t)}
                className="text-ink-faint hover:text-danger shrink-0 p-1"
                aria-label={`${t.name} tokenını iptal et`}
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5 sm:p-6 bg-paper-2/40">
        <div className="eyebrow mb-2">Kullanım</div>
        <pre className="text-[12px] font-mono text-ink-muted overflow-x-auto whitespace-pre">{`curl -H "Authorization: Bearer iai_live_..." \\
  https://independentai.space/api/v1/visibility?days=30`}</pre>
        <p className="text-[12.5px] text-ink-muted mt-3">
          Görünürlük skoru, ses payı, trend, model kırılımı ve atıf kaynaklarını JSON döndürür. Tam referans:{' '}
          <a href="/docs/api" className="text-brand-deep underline">
            /docs/api
          </a>
        </p>
      </div>

      <ConfirmDialog
        open={!!revokeTarget}
        title="Tokenı iptal et"
        description={
          <>
            <b>{revokeTarget?.name}</b> anında geçersiz olur; bu tokenı kullanan entegrasyonlar 401 alır.
          </>
        }
        confirmLabel="İptal et"
        destructive
        busy={revoking}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
