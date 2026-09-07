import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Sparkles, TrendingDown, TrendingUp, Minus, Clock } from 'lucide-react';
import { Logo } from '@/components/logo';
import { resolveShare, buildSharedReport, recordShareView, type SharedReport } from '@/server/report-share';

export const metadata = {
  title: 'Paylaşılan görünürlük raporu — Independent AI',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * Public, salt-okunur rapor sayfası. Token DB'de hash ile eşlenir; iptal/süre dolumu → 410 ekranı
 * (App Router sayfaları özel HTTP durum kodu döndüremez; JSON ucu /api/share/[token] 410 verir).
 * İçerikte kişisel veri yok; "Independent AI ile hazırlandı" imzası beyaz etiket olmadığını dürüstçe belirtir.
 */
export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const resolved = await resolveShare(token);
  if (resolved.status === 'missing') notFound();
  if (resolved.status === 'gone') return <GonePage />;
  const report = await buildSharedReport(resolved.share);
  await recordShareView(resolved.share.id);
  return <ReportView report={report} />;
}

function GonePage() {
  return (
    <Shell>
      <div className="card p-8 sm:p-10 text-center rise-1" role="status">
        <div className="eyebrow">410 · bağlantı geçerli değil</div>
        <h1 className="font-display text-[28px] tracking-tight mt-3">Bu rapor bağlantısı artık geçerli değil</h1>
        <p className="text-[14px] text-ink-muted mt-3 max-w-md mx-auto">
          Paylaşım linki iptal edilmiş veya süresi dolmuş. Raporu paylaşan kişiden yeni bir bağlantı isteyin.
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-5xl w-full mx-auto px-6 pt-7 flex items-center justify-between gap-4">
        <Logo />
        <span className="chip !text-[10.5px]">
          <Sparkles className="w-3 h-3 text-brand" aria-hidden /> Independent AI ile hazırlandı
        </span>
      </header>
      <main id="main" className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        {children}
      </main>
      <footer className="text-center pb-8 text-[12px] text-ink-faint">
        Bu rapor{' '}
        <Link href="/" className="underline hover:text-ink">
          Independent AI
        </Link>{' '}
        ile hazırlanmıştır · Ölçüm yöntemi:{' '}
        <Link href="/docs" className="underline hover:text-ink">
          docs/METRICS
        </Link>
      </footer>
    </div>
  );
}

function Delta({ now, prev }: { now: number; prev: number }) {
  const d = now - prev;
  if (Math.abs(d) < 1)
    return (
      <span className="text-[12px] text-ink-faint inline-flex items-center gap-1">
        <Minus className="w-3 h-3" aria-hidden /> değişim yok
      </span>
    );
  const up = d > 0;
  return (
    <span className={`text-[12px] inline-flex items-center gap-1 ${up ? 'text-positive' : 'text-danger'}`}>
      {up ? <TrendingUp className="w-3 h-3" aria-hidden /> : <TrendingDown className="w-3 h-3" aria-hidden />}
      {up ? '+' : ''}
      {d} puan (önceki dönem)
    </span>
  );
}

