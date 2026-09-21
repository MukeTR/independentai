import Link from 'next/link';
import { ExternalLink, Ban, Inbox } from 'lucide-react';
import type { AuditKind } from '@independentai/db';
import { requireSuperAdmin } from '@/server/admin';
import { getScanStats, type RecentScan } from '@/server/admin-stats';
import { signReportToken } from '@/server/report-token';
import { toolByKind } from '@/lib/tool-registry';
import { KpiTile } from '@/components/admin/kpi-tile';
import { DataTable, type DataColumn } from '@/components/admin/data-table';
import { ScreenGuide } from '@/components/admin/screen-guide';
import { fmtDateTime, fmtDayKey, fmtPercent } from '@/lib/admin-format';

export const dynamic = 'force-dynamic';

const KIND_FALLBACK: Partial<Record<AuditKind, string>> = { GEO: 'GEO denetimi', CONTENT: 'İçerik denetimi' };

function kindLabel(kind: AuditKind): string {
  return toolByKind(kind)?.shortTitle ?? KIND_FALLBACK[kind] ?? kind;
}

export default async function AdminScans() {
  await requireSuperAdmin();
  const s = await getScanStats();
  const dayTotals = s.days.map((d) => s.kinds.reduce((a, k) => a + (s.matrix[k]?.[d] ?? 0), 0));
  const total14 = dayTotals.reduce((a, b) => a + b, 0);

  const recentColumns: DataColumn<RecentScan>[] = [
    {
      key: 'at',
      header: 'Zaman',
      cell: (r) => (
        <span className="font-mono text-[11px] text-ink-faint whitespace-nowrap">{fmtDateTime(r.createdAt)}</span>
      ),
    },
    { key: 'kind', header: 'Araç', cell: (r) => <span className="chip !text-[10px]">{kindLabel(r.kind)}</span> },
    { key: 'host', header: 'Site', cell: (r) => <span className="font-mono text-[12px] break-all">{r.hostname}</span> },
    {
      key: 'score',
      header: 'Skor',
      align: 'right',
      cell: (r) => <span className="font-medium">{r.score ?? '—'}</span>,
    },
    {
      key: 'flags',
      header: 'Durum',
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.sector && <span className="chip !text-[10px]">{r.sector}</span>}
          {r.partial && <span className="chip !text-[10px] text-warning">yarım</span>}
          {r.waf && <span className="chip !text-[10px] text-danger">WAF</span>}
          {r.tenantId && <span className="chip own !text-[10px]">oturumlu</span>}
        </span>
      ),
    },
    { key: 'actions', header: 'Aksiyonlar', align: 'right', cell: (r) => <RowActions r={r} /> },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Super Admin</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Taramalar</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Ücretsiz araç kullanımı: araç × gün, en çok taranan siteler, sektörler, yarım/WAF oranı. Ham URL ve IP
            tutulmaz.
          </p>
        </div>
        <ScreenGuide className="mt-1" />
      </div>

      <section aria-label="Özet" className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <KpiTile label="Son 14 gün" value={total14} sparkline={dayTotals} sparklineLabel="Günlük tarama" tone="brand" />
        <KpiTile label="Son 30 gün" value={s.total30d} hint="tüm araçlar" />
        <KpiTile
          label="Yarım oranı · 30 gün"
          value={fmtPercent(s.total30d ? s.partial30d / s.total30d : 0)}
          hint={`${s.partial30d.toLocaleString('tr-TR')} tarama bütçeye takıldı`}
          tone={s.total30d && s.partial30d / s.total30d > 0.2 ? 'warning' : 'default'}
        />
        <KpiTile
          label="WAF oranı · 30 gün"
          value={fmtPercent(s.total30d ? s.waf30d / s.total30d : 0)}
          hint={`${s.waf30d.toLocaleString('tr-TR')} tarama bot korumasına takıldı`}
          tone={s.total30d && s.waf30d / s.total30d > 0.2 ? 'warning' : 'default'}
        />
      </section>

      <section className="card overflow-hidden mt-8" aria-labelledby="kind-day">
        <div className="px-5 py-4 border-b border-hairline flex items-center justify-between">
          <h2 id="kind-day" className="eyebrow">
            Araç × gün (son 14 gün)
          </h2>
          <span className="text-[11px] text-ink-faint">gün sınırı TSİ</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]" style={{ minWidth: 720 }}>
            <caption className="sr-only">Araç türüne göre günlük tarama sayısı</caption>
            <thead className="bg-paper-2 text-[10.5px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-medium sticky left-0 bg-paper-2">
                  Araç
                </th>
                {s.days.map((d) => (
                  <th key={d} scope="col" className="px-2 py-2.5 text-right font-medium whitespace-nowrap">
                    {fmtDayKey(d)}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {s.kinds.length === 0 && (
                <tr>
                  <td colSpan={s.days.length + 2} className="text-center py-10 text-ink-muted">
                    Son 14 günde public tarama yok.
                  </td>
                </tr>
              )}
              {s.kinds.map((k) => {
                const row = s.matrix[k] ?? {};
                const sum = s.days.reduce((a, d) => a + (row[d] ?? 0), 0);
                return (
                  <tr key={k} className="hover:bg-paper-2/50">
                    <th
                      scope="row"
                      className="px-4 py-2 text-left font-medium sticky left-0 bg-paper-3 whitespace-nowrap"
                    >
                      {kindLabel(k)}
                    </th>
                    {s.days.map((d) => (
                      <td key={d} className="px-2 py-2 text-right tabular text-ink-muted">
                        {row[d] ? row[d] : <span className="text-ink-faint/50">·</span>}
                      </td>
                    ))}
                    <td className="px-4 py-2 text-right tabular font-medium">{sum}</td>
                  </tr>
                );
              })}
            </tbody>
            {s.kinds.length > 0 && (
              <tfoot className="bg-paper-2/60">
                <tr>
                  <th scope="row" className="px-4 py-2 text-left font-medium sticky left-0 bg-paper-2">
                    Toplam
                  </th>
                  {dayTotals.map((n, i) => (
                    <td key={s.days[i]} className="px-2 py-2 text-right tabular font-medium">
                      {n || ''}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right tabular font-medium">{total14}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
        <section className="card p-5" aria-labelledby="top-hosts">
          <h2 id="top-hosts" className="eyebrow">
            En çok taranan 20 site · 30 gün
          </h2>
          {s.topHosts.length === 0 ? (
            <p className="text-[12.5px] text-ink-muted mt-3">Henüz tarama yok.</p>
          ) : (
            <ol className="mt-3 divide-y divide-hairline">
              {s.topHosts.map((h, i) => (
                <li key={h.hostname} className="py-2 flex items-center justify-between gap-3 text-[12.5px]">
                  <div className="min-w-0 flex items-baseline gap-2">
                    <span className="text-ink-faint tabular w-5 shrink-0">{i + 1}.</span>
                    <span className="font-mono truncate">{h.hostname}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="tabular font-medium">{h.n}</span>
                    <Link
                      href={`/admin/leads?q=${encodeURIComponent(h.hostname)}`}
                      className="text-brand-deep hover:underline inline-flex items-center gap-1"
                    >
                      <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
                      Lead
                    </Link>
                    <Link
                      href={`/admin/blocked-sites?hostname=${encodeURIComponent(h.hostname)}`}
                      className="text-ink-faint hover:text-danger inline-flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" aria-hidden="true" />
                      Yasakla
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-5" aria-labelledby="sectors">
          <h2 id="sectors" className="eyebrow">
            Sektör dağılımı · 30 gün
          </h2>
          {s.sectors.length === 0 ? (
            <p className="text-[12.5px] text-ink-muted mt-3">
              Sektör seçilen tarama yok (satın alma sorusu kapsama aracı sektör ister).
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {s.sectors.map((x) => {
                const max = s.sectors[0]?.n ?? 1;
                return (
                  <li key={x.sector} className="text-[12.5px]">
                    <div className="flex items-center justify-between">
                      <span>{x.sector}</span>
                      <span className="tabular font-medium">{x.n}</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full bg-paper-4 mt-1"
                      role="meter"
                      aria-valuemin={0}
                      aria-valuemax={max}
                      aria-valuenow={x.n}
                      aria-label={`${x.sector}: ${x.n} tarama`}
                    >
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.max(4, (x.n / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <h2 className="eyebrow mt-8 mb-3">Son 50 tarama</h2>
      <DataTable
        caption="Son taramalar"
        columns={recentColumns}
        rows={s.recent}
        rowKey={(r) => r.id}
        empty="Henüz tarama yok."
        minWidth={860}
        mobileRow={(r) => (
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[12px] break-all">{r.hostname}</span>
              <span className="font-medium tabular">{r.score ?? '—'}</span>
            </div>
            <div className="text-[11px] text-ink-faint mt-1">
              {kindLabel(r.kind)} · {fmtDateTime(r.createdAt)}
              {r.partial ? ' · yarım' : ''}
              {r.waf ? ' · WAF' : ''}
            </div>
            <div className="mt-2">
              <RowActions r={r} />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function RowActions({ r }: { r: RecentScan }) {
  return (
    <span className="inline-flex flex-wrap gap-2 text-[12px] justify-end">
      <a
        href={`/rapor/${signReportToken(r.id)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-brand-deep hover:underline whitespace-nowrap"
      >
        <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        Raporu aç
      </a>
      <Link
        href={`/admin/leads?q=${encodeURIComponent(r.hostname)}`}
        className="inline-flex items-center gap-1 text-ink-muted hover:text-ink whitespace-nowrap"
      >
        <Inbox className="w-3.5 h-3.5" aria-hidden="true" />
        Lead’e git
      </Link>
      <Link
        href={`/admin/blocked-sites?hostname=${encodeURIComponent(r.hostname)}`}
        className="inline-flex items-center gap-1 text-ink-faint hover:text-danger whitespace-nowrap"
      >
        <Ban className="w-3.5 h-3.5" aria-hidden="true" />
        Yasakla
      </Link>
    </span>
  );
}
