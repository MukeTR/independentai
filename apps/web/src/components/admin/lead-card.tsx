import Link from 'next/link';
import { ExternalLink, Globe, Building2, Mail } from 'lucide-react';
import type { LeadSource, LeadStatus } from '@independentai/db';
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, type LeadActivity } from '@/server/leads';
import { activityLabel } from '@/server/lead-admin';
import { fmtDateTime } from '@/lib/admin-format';
import { cn } from '@/lib/cn';
import { LeadActions, type LeadActionsLead } from '@/app/admin/leads/lead-actions';

/**
 * Lead kartı (Kârmatik admin.messages deseni): başlık satırı (alan adı / kişi + durum + tarih), özet satırı
 * (skor, tarama sayısı, platform/sektör, şirket, maskeli e-posta), aksiyonlar, akordeon aktivite günlüğü.
 * Sunucu bileşeni; yalnız `LeadActions` istemcidir.
 */
export const STATUS_TONE: Record<LeadStatus, string> = {
  NEW: 'bg-brand-glow text-brand-deep border-brand/20',
  CONTACTED: 'bg-warning/10 text-warning border-warning/25',
  QUALIFIED: 'bg-paper-4 text-ink border-hairline',
  WON: 'bg-positive/10 text-positive border-positive/25',
  LOST: 'bg-danger/10 text-danger border-danger/25',
};

export type LeadCardData = LeadActionsLead & {
  source: LeadSource;
  scanCount: number;
  lastScore: number | null;
  bestScore: number | null;
  platform: string | null;
  sector: string | null;
  tenantId: string | null;
  contactName: string | null;
  company: string | null;
  topic: string | null;
  consentAt: Date | null;
  lastSeenAt: Date;
  firstSeenAt: Date;
  activity: LeadActivity[];
  reportHref?: string | null;
};

export function StatusChip({ status }: { status: LeadStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        STATUS_TONE[status],
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}

export function LeadCard({
  lead,
  owners,
  activityLimit = 5,
}: {
  lead: LeadCardData;
  owners: { id: string; email: string }[];
  activityLimit?: number;
}) {
  const title = lead.hostname ?? lead.contactName ?? lead.company ?? 'Sitesiz lead';
  const activity = [...lead.activity].reverse();
  const shown = activityLimit > 0 ? activity.slice(0, activityLimit) : activity;
  return (
    <article className="card p-4 sm:p-5" aria-labelledby={`lead-${lead.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 id={`lead-${lead.id}`} className="font-medium text-[15px] break-all">
              <Link href={`/admin/leads/${lead.id}`} className="hover:text-brand-deep">
                {title}
              </Link>
            </h3>
            <StatusChip status={lead.status} />
            <span className="chip !text-[10px]">{LEAD_SOURCE_LABELS[lead.source]}</span>
            <span className="text-[11px] text-ink-faint font-mono">{fmtDateTime(lead.lastSeenAt)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-muted">
            {lead.hostname && (
              <a
                href={`https://${lead.hostname}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-ink"
              >
                <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                {lead.hostname}
                <span className="sr-only"> (yeni sekmede açılır)</span>
              </a>
            )}
            {lead.lastScore != null && (
              <span className="tabular">
                skor {lead.lastScore}
                {lead.bestScore != null && lead.bestScore !== lead.lastScore ? ` (en iyi ${lead.bestScore})` : ''}
              </span>
            )}
            {lead.scanCount > 0 && <span className="tabular">{lead.scanCount} tarama</span>}
            {lead.platform && <span>{lead.platform}</span>}
            {lead.sector && <span>sektör: {lead.sector}</span>}
            {lead.company && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                {lead.company}
              </span>
            )}
            {lead.contactName && lead.hostname && <span>{lead.contactName}</span>}
            {lead.contactEmail && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {lead.contactEmail}
              </span>
            )}
            {lead.topic && <span className="chip !text-[10px]">{lead.topic}</span>}
          </div>
        </div>
        {lead.reportHref && (
          <a
            href={lead.reportHref}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary !py-2 !px-3 text-[12px] inline-flex items-center gap-1.5 shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
            Raporu aç
          </a>
        )}
      </div>

      <LeadActions lead={lead} owners={owners} />

      {activity.length > 0 && (
        <details className="mt-3 border-t border-hairline pt-3">
          <summary className="cursor-pointer text-[12px] text-ink-muted hover:text-ink min-h-[36px] inline-flex items-center">
            {activity.length} aktivite
          </summary>
          <ol className="mt-2 space-y-1.5 text-[12px]">
            {shown.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-ink-faint font-mono whitespace-nowrap">{fmtDateTime(a.at)}</span>
                <span className="font-medium">{activityLabel(a.action)}</span>
                {a.note && <span className="text-ink-muted">— {a.note}</span>}
              </li>
            ))}
            {activity.length > shown.length && (
              <li>
                <Link href={`/admin/leads/${lead.id}`} className="text-brand-deep hover:underline">
                  Tümünü gör ({activity.length}) →
                </Link>
              </li>
            )}
          </ol>
        </details>
      )}
    </article>
  );
}
