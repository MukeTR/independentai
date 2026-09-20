import Link from 'next/link';
import type { AgencySignalStatus } from '@independentai/db';
import { requireSuperAdmin } from '@/server/authz';
import { prisma } from '@/server/prisma';
import { maskEmail } from '@/server/logger';
import { AGENCY_THRESHOLDS, type AgencyReason } from '@/server/agency-signal';
import { AGENCY_REASON_LABELS, AGENCY_STATUS_KEYS, AGENCY_STATUS_LABELS, isAgencyStatusKey } from '@/lib/agency-labels';
import { MetricCard } from '@/components/metric-card';
import { CandidateActions } from './candidate-actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ajans adayları — Admin', robots: { index: false, follow: false } };

const fmt = (d: Date) =>
  d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' });

const STATUS_TONE: Record<AgencySignalStatus, string> = {
  CANDIDATE: 'bg-amber-500/10 text-amber-700',
  CONTACTED: 'bg-brand-glow text-brand-deep',
  CONVERTED: 'bg-emerald-500/10 text-emerald-700',
  DISMISSED: 'bg-paper-4 text-ink-muted',
  DECLARED: 'bg-emerald-500/10 text-emerald-700',
};

/**
 * /admin/agency-candidates — skor ≥50 adaylar (nedenler, host listesi, tenant linki, maskeli e-posta, aksiyonlar)
 * + "Zaten ajans" sekmesi (Tenant.kind=AGENCY / AgencyAccount). Ham IP/UA yok; ziyaretçi = pseudonim hash.
 */
