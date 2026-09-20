import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AlertTriangle, Clock, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  AxisBars,
  FindingsList,
  RecommendationCards,
  ScoreRing,
  type Axis,
  type Finding,
  type Recommendation,
} from '@/components/marketing/audit-result-view';
import { KVKK_SENTENCE } from '@/components/marketing/report-cta-row';
import {
  daysLeft,
  recordReportView,
  resolveReport,
  verdictCounts,
  verdictLine,
  type PublicReport,
  type StoredScanResult,
} from '@/server/public-report';
import { ReportActions, methodHref } from './report-actions';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ token: string }> };

/**
 * Kalıcı rapor sayfası — kayıtlı tarama sonucundan çizilir; ağ/LLM çağrısı yok.
 * Bilinmeyen/bozuk token → 404 · süresi dolmuş → 410 ekranı (App Router sayfası özel durum kodu döndüremez;
 * JSON ucu /api/rapor/[token] 410 verir) · yasaklı host → yönlendirme (allowlist sunucuda doğrulanmış).
 * robots: noindex, follow (robots.ts'e disallow eklenmez — MF-8).
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const resolved = await resolveReport(token);
  const robots = { index: false, follow: true };
  if (resolved.status !== 'ok') return { title: 'Rapor — Yanıt', robots };
  const r = resolved.report;
  const scorePart = r.waf ? 'taranamadı' : r.score == null ? '' : `${r.score}/100`;
  const title = `${r.hostname} — ${r.toolTitle} ${scorePart}`.trim();
  const description = `${verdictLine(r.result.findings)} · ${r.toolTitle} · Yanıt ile hazırlandı. ${KVKK_SENTENCE}`;
  return {
    title: `${title} — Yanıt`,
    description,
    robots,
    openGraph: { title, description, type: 'website', locale: 'tr_TR', siteName: 'Yanıt' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function ReportPage({ params }: Params) {
  const { token } = await params;
  const resolved = await resolveReport(token);
  if (resolved.status === 'missing') notFound();
  if (resolved.status === 'blocked') redirect(resolved.redirectUrl);
  if (resolved.status === 'gone') return <GonePage hostname={resolved.hostname} rescanPath={resolved.rescanPath} />;
  await recordReportView(resolved.report.scanId);
  return <ReportView report={resolved.report} />;
}

function GonePage({ hostname, rescanPath }: { hostname: string; rescanPath: string }) {
  return (
    <div className="card p-8 sm:p-10 text-center rise-1" role="status">
      <div className="eyebrow">410 · raporun süresi doldu</div>
      <h1 className="font-display text-[28px] tracking-tight mt-3">Raporun süresi doldu — yeniden tarayın</h1>
      <p className="text-[14px] text-ink-muted mt-3 max-w-md mx-auto">
        Ücretsiz tarama sonuçlarını 30 gün saklıyoruz. <span className="font-mono">{hostname}</span> için yeni bir
        tarama başlatabilirsiniz; sonuç anlık bir fotoğraftır.
      </p>
      <Link href={rescanPath} className="btn-primary inline-flex items-center gap-2 mt-6 min-h-[44px]">
        <RefreshCw className="w-4 h-4" aria-hidden /> Yeniden tara
      </Link>
      <p className="text-[12px] text-ink-faint mt-6">{KVKK_SENTENCE}</p>
    </div>
  );
}

function axesOf(result: StoredScanResult): Axis[] {
  if (Array.isArray(result.axes) && result.axes.length > 0) {
    return result.axes
      .filter((a) => a && typeof a.key === 'string')
      .map((a) => ({
        key: a.key,
        label: typeof a.label === 'string' ? a.label : a.key,
        weight: typeof a.weight === 'number' ? a.weight : 0,
        description: typeof a.description === 'string' ? a.description : '',
      }));
  }
  const breakdown = result.breakdown ?? {};
  return Object.keys(breakdown).map((key) => ({ key, label: key, weight: 0, description: '' }));
}

function findingsOf(result: StoredScanResult): Finding[] {
  if (!Array.isArray(result.findings)) return [];
  return result.findings
    .filter((f) => f && typeof f === 'object' && typeof f.title === 'string')
    .map((f) => {
      const x = f as Finding;
      return {
        category: typeof x.category === 'string' ? x.category : 'genel',
        status: x.status === 'pass' || x.status === 'warn' || x.status === 'fail' ? x.status : 'warn',
        title: x.title,
        detail: typeof x.detail === 'string' ? x.detail : '',
        fix: typeof x.fix === 'string' ? x.fix : undefined,
        evidence: typeof x.evidence === 'string' ? x.evidence : undefined,
        weight: typeof x.weight === 'number' ? x.weight : 0,
      };
    });
}

function recommendationsOf(result: StoredScanResult): Recommendation[] {
  if (!Array.isArray(result.recommendations)) return [];
  return result.recommendations.filter((r) => r && typeof r === 'object' && typeof r.title === 'string').slice(0, 5);
}

function ReportView({ report }: { report: PublicReport }) {
  const r = report.result;
  const axes = axesOf(r);
  const findings = findingsOf(r);
  const recs = recommendationsOf(r);
  const counts = verdictCounts(findings);
  const verdict = verdictLine(findings);
  const left = daysLeft(report.expiresAt);
  const when = report.createdAt.toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const scoreCaption = report.tool?.shortTitle ?? report.toolTitle;

  return (
    <article className="space-y-6">
      {/* Üst şerit */}
      <header className="rise-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="eyebrow">{report.toolTitle}</span>
          {report.partial && <span className="chip !text-[10.5px]">kısmi tarama</span>}
          {report.waf && <span className="chip !text-[10.5px]">bot koruması</span>}
          {report.sector && <span className="chip own !text-[10.5px]">sektör: {report.sector}</span>}
        </div>
        <h1 className="font-display text-[30px] sm:text-[40px] tracking-tight mt-2 break-all">{report.hostname}</h1>
        {report.meta.competitorHostname && (
          <p className="text-[14px] text-ink-muted mt-1">
            Rakip: <span className="font-mono break-all">{report.meta.competitorHostname}</span>
          </p>
        )}
        <p className="text-[12px] text-ink-faint mt-3 flex items-center gap-1.5 flex-wrap">
          <Clock className="w-3.5 h-3.5" aria-hidden />
          <time dateTime={report.createdAt.toISOString()}>{when}</time>
          <span aria-hidden>·</span>
          <span>{counts.total} kontrol</span>
          <span aria-hidden>·</span>
          <span>deterministik tarayıcı</span>
          <span aria-hidden>·</span>
          <span>hazırlık ölçer, AI davranışını değil</span>
          <span aria-hidden>·</span>
          <Link href={methodHref(report)} className="underline hover:text-ink">
            yöntem
          </Link>
        </p>
      </header>

      {/* Hüküm + skor */}
      <section className="card p-5 sm:p-7 rise-2" aria-labelledby="hukum">
        {report.waf ? (
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-warning shrink-0" aria-hidden />
            <div>
              <h2 id="hukum" className="font-display text-[22px] sm:text-[26px] tracking-tight leading-tight">
                Bot koruması nedeniyle taranamadı
              </h2>
              <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">
                Site, otomatik taramaya 403/503 döndürdü (WAF/Cloudflare imzası). Bu bir hata değil; skor verilmedi. Bot
                korumasında YanıtBot’a izin verip yeniden tarayabilirsiniz.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-10 items-center">
            <ScoreRing score={report.score ?? 0} caption={scoreCaption} />
            <div className="min-w-0">
              <h2 id="hukum" className="font-display text-[24px] sm:text-[30px] tracking-tight leading-tight">
                {verdict}
                {report.score != null && <span className="text-ink-faint"> — {report.score}/100</span>}
              </h2>
              {report.partial && (
                <p className="text-[13px] text-warning mt-2 inline-flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" aria-hidden /> Zaman bütçesi doldu; sonuç ilk kontrollerle sınırlı.
                </p>
              )}
              {axes.length > 0 && (
                <div className="mt-5">
                  <AxisBars axes={axes} breakdown={r.breakdown ?? {}} />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="rise-3">
        <ReportActions report={report} />
      </div>

      {/* Öneriler */}
      <section id="oneriler" className="rise-3 scroll-mt-6" aria-label="Öncelikli öneriler">
        <RecommendationCards items={recs} title="Önce bunları düzeltin" />
      </section>

      {/* Bulgular */}
      {findings.length > 0 && (
        <section className="rise-4" aria-labelledby="bulgular">
          <h2 id="bulgular" className="eyebrow mb-3">
            Tüm kontroller
          </h2>
          <FindingsList findings={findings} axes={axes} />
        </section>
      )}

      {/* Kıyas/kapsama gibi araçların ek tablosu — genel satır/sütun */}
      {r.extra !== undefined && r.extra !== null && (
        <section className="rise-4" aria-labelledby="ek-tablo">
          <h2 id="ek-tablo" className="eyebrow mb-3">
            Ayrıntılar
          </h2>
          <ExtraView value={r.extra} />
        </section>
      )}

      <footer className="text-[12px] text-ink-faint space-y-1.5 rise-5">
        <p>
          Bu rapor <strong className="text-ink-muted font-medium">{left} gün daha erişilebilir</strong>; süresi dolunca
          bağlantı kapanır, yeniden tarayabilirsiniz.
        </p>
        <p>{KVKK_SENTENCE}</p>
      </footer>
    </article>
  );
}

// ── Ek veri (extra) — araçtan bağımsız, genel görünüm ──

type Primitive = string | number | boolean | null;
function isPrimitive(v: unknown): v is Primitive {
  return v === null || ['string', 'number', 'boolean'].includes(typeof v);
}
function cell(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Evet' : 'Hayır';
  if (typeof v === 'number') return v.toLocaleString('tr-TR');
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}
const MAX_ROWS = 60;
const MAX_COLS = 8;

function ExtraView({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (depth > 2) return null;
  if (Array.isArray(value)) {
    const rows = value.slice(0, MAX_ROWS);
    const objects = rows.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x));
    if (objects.length === rows.length && rows.length > 0) {
      const cols: string[] = [];
      for (const o of objects) for (const k of Object.keys(o)) if (!cols.includes(k) && isPrimitive(o[k])) cols.push(k);
      const shown = cols.slice(0, MAX_COLS);
      return (
        <div className="card overflow-x-auto">
          <table className="w-full text-[13px] min-w-[480px]">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-faint border-b border-hairline">
                {shown.map((c) => (
                  <th key={c} className="px-4 py-3 font-normal">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {objects.map((o, i) => (
                <tr key={i} className="border-b border-hairline last:border-0 align-top">
                  {shown.map((c) => (
                    <td key={c} className="px-4 py-2.5 break-words">
                      {cell(o[c])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {value.length > MAX_ROWS && (
            <p className="px-4 py-2 text-[11.5px] text-ink-faint">İlk {MAX_ROWS} satır gösteriliyor.</p>
          )}
        </div>
      );
    }
    return (
      <ul className="card p-5 space-y-1.5 text-[13px]">
        {rows.map((x, i) => (
          <li key={i} className="break-words">
            {isPrimitive(x) ? cell(x) : <ExtraView value={x} depth={depth + 1} />}
          </li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const prims = entries.filter(([, v]) => isPrimitive(v));
    const rest = entries.filter(([, v]) => !isPrimitive(v));
    return (
      <div className="space-y-4">
        {prims.length > 0 && (
          <dl className="card p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
            {prims.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-hairline last:border-0 py-1.5">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="tabular text-right break-words">{cell(v)}</dd>
              </div>
            ))}
          </dl>
        )}
        {rest.map(([k, v]) => (
          <div key={k}>
            <h3 className="text-[13px] font-medium mb-2">{k}</h3>
            <ExtraView value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-[13px]">{cell(value)}</p>;
}
