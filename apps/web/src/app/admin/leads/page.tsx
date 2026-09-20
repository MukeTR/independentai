import Link from 'next/link';
import { Suspense } from 'react';
import { Download } from 'lucide-react';
import type { LeadSource, LeadStatus } from '@independentai/db';
import { requireSuperAdmin, listSuperAdmins } from '@/server/admin';
import { prisma } from '@/server/prisma';
import { listLeads, LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, type LeadActivity } from '@/server/leads';
import { LEAD_SOURCES, LEAD_STATUSES, isLeadSource, isLeadStatus, maskPhone } from '@/server/lead-admin';
import { maskEmail } from '@/server/logger';
import { verifyReportToken } from '@/server/report-token';
import { StagePills, type StagePill } from '@/components/admin/stage-pills';
import { SearchBox } from '@/components/admin/search-box';
import { LeadCard } from '@/components/admin/lead-card';
import { CursorNav } from '@/components/admin/data-table';
import { ScreenGuide } from '@/components/admin/screen-guide';

export const dynamic = 'force-dynamic';

type Search = { status?: string; source?: string; q?: string; cursor?: string };

const STATUS_TONE: Record<LeadStatus, StagePill['tone']> = {
  NEW: 'brand',
  CONTACTED: 'warning',
  QUALIFIED: 'neutral',
  WON: 'positive',
  LOST: 'danger',
};

function qs(params: Record<string, string | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export default async function AdminLeads({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const status = isLeadStatus(sp.status) ? sp.status : undefined;
  const source = isLeadSource(sp.source) ? sp.source : undefined;
  const q = sp.q?.trim().slice(0, 120) || undefined;
  const cursor = sp.cursor || undefined;

  const [page, bySourceRows, byStatusRows, owners] = await Promise.all([
    listLeads({ status, source, q, cursor, take: 50 }),
    prisma.lead.groupBy({ by: ['source'], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['status'], where: source ? { source } : {}, _count: { _all: true } }),
    listSuperAdmins(),
  ]);
  const ids = page.items.map((l) => l.id);
  const extras = ids.length
    ? await prisma.lead.findMany({
        where: { id: { in: ids } },
        select: { id: true, activity: true, notes: true, contactPhone: true, lastReportToken: true },
      })
    : [];
  const extraById = new Map(extras.map((e) => [e.id, e]));

  const bySource: Partial<Record<LeadSource, number>> = {};
  for (const r of bySourceRows) bySource[r.source] = r._count._all;
  const byStatus: Partial<Record<LeadStatus, number>> = {};
  for (const r of byStatusRows) byStatus[r.status] = r._count._all;
  const totalAll = bySourceRows.reduce((a, r) => a + r._count._all, 0);
  const totalInSource = byStatusRows.reduce((a, r) => a + r._count._all, 0);

  const sourcePills: StagePill[] = [
    {
      key: 'all',
      label: 'Tümü',
      count: totalAll,
      href: `/admin/leads${qs({ status, q })}`,
      active: !source,
      tone: 'neutral',
    },
    ...LEAD_SOURCES.filter((s) => (bySource[s] ?? 0) > 0 || s === 'TOOL' || s === 'CONTACT' || s === 'ONBOARDING').map(
      (s): StagePill => ({
        key: s,
        label: LEAD_SOURCE_LABELS[s],
        count: bySource[s] ?? 0,
        href: `/admin/leads${qs({ source: s, status, q })}`,
        active: source === s,
        tone: 'neutral',
      }),
    ),
  ];
  const statusPills: StagePill[] = [
    {
      key: 'all',
      label: 'Tüm aşamalar',
      count: totalInSource,
      href: `/admin/leads${qs({ source, q })}`,
      active: !status,
    },
    ...LEAD_STATUSES.map((s): StagePill => ({
      key: s,
      label: LEAD_STATUS_LABELS[s],
      count: byStatus[s] ?? 0,
      href: `/admin/leads${qs({ source, status: s, q })}`,
      active: status === s,
      tone: STATUS_TONE[s],
    })),
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Super Admin</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Lead’ler</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Araç taramaları (yalnız alan adı + skor) ve iletişim formu (KVKK onaylı). Lead verisi yapay zekâ
            servislerine gitmez.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <a
            href={`/api/admin/leads/export${qs({ status, source, q })}`}
            className="btn-secondary !py-2 !px-3.5 text-[12.5px] inline-flex items-center gap-1.5"
            download
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            CSV indir
          </a>
          <ScreenGuide />
        </div>
      </div>

      <StagePills pills={sourcePills} ariaLabel="Kaynak" className="mt-6" />
      <StagePills pills={statusPills} ariaLabel="Aşama" className="mt-3" />

      <Suspense fallback={<div className="input mt-4 min-h-[44px] max-w-md" aria-hidden="true" />}>
        <SearchBox placeholder="Alan adı, e-posta ya da şirket ara…" className="mt-4 max-w-md" />
      </Suspense>

      <div className="mt-5 space-y-3" aria-live="polite">
        {page.items.length === 0 && (
          <div className="card p-10 text-center">
            <h2 className="font-display text-[20px]">Bu filtrede lead yok</h2>
            <p className="text-[13.5px] text-ink-muted mt-2">
              Ücretsiz araçlardan gelen her tarama ve iletişim formu buraya düşer.
            </p>
            {(status || source || q) && (
              <Link href="/admin/leads" className="btn-secondary !py-2 !px-4 text-[13px] mt-5 inline-block">
                Filtreleri temizle
              </Link>
            )}
          </div>
        )}
        {page.items.map((l) => {
          const extra = extraById.get(l.id);
          const token = extra?.lastReportToken ?? null;
          const reportHref = token && verifyReportToken(token) ? `/rapor/${token}` : null;
          return (
            <LeadCard
              key={l.id}
              owners={owners}
              lead={{
                ...l,
                contactEmail: maskEmail(l.contactEmail),
                contactPhone: maskPhone(extra?.contactPhone),
                notes: extra?.notes ?? null,
                activity: Array.isArray(extra?.activity) ? (extra!.activity as LeadActivity[]) : [],
                reportHref,
              }}
            />
          );
        })}
      </div>

      <CursorNav
        className="mt-5"
        nextCursor={page.nextCursor}
        basePath="/admin/leads"
        params={{ status, source, q, cursor }}
        shown={page.items.length}
      />
    </div>
  );
}
