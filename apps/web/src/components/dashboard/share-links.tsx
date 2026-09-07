'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Link2, Loader2, Copy, Check, Ban, Eye } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ShareDto } from '@/server/report-share';

type Data = {
  shares: ShareDto[];
  limit: number;
  activeCount: number;
  maxDays: number;
  ranges: readonly number[];
  canManage: boolean;
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
}

/**
 * Rapor paylaşım linkleri (marka bağlamı). Link yalnızca oluşturma anında bir kez gösterilir;
 * listede token yok. "Independent AI ile hazırlandı" imzası kaldırılamaz (beyaz etiket lansmanda yok).
 */
export function ShareLinks({ readOnly = false }: { readOnly?: boolean }) {
  const hydrated = useHydrated();
  const ids = { label: useId(), range: useId(), days: useId() };
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [range, setRange] = useState(30);
  const [days, setDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<{ link: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ShareDto | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<Data>('/api/agency/shares'));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    setFresh(null);
    try {
      const r = await apiFetch<{ link: string; share: ShareDto }>('/api/agency/shares', {
        method: 'POST',
        json: { label: label || undefined, rangeDays: range, expiresInDays: days },
      });
      setFresh({ link: r.link, id: r.share.id });
      setLabel('');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await apiFetch(`/api/agency/shares/${revokeTarget.id}`, { method: 'DELETE' });
      setRevokeTarget(null);
      if (fresh?.id === revokeTarget.id) setFresh(null);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error)
    return (
      <div className="card p-8 flex justify-center" aria-busy="true">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Yükleniyor" />
      </div>
    );
  if (!data) return <InlineAlert>{error}</InlineAlert>;
  const canCreate = data.canManage && !readOnly;

  return (
    <div className="space-y-5">
      {error && <InlineAlert>{error}</InlineAlert>}
      {fresh && (
        <InlineAlert tone="success">
          Link oluşturuldu. <b>Yalnızca şimdi gösterilir</b>; kopyalayın ve paylaşın.
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 text-[11.5px] break-all bg-paper-1 border border-hairline rounded px-2 py-1">
              {fresh.link}
            </code>
            <button
              type="button"
              className="btn-secondary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1"
              onClick={() => {
                void navigator.clipboard?.writeText(fresh.link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Paylaşım linkini kopyala"
            >
              {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
            </button>
          </div>
        </InlineAlert>
      )}

      <div className="card divide-y divide-hairline">
        {data.shares.length === 0 && <div className="p-5 text-[13px] text-ink-muted">Henüz paylaşım linki yok.</div>}
        {data.shares.map((s) => (
          <div
            key={s.id}
            className={`p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap ${s.active ? '' : 'opacity-60'}`}
          >
            <div className="min-w-0">
              <div className="text-[14px] flex items-center gap-2">
                <Link2 className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden />
                <span className="truncate">{s.label ?? 'Adsız rapor'}</span>
                <span className="chip !text-[10px]">son {s.rangeDays} gün</span>
                {!s.active && (
                  <span className="chip !text-[10px] text-danger">{s.revokedAt ? 'iptal' : 'süresi doldu'}</span>
                )}
              </div>
              <div className="text-[11px] text-ink-faint mt-1 inline-flex items-center gap-2 flex-wrap">
                <span>{fmt(s.expiresAt)} tarihine kadar</span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-3 h-3" aria-hidden /> {s.views} görüntülenme
                </span>
                {s.lastViewedAt && <span>son: {fmt(s.lastViewedAt)}</span>}
              </div>
            </div>
            {canCreate && s.active && (
              <button
                type="button"
                onClick={() => setRevokeTarget(s)}
                className="text-[12px] text-ink-muted hover:text-danger underline inline-flex items-center gap-1"
              >
                <Ban className="w-3.5 h-3.5" aria-hidden /> İptal et
              </button>
            )}
          </div>
        ))}
      </div>

      {canCreate && (
        <form onSubmit={create} className="card p-5 sm:p-6">
          <div className="text-[14px] font-medium">Yeni paylaşım linki</div>
          <p className="text-[12px] text-ink-muted mt-1">
            Salt-okunur, giriş gerektirmeyen rapor. E-posta, AI yanıt metni veya kişisel veri içermez; "Independent AI
            ile hazırlandı" imzası taşır.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 mt-3">
            <div>
              <label htmlFor={ids.label} className="sr-only">
                Etiket
              </label>
              <input
                id={ids.label}
                className="input"
                placeholder="Etiket (örn. Eylül raporu)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor={ids.range} className="sr-only">
                Aralık
              </label>
              <select id={ids.range} className="input" value={range} onChange={(e) => setRange(Number(e.target.value))}>
                {data.ranges.map((r) => (
                  <option key={r} value={r}>
                    Son {r} gün
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={ids.days} className="sr-only">
                Geçerlilik
              </label>
              <select id={ids.days} className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[7, 14, 30, 60, 90]
                  .filter((d) => d <= data.maxDays)
                  .map((d) => (
                    <option key={d} value={d}>
                      {d} gün geçerli
                    </option>
                  ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!hydrated || creating || data.activeCount >= data.limit}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
              aria-busy={creating}
            >
              {creating ? 'Oluşturuluyor…' : 'Link oluştur'}
            </button>
          </div>
          <p className="text-[11.5px] text-ink-faint mt-2">
            {data.activeCount}/{data.limit} aktif link · en fazla {data.maxDays} gün geçerli.
          </p>
        </form>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        title="Paylaşım linkini iptal et"
        description={
          <>
            <b>{revokeTarget?.label ?? 'Adsız rapor'}</b> linki anında geçersiz olur; açanlar "bağlantı geçerli değil"
            mesajı görür.
          </>
        }
        confirmLabel="İptal et"
        destructive
        busy={busy}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
