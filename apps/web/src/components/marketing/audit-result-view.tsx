'use client';

/**
 * Commerce denetim sonuçlarının ortak görsel parçaları: skor halkası, eksen çubukları (ağırlıklarla),
 * bulgu listesi (pass/warn/fail), öneri kartları, platform rozeti + bağlama CTA'sı.
 * Üç araç (mağaza, ürün sayfası, crawler) ve panel kopyaları bunları paylaşır.
 */
import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Plug, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type FindingStatus = 'pass' | 'warn' | 'fail';
export type Finding = {
  category: string;
  status: FindingStatus;
  title: string;
  detail: string;
  fix?: string;
  evidence?: string;
  weight: number;
};
export type Axis = { key: string; label: string; weight: number; description: string };
export type Recommendation = {
  title: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  impact: 'Yüksek' | 'Orta' | 'Düşük';
  detail: string;
  category: string;
  steps?: string[];
};
export type Platform = {
  platform: string;
  label: string;
  confidence: number;
  evidence: string[];
  connectorAvailable: boolean;
};

export function scoreColor(score: number): string {
  return score >= 70 ? '#10B981' : score >= 45 ? '#F59E0B' : '#E11D48';
}

export function scoreLabel(score: number): string {
  if (score >= 85) return 'Çok iyi';
  if (score >= 70) return 'İyi';
  if (score >= 45) return 'Geliştirilebilir';
  return 'Zayıf';
}