export default async function AdminAgencyCandidates({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; tab?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const tab = sp.tab === 'already' ? 'already' : 'candidates';
  const status = isAgencyStatusKey(sp.status) ? sp.status : null;

  const [rows, counts, agencies] = await Promise.all([
    prisma.agencySignal.findMany({
      where: { score: { gte: AGENCY_THRESHOLDS.candidate }, ...(status ? { status } : {}) },
      orderBy: [{ score: 'desc' }, { computedAt: 'desc' }],
      take: 100,
      select: {
        id: true,
        subject: true,
        subjectId: true,
        score: true,
        reasons: true,
        hostnames: true,
        status: true,
        note: true,
        declaredAt: true,
        computedAt: true,
      },
    }),
    prisma.agencySignal.groupBy({
      by: ['status'],
      where: { score: { gte: AGENCY_THRESHOLDS.candidate } },
      _count: { _all: true },
    }),
    tab === 'already'
      ? prisma.agencyAccount.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            name: true,
            website: true,
            plan: true,
            createdAt: true,
            tenantId: true,
            _count: { select: { workspaces: true, memberships: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const tenantIds = rows.filter((r) => r.subject === 'TENANT').map((r) => r.subjectId);
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: {
          id: true,
          name: true,
          website: true,
          industry: true,
          users: { select: { email: true }, orderBy: { createdAt: 'asc' }, take: 1 },
        },
      })
    : [];
  const tenantById = new Map(tenants.map((t) => [t.id, t]));
  const countByStatus = new Map(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((a, c) => a + c._count._all, 0);

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Ajans adayları</h1>
      <p className="text-[14px] text-ink-muted mt-2 max-w-2xl">
        Ürünü ajans gibi (birden çok müşteri sitesi için) kullanan hesaplar ve ziyaretçiler. Skor ≥
        {AGENCY_THRESHOLDS.candidate} aday, ≥{AGENCY_THRESHOLDS.band} olan hesaplarda panelde “Ben ajansım” bandı
        görünür. Amaç: Yanıt Agency ortaklık programına yönlendirmek.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
        <MetricCard label="Aday (≥50)" value={total} tone="brand" />
        <MetricCard label="Beyan etti" value={countByStatus.get('DECLARED') ?? 0} tone="positive" />
        <MetricCard label="İletişime geçildi" value={countByStatus.get('CONTACTED') ?? 0} />
        <MetricCard label="Dönüştü" value={countByStatus.get('CONVERTED') ?? 0} tone="positive" />
      </div>

      <nav aria-label="Sekmeler" className="flex flex-wrap gap-2 mt-8">
        <Link
          href="/admin/agency-candidates"
          aria-current={tab === 'candidates' && !status ? 'page' : undefined}
          className={`chip ${tab === 'candidates' && !status ? 'own' : ''}`}
        >
          Tümü · {total}
        </Link>
        {AGENCY_STATUS_KEYS.map((s) => (
          <Link
            key={s}
            href={`/admin/agency-candidates?status=${s}`}
            aria-current={status === s ? 'page' : undefined}
            className={`chip ${status === s ? 'own' : ''}`}
          >
            {AGENCY_STATUS_LABELS[s]} · {countByStatus.get(s) ?? 0}
          </Link>
        ))}
        <Link
          href="/admin/agency-candidates?tab=already"
          aria-current={tab === 'already' ? 'page' : undefined}
          className={`chip ${tab === 'already' ? 'own' : ''}`}
        >
          Zaten ajans
        </Link>
      </nav>

      {tab === 'already' ? (
        <div className="card mt-6 overflow-hidden">
          <div className="p-5 border-b border-hairline">
            <div className="eyebrow">Ajans hesapları</div>
            <p className="text-[12.5px] text-ink-muted mt-1">
              Ajans hesabı açmış tenant'lar (AgencyAccount). Bunlar için sinyal hesaplanmaz.
            </p>
          </div>
          <ul className="divide-y divide-hairline">
            {agencies.length === 0 && (
              <li className="p-8 text-center text-ink-muted text-[14px]">Henüz ajans hesabı yok.</li>
            )}
            {agencies.map((a) => (
              <li key={a.id} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/tenants/${a.tenantId}`} className="text-[14px] hover:text-brand-deep">
                    {a.name}
                  </Link>
                  <div className="text-[11px] text-ink-faint font-mono mt-0.5">
                    {a.website ?? 'site yok'} · plan {a.plan} · {a._count.workspaces} müşteri · {a._count.memberships}{' '}
                    üye
                  </div>
                </div>
                <div className="text-[11px] text-ink-faint font-mono">{fmt(a.createdAt)}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="mt-6 space-y-4" aria-label="Ajans adayları">
          {rows.length === 0 && (
            <li className="card p-10 text-center text-ink-muted text-[14px]">
              Bu filtrede aday yok. Sinyaller her public taramada ve gece bakımında yeniden hesaplanır.
            </li>
          )}
          {rows.map((r) => {
            const t = r.subject === 'TENANT' ? tenantById.get(r.subjectId) : undefined;
            const reasons = Array.isArray(r.reasons) ? (r.reasons as unknown as AgencyReason[]) : [];
            return (
              <li key={r.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-[26px] tabular text-brand leading-none">{r.score}</span>
                      <span className={`chip !text-[10px] ${STATUS_TONE[r.status]}`}>
                        {AGENCY_STATUS_LABELS[r.status]}
                      </span>
                      <span className="chip !text-[10px]">{r.subject === 'TENANT' ? 'Hesap' : 'Ziyaretçi'}</span>
                    </div>
                    <div className="mt-2 text-[14px]">
                      {r.subject === 'TENANT' ? (
                        t ? (
                          <Link href={`/admin/tenants/${t.id}`} className="hover:text-brand-deep">
                            {t.name}
                          </Link>
                        ) : (
                          <span className="text-ink-muted">Silinmiş hesap</span>
                        )
                      ) : (
                        <span
                          className="font-mono text-[12.5px] text-ink-muted"
                          title="Pseudonim ziyaretçi kimliği (ham IP saklanmaz)"
                        >
                          ziyaretçi · {r.subjectId.slice(0, 12)}…
                        </span>
                      )}
                    </div>
                    {t && (
                      <div className="text-[11.5px] text-ink-faint font-mono mt-0.5">
                        {t.website ?? 'site yok'} · {maskEmail(t.users[0]?.email) ?? 'e-posta yok'}
                        {t.industry ? ` · sektör: ${t.industry}` : ''}
                      </div>
                    )}
                    <ul className="flex flex-wrap gap-1.5 mt-3" aria-label="Nedenler">
                      {reasons.map((x) => (
                        <li key={x.key} className="chip !text-[10.5px]" title={x.evidence}>
                          {AGENCY_REASON_LABELS[x.key] ?? x.key} · +{x.weight}
                        </li>
                      ))}
                      {reasons.length === 0 && <li className="text-[12px] text-ink-faint">Neden kaydı yok</li>}
                    </ul>
                    {r.hostnames.length > 0 && (
                      <p className="text-[11.5px] text-ink-muted font-mono mt-2 break-words">
                        {r.hostnames.slice(0, 8).join(' · ')}
                        {r.hostnames.length > 8 ? ` · +${r.hostnames.length - 8}` : ''}
                      </p>
                    )}
                    <div className="text-[10.5px] text-ink-faint font-mono mt-2">
                      hesaplandı {fmt(r.computedAt)}
                      {r.declaredAt ? ` · beyan ${fmt(r.declaredAt)}` : ''}
                    </div>
                  </div>
                  <CandidateActions id={r.id} status={r.status} note={r.note} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