function Bar({ value, className = 'bg-brand' }: { value: number; className?: string }) {
  return (
    <div className="h-1.5 rounded-full bg-paper-4 overflow-hidden" aria-hidden>
      <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Trend({ points }: { points: SharedReport['trend'] }) {
  if (points.length < 2)
    return <p className="text-[12.5px] text-ink-faint">Trend için en az iki günlük ölçüm gerekir.</p>;
  const w = 600;
  const h = 120;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p.visibility / 100) * h).toFixed(1)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-32"
      role="img"
      aria-label={`Günlük görünürlük trendi, ${points.length} gün`}
    >
      <line x1="0" y1={h} x2={w} y2={h} stroke="var(--hairline)" strokeWidth="1" />
      <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="var(--hairline-2)" strokeDasharray="4 4" strokeWidth="1" />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function ReportView({ report }: { report: SharedReport }) {
  const expires = new Date(report.expiresAt);
  return (
    <Shell>
      <div className="rise-1">
        <div className="eyebrow">AI görünürlük raporu · son {report.rangeDays} gün</div>
        <h1 className="font-display text-[32px] sm:text-[40px] tracking-tight mt-2">
          {report.brandName ?? report.tenantName}
        </h1>
        {report.label && <p className="text-[14px] text-ink-muted mt-1">{report.label}</p>}
        <p className="text-[12px] text-ink-faint mt-3 inline-flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" aria-hidden /> Salt-okunur paylaşım ·{' '}
          <time dateTime={report.expiresAt}>{expires.toLocaleDateString('tr-TR')}</time> tarihine kadar geçerli
        </p>
      </div>

      {!report.hasData ? (
        <div className="card p-10 text-center mt-8 rise-2">
          <h2 className="font-display text-[20px]">Bu dönemde ölçüm verisi yok</h2>
          <p className="text-[14px] text-ink-muted mt-2">Seçilen aralıkta tamamlanmış bir çalıştırma bulunmuyor.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 rise-2">
            <div className="card p-5">
              <div className="eyebrow">Görünürlük</div>
              <div className="font-display text-[34px] tabular mt-1">{report.kpis.visibility}%</div>
              <Delta now={report.kpis.visibility} prev={report.kpis.visibilityPrev} />
            </div>
            <div className="card p-5">
              <div className="eyebrow">Share of Voice</div>
              <div className="font-display text-[34px] tabular mt-1">{report.kpis.sov}%</div>
              <Delta now={report.kpis.sov} prev={report.kpis.sovPrev} />
            </div>
            <div className="card p-5">
              <div className="eyebrow">Ortalama sıra</div>
              <div className="font-display text-[34px] tabular mt-1">{report.kpis.avgPosition || '—'}</div>
              <span className="text-[12px] text-ink-faint">düşük = iyi</span>
            </div>
            <div className="card p-5">
              <div className="eyebrow">Öneri oranı</div>
              <div className="font-display text-[34px] tabular mt-1">{report.kpis.recommendRate}%</div>
              <span className="text-[12px] text-ink-faint">{report.kpis.totalRuns} çalıştırma</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 rise-3">
            <section className="card p-6 lg:col-span-2" aria-labelledby="trend-h">
              <h2 id="trend-h" className="font-display text-[16px]">
                Günlük görünürlük trendi
              </h2>
              <p className="text-[12.5px] text-ink-muted mb-3">
                Markanın en az bir kez geçtiği geçerli çalıştırma oranı.
              </p>
              <Trend points={report.trend} />
            </section>
            <section className="card p-6" aria-labelledby="prov-h">
              <h2 id="prov-h" className="font-display text-[16px]">
                Modele göre
              </h2>
              <ul className="mt-4 space-y-3">
                {report.byProvider.map((p) => (
                  <li key={p.provider}>
                    <div className="flex justify-between text-[13px]">
                      <span>{p.provider}</span>
                      <span className="tabular text-ink-muted">{p.visibility}%</span>
                    </div>
                    <Bar value={p.visibility} />
                  </li>
                ))}
                {report.byProvider.length === 0 && <li className="text-[12.5px] text-ink-faint">Veri yok</li>}
              </ul>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 rise-4">
            <section className="card p-6" aria-labelledby="prompts-h">
              <h2 id="prompts-h" className="font-display text-[16px]">
                En iyi sorular
              </h2>
              <ul className="mt-4 divide-y divide-hairline">
                {report.topPrompts.map((p) => (
                  <li key={p.text} className="py-2.5 flex items-start justify-between gap-3">
                    <span className="text-[13px] leading-snug">{p.text}</span>
                    <span className="chip own shrink-0 tabular">{p.visibility}%</span>
                  </li>
                ))}
                {report.topPrompts.length === 0 && <li className="text-[12.5px] text-ink-faint py-2">Veri yok</li>}
              </ul>
            </section>
            <section className="card p-6" aria-labelledby="comp-h">
              <h2 id="comp-h" className="font-display text-[16px]">
                Rakipler (Share of Voice)
              </h2>
              <ul className="mt-4 space-y-3">
                {report.competitors.map((c) => (
                  <li key={c.name}>
                    <div className="flex justify-between text-[13px]">
                      <span>{c.name}</span>
                      <span className="tabular text-ink-muted">{c.sov}%</span>
                    </div>
                    <Bar value={c.sov} className="bg-danger/60" />
                  </li>
                ))}
                {report.competitors.length === 0 && <li className="text-[12.5px] text-ink-faint">Rakip bahsi yok</li>}
              </ul>
            </section>
          </div>
        </>
      )}
    </Shell>
  );
}
