'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Plus, Link2, Info, RefreshCw } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { useRealtimeEvent, RealtimeBadge } from '@/components/realtime-provider';
import { InlineAlert } from '@/components/ui/inline-alert';
import type { ClientCard, summarizePortfolio } from '@/server/agency';
import type { AgencyEntitlement } from '@/server/entitlement';
import { ClientCardView } from './client-card';
import { LinkRequestDialog } from './link-request-dialog';
import { useWorkspaceSwitch } from './use-workspace-switch';
import { HEALTH_LABEL } from './format';

export type PortfolioData = {
  cards: ClientCard[];
  summary: ReturnType<typeof summarizePortfolio>;
  entitlement: AgencyEntitlement;
  me: { membershipId: string; role: string; allClients: boolean };
};

const POLL_MS = 30_000;

/**
 * Portföy ekranı. Sunucudan gelen ilk veriyle açılır; 'agency.changed' | 'run.completed' |
 * 'integration.sync' olaylarında ve 30 sn'de bir (polling fallback) yeniden yüklenir.
 */
export function Portfolio({ initial }: { initial: PortfolioData }) {
  const hydrated = useHydrated();
  const ids = { q: useId(), tag: useId(), status: useId(), health: useId() };
  const [data, setData] = useState<PortfolioData>(initial);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'PAUSED'>('');
  const [health, setHealth] = useState<'' | ClientCard['health']>('');
  const { switchTo, busy, error: switchError } = useWorkspaceSwitch();

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await apiFetch<PortfolioData>('/api/agency/clients'));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useRealtimeEvent('agency.changed', () => void load());
  useRealtimeEvent('run.completed', () => void load());
  useRealtimeEvent('integration.sync', () => void load());
  useEffect(() => {
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const tags = useMemo(() => [...new Set(data.cards.flatMap((c) => c.tags))].sort(), [data.cards]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('tr');
    return data.cards.filter((c) => {
      if (needle && !`${c.name} ${c.website ?? ''} ${c.label ?? ''}`.toLocaleLowerCase('tr').includes(needle))
        return false;
      if (tag && !c.tags.includes(tag)) return false;
      if (status && c.status !== status) return false;
      if (health && c.health !== health) return false;
      return true;
    });
  }, [data.cards, q, tag, status, health]);
  const needsAction = data.cards.filter((c) => data.summary.needsAction.includes(c.tenantId));
  const canManage = data.me.role === 'OWNER' || data.me.role === 'ADMIN';
  const s = data.summary;

  return (
    <div className="space-y-8">
      {(error || switchError) && <InlineAlert>{error ?? switchError}</InlineAlert>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-[12px] text-ink-faint">
          <RealtimeBadge />
          {refreshing && (
            <span className="inline-flex items-center gap-1" role="status">
              <RefreshCw className="w-3 h-3 animate-spin" aria-hidden /> yenileniyor
            </span>
          )}
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLinkOpen(true)}
              disabled={!hydrated}
              className="btn-secondary !py-2 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" aria-hidden /> Mevcut hesabı bağla
            </button>
            <Link
              href="/agency/clients?new=1"
              className="btn-primary !py-2 text-[13px] inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden /> Yeni müşteri
            </Link>
          </div>
        )}
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Stat label="Müşteri" value={s.clients} sub={`${s.active} aktif · ${s.paused} duraklatılmış`} />
        <Stat
          label="Ort. görünürlük"
          value={`${s.avgVisibility}%`}
          tip="Müşteri başına eşit ağırlıklı ortalama; her müşteri değeri docs/METRICS.md görünürlük formülüyle hesaplanır (son 30 gün, verisi olmayan müşteriler hariç)."
        />
        <Stat
          label="Ort. SoV"
          value={`${s.avgSov}%`}
          tip="Müşteri başına eşit ağırlıklı Share of Voice ortalaması; formül docs/METRICS.md."
        />
        <Stat label="Yükselen / düşen" value={`${s.rising} / ${s.falling}`} sub="7 günlük ±5 puan" />
        <Stat label="Kritik" value={s.critical} tone={s.critical ? 'danger' : undefined} />
        <Stat
          label="Başarısız çalıştırma"
          value={s.failedRuns7d}
          sub="son 7 gün"
          tone={s.failedRuns7d ? 'warning' : undefined}
        />
        <Stat label="Senkron sorunu" value={s.syncIssues} tone={s.syncIssues ? 'warning' : undefined} />
      </div>

      {/* Aksiyon gereken */}
      {needsAction.length > 0 && (
        <section className="card p-5" aria-labelledby="needs-h">
          <h2 id="needs-h" className="font-display text-[15px] inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" aria-hidden /> Aksiyon gereken müşteriler (
            {needsAction.length})
          </h2>
          <ul className="mt-3 divide-y divide-hairline">
            {needsAction.slice(0, 8).map((c) => (
              <li key={c.tenantId} className="py-2 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-2">
                  <span className={`chip !text-[10px] border ${HEALTH_LABEL[c.health].cls}`}>
                    {HEALTH_LABEL[c.health].label}
                  </span>
                  <Link
                    href={`/agency/clients/${c.workspaceId}`}
                    className="text-[13.5px] truncate hover:text-brand-deep"
                  >
                    {c.name}
                  </Link>
                </div>
                <div className="text-[12px] text-ink-muted">
                  {c.status === 'PAUSED' && 'duraklatıldı · '}
                  {c.visibilityDelta7 <= -5 && `görünürlük ${c.visibilityDelta7} puan · `}
                  {c.failedRuns7d > 0 && `${c.failedRuns7d} hatalı çalıştırma · `}
                  {c.syncError && `senkron: ${c.syncError} · `}
                  {c.criticalFindings >= 3 && `${c.criticalFindings} kritik bulgu`}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filtre + arama */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
        <div>
          <label htmlFor={ids.q} className="sr-only">
            Müşteri ara
          </label>
          <input
            id={ids.q}
            className="input"
            placeholder="Müşteri ara…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={ids.tag} className="sr-only">
            Etiket
          </label>
          <select id={ids.tag} className="input !w-auto" value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">Tüm etiketler</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={ids.status} className="sr-only">
            Durum
          </label>
          <select
            id={ids.status}
            className="input !w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">Tüm durumlar</option>
            <option value="ACTIVE">Aktif</option>
            <option value="PAUSED">Duraklatıldı</option>
          </select>
        </div>
        <div>
          <label htmlFor={ids.health} className="sr-only">
            Sağlık
          </label>
          <select
            id={ids.health}
            className="input !w-auto"
            value={health}
            onChange={(e) => setHealth(e.target.value as typeof health)}
          >
            <option value="">Tüm sağlık</option>
            <option value="critical">Kritik</option>
            <option value="warn">Dikkat</option>
            <option value="good">Sağlıklı</option>
            <option value="idle">Veri yok</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {data.cards.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="font-display text-[20px]">Henüz müşteri yok</h2>
          <p className="text-[14px] text-ink-muted mt-2 max-w-md mx-auto">
            İlk müşterinizi oluşturun ya da müşterinizin mevcut Independent AI hesabını onaylı bağlantıyla portföyünüze
            ekleyin.
            {` `}Lansman planında {data.entitlement.limits.clients} müşteriye kadar.
          </p>
          {canManage && (
            <div className="flex justify-center gap-2 mt-6 flex-wrap">
              <Link href="/agency/clients?new=1" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" aria-hidden /> Yeni müşteri
              </Link>
              <button
                type="button"
                onClick={() => setLinkOpen(true)}
                disabled={!hydrated}
                className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Link2 className="w-4 h-4" aria-hidden /> Mevcut hesabı bağla
              </button>
            </div>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[13.5px] text-ink-muted" role="status">
          Filtreye uyan müşteri yok.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <ClientCardView key={c.workspaceId} card={c} onOpen={(t) => void switchTo(t)} busy={busy} />
          ))}
        </div>
      )}

      {busy && (
        <div
          className="fixed inset-0 z-50 bg-paper/60 flex items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <span className="card px-4 py-2 inline-flex items-center gap-2 text-[13px]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Çalışma alanı değiştiriliyor…
          </span>
        </div>
      )}
      <LinkRequestDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tip,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tip?: string;
  tone?: 'danger' | 'warning';
}) {
  const cls = tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-ink';
  return (
    <div className="card p-4">
      <div className="eyebrow flex items-center gap-1">
        {label}
        {tip && (
          <span className="inline-flex" title={tip} tabIndex={0} aria-label={`${label}: ${tip}`}>
            <Info className="w-3 h-3 text-ink-faint" aria-hidden />
          </span>
        )}
      </div>
      <div className={`font-display text-[24px] tabular mt-1 leading-none ${cls}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-faint mt-1.5 leading-tight">{sub}</div>}
    </div>
  );
}
