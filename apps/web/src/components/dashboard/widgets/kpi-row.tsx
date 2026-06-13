import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

type Props = { kpis: ComprehensiveAnalytics['kpis'] };

function Delta({ value, unit = 'puan' }: { value: number; unit?: string }) {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-ink-faint">
        <Minus className="w-3 h-3" />
        <span className="tabular">0 {unit}</span>
      </span>
    );
  }
  const up = rounded > 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-mono ${
        up ? 'text-positive' : 'text-danger'
      }`}
    >
      <Icon className="w-3 h-3" />
      <span className="tabular">
        {up ? '+' : ''}
        {rounded} {unit}
      </span>
    </span>
  );
}

function Stat({
  label,
  value,
  delta,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-2 px-4 py-3 first:pl-0">
      <div className="eyebrow">{label}</div>
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display text-[30px] leading-none tabular text-ink">{value}</div>
      </div>
      {delta ? <div className="leading-none">{delta}</div> : <div className="h-[12px]" />}
    </div>
  );
}

export function KpiRow({ kpis }: Props) {
  const pos = kpis.avgPosition > 0 ? kpis.avgPosition.toFixed(1) : '—';

  return (
    <div className="card p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-5 gap-x-1 divide-hairline lg:divide-x">
        <Stat
          label="Görünürlük"
          value={`${Math.round(kpis.visibility)}%`}
          delta={<Delta value={kpis.visibility - kpis.visibilityPrev} unit="puan" />}
        />
        <Stat
          label="Ses Payı (SoV)"
          value={`${Math.round(kpis.sov)}%`}
          delta={<Delta value={kpis.sov - kpis.sovPrev} unit="puan" />}
        />
        <Stat label="Ort. Sıra" value={pos} />
        <Stat label="Öneri Oranı" value={`${Math.round(kpis.recommendRate)}%`} />
        <Stat label="Toplam Çalıştırma" value={kpis.totalRuns.toLocaleString('tr-TR')} />
        <Stat label="Toplam Bahis" value={kpis.totalMentions.toLocaleString('tr-TR')} />
      </div>
    </div>
  );
}