export function ScoreRing({ score, caption, size = 150 }: { score: number; caption: string; size?: number }) {
  const r = size * 0.37;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = scoreColor(score);
  return (
    <figure className="flex flex-col items-center" aria-label={`${caption}: ${score}/100 (${scoreLabel(score)})`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E1D8" strokeWidth={size * 0.07} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={size * 0.07}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display tabular leading-none" style={{ color, fontSize: size * 0.26 }}>
            {score}
          </span>
          <span className="text-[10px] text-ink-faint mt-1">/100</span>
        </div>
      </div>
      <figcaption className="text-[13px] text-ink-muted mt-3">{caption}</figcaption>
      <div className="text-[11.5px] font-medium mt-0.5" style={{ color }}>
        {scoreLabel(score)}
      </div>
    </figure>
  );
}

export function AxisBars({ axes, breakdown }: { axes: Axis[]; breakdown: Record<string, number> }) {
  return (
    <ul className="space-y-3.5" aria-label="Eksen kırılımı">
      {axes.map((a) => {
        const v = breakdown[a.key] ?? 0;
        return (
          <li key={a.key} className="flex items-center gap-3">
            <div className="w-[160px] shrink-0">
              <div className="text-[13px] leading-tight">{a.label}</div>
              <div className="text-[10.5px] text-ink-faint font-mono">ağırlık %{a.weight}</div>
            </div>
            <div
              className="flex-1 h-2 rounded-full bg-paper-4 overflow-hidden"
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              aria-label={a.label}
            >
              <div className={barColor(v)} style={{ width: `${v}%` }} />
            </div>
            <div className="w-10 text-right font-mono text-[12.5px] tabular">{v}</div>
          </li>
        );
      })}
    </ul>
  );
}

function barColor(v: number): string {
  const base = 'h-full rounded-full transition-all duration-500 ';
  if (v >= 70) return base + 'bg-positive';
  if (v >= 45) return base + 'bg-warning';
  return base + 'bg-danger';
}

export function StatusIcon({ status, className }: { status: FindingStatus; className?: string }) {
  const cls = cn('w-4 h-4 shrink-0 mt-0.5', className);
  if (status === 'pass') return <CheckCircle2 className={cn(cls, 'text-positive')} aria-label="Geçti" />;
  if (status === 'warn') return <AlertTriangle className={cn(cls, 'text-warning')} aria-label="Uyarı" />;
  return <XCircle className={cn(cls, 'text-danger')} aria-label="Başarısız" />;
}

export function FindingsList({ findings, axes }: { findings: Finding[]; axes: Axis[] }) {
  const label = new Map(axes.map((a) => [a.key, a.label]));
  const grouped = findings.reduce<Record<string, Finding[]>>((acc, f) => {
    (acc[f.category] ??= []).push(f);
    return acc;
  }, {});
  const order = axes.map((a) => a.key).filter((k) => grouped[k]);
  for (const k of Object.keys(grouped)) if (!order.includes(k)) order.push(k);
  const counts = (items: Finding[]) => ({
    pass: items.filter((f) => f.status === 'pass').length,
    warn: items.filter((f) => f.status === 'warn').length,
    fail: items.filter((f) => f.status === 'fail').length,
  });
  return (
    <div className="space-y-4">
      {order.map((cat) => {
        const items = grouped[cat] ?? [];
        const c = counts(items);
        return (
          <details key={cat} className="card p-0 overflow-hidden group" open={c.fail > 0 || c.warn > 0}>
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none hover:bg-paper-2">
              <div className="flex items-center gap-3">
                <ChevronDown
                  className="w-4 h-4 text-ink-faint transition-transform group-open:rotate-180"
                  aria-hidden
                />
                <span className="font-display text-[15px]">{label.get(cat) ?? cat}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                {c.fail > 0 && <span className="text-danger">{c.fail} hata</span>}
                {c.warn > 0 && <span className="text-warning">{c.warn} uyarı</span>}
                {c.pass > 0 && <span className="text-positive">{c.pass} geçti</span>}
              </div>
            </summary>
            <ul className="px-5 pb-5 space-y-3 border-t border-hairline pt-4">
              {items.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <StatusIcon status={f.status} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] text-ink">{f.title}</div>
                    <div className="text-[12.5px] text-ink-muted mt-0.5 leading-relaxed">{f.detail}</div>
                    {f.evidence && (
                      <div className="text-[11px] text-ink-faint font-mono mt-1 break-all">Kanıt: {f.evidence}</div>
                    )}
                    {f.fix && f.status !== 'pass' && (
                      <div className="text-[12.5px] text-brand-deep mt-1">→ {f.fix}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

const IMPACT_CLASS: Record<Recommendation['impact'], string> = {
  Yüksek: 'bg-danger/10 text-danger',
  Orta: 'bg-warning/10 text-warning',
  Düşük: 'bg-paper-4 text-ink-muted',
};

export function RecommendationCards({
  items,
  title = 'Öncelikli öneriler',
}: {
  items: Recommendation[];
  title?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="card p-5 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-positive shrink-0" aria-hidden />
        <div className="text-[13.5px]">Puanı etkileyen açık bir eksik bulunmadı. Düzenli olarak yeniden test edin.</div>
      </div>
    );
  }
  return (
    <section aria-labelledby="rec-title">
      <h3 id="rec-title" className="eyebrow mb-3">
        {title}
      </h3>
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((r, i) => (
          <li key={i} className="card p-5 flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
              <span className={cn('text-[10.5px] rounded px-1.5 py-0.5', IMPACT_CLASS[r.impact])}>
                Etki: {r.impact}
              </span>
              <span className="text-[10.5px] rounded px-1.5 py-0.5 bg-paper-4 text-ink-muted">
                Zorluk: {r.difficulty}
              </span>
            </div>
            <div className="font-display text-[15px] mt-2.5 leading-snug">{r.title}</div>
            <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">{r.detail}</p>
            {r.steps && r.steps.length > 0 && <Steps steps={r.steps} />}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Steps({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-[12px] text-brand-deep inline-flex items-center gap-1 hover:text-brand"
      >
        Nasıl yapılır?{' '}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <ol className="mt-2 space-y-1.5 list-decimal list-inside text-[12.5px] text-ink-muted leading-relaxed">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

const CONNECTOR_SLUG: Record<string, string> = { SHOPIFY: 'shopify', IKAS: 'ikas', TICIMAX: 'ticimax' };

export function PlatformBadge({
  platform,
  variant = 'public',
}: {
  platform: Platform;
  variant?: 'public' | 'dashboard';
}) {
  const slug = CONNECTOR_SLUG[platform.platform];
  const pct = Math.round(platform.confidence * 100);
  return (
    <div className="rounded-xl border border-hairline bg-paper-2/60 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="eyebrow">Platform</span>
        <span className="chip own !text-[11px]">{platform.label}</span>
        {platform.platform !== 'UNKNOWN' && <span className="text-[11px] text-ink-faint font-mono">güven %{pct}</span>}
      </div>
      {platform.evidence.length > 0 && (
        <div className="text-[11.5px] text-ink-faint mt-2">Kanıt: {platform.evidence.slice(0, 3).join(' · ')}</div>
      )}
      {platform.platform === 'UNKNOWN' && (
        <div className="text-[12px] text-ink-muted mt-2">
          Platformu herkese açık sinyallerden tespit edemedik; bu, sonucu etkilemez.
        </div>
      )}
      {slug ? (
        <Link
          href={variant === 'dashboard' ? '/dashboard/integrations' : `/solutions/${slug}`}
          className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-brand-deep hover:text-brand"
        >
          <Plug className="w-3.5 h-3.5" aria-hidden />
          {variant === 'dashboard'
            ? `${platform.label} mağazanı bağla — katalog verisiyle sürekli izleme`
            : `Independent AI ile ${platform.label} mağazanı bağla`}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      ) : (
        variant === 'public' && (
          <Link
            href="/register"
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-brand-deep hover:text-brand"
          >
            Markanı AI cevaplarında izlemeye başla <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        )
      )}
    </div>
  );
}

export function StatChips({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <dl className="flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.label} className="rounded-lg border border-hairline px-2.5 py-1.5 bg-paper-3">
          <dt className="text-[10px] text-ink-faint font-mono uppercase tracking-wider">{it.label}</dt>
          <dd className="text-[13px] tabular">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ScanMeta({
  fetchedAt,
  cached,
  partial,
  finalUrl,
}: {
  fetchedAt: string;
  cached?: boolean;
  partial?: boolean;
  finalUrl?: string;
}) {
  const d = new Date(fetchedAt);
  const when = Number.isNaN(d.getTime())
    ? fetchedAt
    : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <p className="text-[11.5px] text-ink-faint">
      Tarama: {when}
      {cached && ' · önbellekten (son 10 dk)'}
      {partial && ' · zaman bütçesi nedeniyle kısmi'}
      {finalUrl && (
        <>
          {' '}
          · <span className="break-all">{finalUrl}</span>
        </>
      )}
    </p>
  );
}
