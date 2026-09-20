import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { requireSuperAdmin, listSuperAdmins } from '@/server/admin';
import { prisma } from '@/server/prisma';
import { LEAD_SOURCE_LABELS, type LeadActivity } from '@/server/leads';
import { LEAD_DETAIL_SELECT, activityLabel, toLeadDetailDto } from '@/server/lead-admin';
import { signReportToken } from '@/server/report-token';
import { toolByKind } from '@/lib/tool-registry';
import { fmtDateTime } from '@/lib/admin-format';
import { StatusChip } from '@/components/admin/lead-card';
import { ScreenGuide } from '@/components/admin/screen-guide';
import { LeadActions } from '../lead-actions';

export const dynamic = 'force-dynamic';

function kindLabel(kind: string): string {
  return toolByKind(kind as Parameters<typeof toolByKind>[0])?.shortTitle ?? kind;
}

export default async function AdminLeadDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const row = await prisma.lead.findUnique({ where: { id }, select: LEAD_DETAIL_SELECT });
  if (!row) notFound();
  const lead = toLeadDetailDto(row);

  const [scans, signal, owners, ownerUser, tenant] = await Promise.all([
    lead.hostname
      ? prisma.publicScan.findMany({
          where: { hostname: lead.hostname },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, kind: true, score: true, sector: true, partial: true, createdAt: true, expiresAt: true },
        })
      : Promise.resolve([]),
    prisma.agencySignal.findFirst({
      where: {
        OR: [
          ...(lead.hostname ? [{ hostnames: { has: lead.hostname } }] : []),
          ...(lead.tenantId ? [{ subject: 'TENANT' as const, subjectId: lead.tenantId }] : []),
        ],
      },
      orderBy: { score: 'desc' },
      select: { id: true, subject: true, score: true, status: true, reasons: true, hostnames: true, computedAt: true },
    }),
    listSuperAdmins(),
    lead.ownerUserId
      ? prisma.user.findUnique({ where: { id: lead.ownerUserId }, select: { email: true } })
      : Promise.resolve(null),
    lead.tenantId ? prisma.tenant.findUnique({ where: { id: lead.tenantId }, select: { id: true, name: true } }) : null,
  ]);
  const activity: LeadActivity[] = [...lead.activity].reverse();
  const title = lead.hostname ?? lead.contactName ?? lead.company ?? 'Sitesiz lead';
  const reasons = Array.isArray(signal?.reasons) ? (signal!.reasons as { key: string; evidence?: string }[]) : [];

  return (
    <div className="max-w-5xl">
      <Link href="/admin/leads" className="text-[12px] text-ink-faint hover:text-ink">
        ← Lead’ler
      </Link>
      <div className="flex items-start justify-between gap-3 flex-wrap mt-4">
        <div className="min-w-0">
          <div className="eyebrow">Lead · {LEAD_SOURCE_LABELS[lead.source]}</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2 break-all">{title}</h1>
          <div className="flex items-center gap-2 mt-3 flex-wrap text-[12px] text-ink-muted">
            <StatusChip status={lead.status} />
            <span className="font-mono">ilk: {fmtDateTime(lead.firstSeenAt)}</span>
            <span>·</span>
            <span className="font-mono">son: {fmtDateTime(lead.lastSeenAt)}</span>
            {ownerUser && (
              <>
                <span>·</span>
                <span>sahip: {ownerUser.email}</span>
              </>
            )}
          </div>
        </div>
        <ScreenGuide className="mt-1" />
      </div>

      <div className="card p-5 mt-6">
        <LeadActions lead={lead} owners={owners} afterDelete="/admin/leads" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <section className="card p-6" aria-labelledby="lead-site">
          <h2 id="lead-site" className="eyebrow">
            Site ve tarama
          </h2>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
            <dt className="text-ink-faint">Alan adı</dt>
            <dd className="font-mono break-all">
              {lead.hostname ? (
                <a href={`https://${lead.hostname}`} target="_blank" rel="noreferrer" className="hover:text-brand-deep">
                  {lead.hostname}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-ink-faint">Tarama</dt>
            <dd className="tabular">
              {lead.scanCount} · son skor {lead.lastScore ?? '—'} · en iyi {lead.bestScore ?? '—'}
            </dd>
            <dt className="text-ink-faint">Araçlar</dt>
            <dd className="flex flex-wrap gap-1">
              {lead.kinds.length === 0 && '—'}
              {lead.kinds.map((k) => (
                <span key={k} className="chip !text-[10px]">
                  {kindLabel(k)}
                </span>
              ))}
            </dd>
            <dt className="text-ink-faint">Platform</dt>
            <dd>{lead.platform ?? '—'}</dd>
            <dt className="text-ink-faint">Sektör</dt>
            <dd>{lead.sector ?? '—'}</dd>
            <dt className="text-ink-faint">Hesap</dt>
            <dd>
              {tenant ? (
                <Link href={`/admin/tenants/${tenant.id}`} className="text-brand-deep hover:underline">
                  {tenant.name}
                </Link>
              ) : (
                'kayıtlı hesap yok'
              )}
            </dd>
          </dl>

          <h3 className="text-[11px] uppercase tracking-wider text-ink-faint font-medium mt-6">Son 5 public tarama</h3>
          {scans.length === 0 ? (
            <p className="text-[12.5px] text-ink-muted mt-2">
              Bu alan adı için saklanan tarama yok (30 gün sonra silinir).
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-hairline">
              {scans.map((s) => (
                <li key={s.id} className="py-2 flex items-center justify-between gap-3 text-[12.5px]">
                  <div className="min-w-0">
                    <div className="truncate">
                      {kindLabel(s.kind)}
                      {s.sector ? ` · ${s.sector}` : ''}
                      {s.partial ? ' · yarım' : ''}
                    </div>
                    <div className="text-[11px] text-ink-faint font-mono">{fmtDateTime(s.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="tabular font-medium">{s.score ?? '—'}</span>
                    {s.expiresAt.getTime() > Date.now() && (
                      <a
                        href={`/rapor/${signReportToken(s.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-brand-deep hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                        Raporu aç
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6" aria-labelledby="lead-contact">
          <h2 id="lead-contact" className="eyebrow">
            İletişim (KVKK)
          </h2>
          {lead.consentAt ? (
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
              <dt className="text-ink-faint">Ad</dt>
              <dd>{lead.contactName ?? '—'}</dd>
              <dt className="text-ink-faint">E-posta</dt>
              <dd className="font-mono break-all">{lead.contactEmail ?? '—'}</dd>
              <dt className="text-ink-faint">Telefon</dt>
              <dd className="font-mono">{lead.contactPhone ?? '—'}</dd>
              <dt className="text-ink-faint">Şirket</dt>
              <dd>{lead.company ?? '—'}</dd>
              <dt className="text-ink-faint">Konu</dt>
              <dd>{lead.topic ?? '—'}</dd>
              <dt className="text-ink-faint">Onay</dt>
              <dd className="font-mono text-[12px]">
                KVKK {fmtDateTime(lead.consentAt)} · İYS {lead.iysConsentAt ? fmtDateTime(lead.iysConsentAt) : 'yok'}
              </dd>
              {lead.utm && (
                <>
                  <dt className="text-ink-faint">Kaynak</dt>
                  <dd className="font-mono text-[11.5px] break-all">
                    {Object.entries(lead.utm)
                      .filter(([, v]) => v != null && v !== '')
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join(' · ') || '—'}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="text-[12.5px] text-ink-muted mt-3">
              İletişim bilgisi yok — bu lead yalnız araç taramasından geldi (kişisel veri tutulmaz).
            </p>
          )}
          {lead.message && lead.consentAt && (
            <blockquote className="mt-4 text-[13px] bg-paper-2 rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
              {lead.message}
            </blockquote>
          )}
          <p className="text-[11px] text-ink-faint mt-3">
            E-posta/telefon maskeli gösterilir; “E-postayı göster” denetim kaydına yazılır.
          </p>

          {signal && (
            <div className="mt-6">
              <h3 className="text-[11px] uppercase tracking-wider text-ink-faint font-medium">Ajans sinyali</h3>
              <p className="text-[13px] mt-1">
                skor <span className="font-medium tabular">{signal.score}</span> · {signal.status} · {signal.subject}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {reasons.map((r) => (
                  <span key={r.key} className="chip !text-[10px]" title={r.evidence}>
                    {r.key}
                  </span>
                ))}
              </div>
              {signal.hostnames.length > 0 && (
                <p className="text-[11.5px] text-ink-muted font-mono mt-2 break-all">{signal.hostnames.join(' · ')}</p>
              )}
              <Link
                href="/admin/agency-candidates"
                className="text-[12px] text-brand-deep hover:underline mt-2 inline-block"
              >
                Ajans adayları →
              </Link>
            </div>
          )}
        </section>
      </div>

      <section className="card p-6 mt-5" aria-labelledby="lead-activity">
        <h2 id="lead-activity" className="eyebrow">
          Aktivite günlüğü ({activity.length})
        </h2>
        {lead.notes && (
          <div className="mt-3 text-[13px] bg-paper-2 rounded-lg px-3 py-2 whitespace-pre-wrap">
            <span className="text-[11px] uppercase tracking-wider text-ink-faint font-medium block mb-1">
              Kalıcı not
            </span>
            {lead.notes}
          </div>
        )}
        {activity.length === 0 ? (
          <p className="text-[12.5px] text-ink-muted mt-3">Henüz aktivite yok.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-[13px]">
            {activity.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-ink-faint font-mono text-[12px] whitespace-nowrap">{fmtDateTime(a.at)}</span>
                <span className="font-medium">{activityLabel(a.action)}</span>
                {a.note && <span className="text-ink-muted">— {a.note}</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
