'use client';

import Link from 'next/link';
import { ArrowUpRight, PauseCircle, Archive, Store } from 'lucide-react';
import type { ClientCard } from '@/server/agency';
import { HEALTH_LABEL, PLATFORM_LABEL, WORKSPACE_STATUS_LABEL, fmtAgo, fmtDelta } from './format';

export function ClientCardView({
  card,
  onOpen,
  busy,
}: {
  card: ClientCard;
  onOpen: (tenantId: string) => void;
  busy?: boolean;
}) {
  const h = HEALTH_LABEL[card.health];
  const deltaCls =
    card.visibilityDelta7 > 0 ? 'text-positive' : card.visibilityDelta7 < 0 ? 'text-danger' : 'text-ink-faint';
  return (
    <article
      className="card p-5 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform"
      aria-label={card.name}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/agency/clients/${card.workspaceId}`}
            className="font-display text-[15.5px] leading-tight hover:text-brand-deep truncate block"
          >
            {card.name}
          </Link>
          {card.website && (
            <div className="text-[11px] text-ink-faint font-mono truncate mt-0.5">
              {card.website.replace(/^https?:\/\//, '')}
            </div>
          )}
        </div>
        <span className={`chip !text-[10.5px] border ${h.cls}`}>{h.label}</span>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Görünürlük · 30g</div>
          <div className="font-display text-[26px] tabular leading-none mt-1">{card.visibility}%</div>
        </div>
        <div className="text-right">
          <div className="eyebrow">7g değişim</div>
          <div className={`font-mono text-[14px] tabular mt-1 ${deltaCls}`}>{fmtDelta(card.visibilityDelta7)}</div>
        </div>
        <div className="text-right">
          <div className="eyebrow">SoV</div>
          <div className="font-mono text-[14px] tabular mt-1">{card.sov}%</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
        {card.status !== 'ACTIVE' && (
          <span className="chip !text-[10px] inline-flex items-center gap-1">
            {card.status === 'PAUSED' ? (
              <PauseCircle className="w-3 h-3" aria-hidden />
            ) : (
              <Archive className="w-3 h-3" aria-hidden />
            )}
            {WORKSPACE_STATUS_LABEL[card.status]}
          </span>
        )}
        {card.platform && (
          <span className="chip !text-[10px] inline-flex items-center gap-1">
            <Store className="w-3 h-3" aria-hidden /> {PLATFORM_LABEL[card.platform] ?? card.platform}
          </span>
        )}
        {card.tags.map((t) => (
          <span key={t} className="chip own !text-[10px]">
            {t}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2 text-[11.5px] text-ink-faint border-t border-hairline pt-3 mt-auto">
        <span suppressHydrationWarning>Son çalıştırma: {fmtAgo(card.lastRunAt)}</span>
        {card.ownerEmail && (
          <span className="truncate max-w-[45%] font-mono" title="Sorumlu">
            {card.ownerEmail}
          </span>
        )}
      </div>
      {(card.failedRuns7d > 0 || card.syncError) && (
        <div className="text-[11.5px] text-warning">
          {card.failedRuns7d > 0 && <span>{card.failedRuns7d} başarısız çalıştırma (7g)</span>}
          {card.failedRuns7d > 0 && card.syncError && ' · '}
          {card.syncError && <span>Senkron hatası: {card.syncError}</span>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onOpen(card.tenantId)}
        disabled={busy || card.status === 'ARCHIVED'}
        className="btn-secondary !py-2 text-[12.5px] inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        Panelde aç <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
      </button>
    </article>
  );
}
