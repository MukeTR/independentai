import { api } from '@/lib/api';
import type { DashboardMetrics } from '@independentai/shared';
import { MetricCard } from '@/components/metric-card';
import { TrendChart } from '@/components/trend-chart';

export default async function DashboardHome() {
  const metrics = await api<DashboardMetrics>('/dashboard/metrics');

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Genel Bakış</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Dashboard</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Son 30 gündeki tüm AI sorgularında markanızın konumu.
      </p>

      <div className="grid grid-cols-4 gap-5 mt-8 rise-1">
        <MetricCard
          label="Görünürlük Skoru"
          value={metrics.visibilityScore}
          suffix="%"
          tone="brand"
          hint="Markanız geçen çalıştırma oranı"
        />
        <MetricCard
          label="Share of Voice"
          value={metrics.shareOfVoice}
          suffix="%"
          hint="Rakiplerinizle birlikte toplam içindeki payınız"
        />
        <MetricCard
          label="Toplam Çalıştırma"
          value={metrics.totalRuns}
          hint="Son 30 günde model × soru"
        />
        <MetricCard
          label="Toplam Bahsetme"
          value={metrics.totalMentions}
          hint="Sizin + rakip toplam marka bahsi"
        />
      </div>

      <div className="grid grid-cols-3 gap-5 mt-6 rise-2">
        <div className="col-span-2">
          <TrendChart data={metrics.trend} />
        </div>
        <div className="card p-6">
          <div className="eyebrow">Modellere Göre Görünürlük</div>
          <ul className="mt-5 space-y-4">
            {metrics.byProvider.map((p) => (
              <li key={p.provider}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px]">{p.provider}</span>
                  <span className="font-mono text-[14px] tabular">{p.visibility}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-paper-4 mt-2 overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${p.visibility}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-6 mt-6 rise-3">
        <div className="eyebrow">En Çok Geçen Rakipler</div>
        <div className="grid grid-cols-4 gap-4 mt-5">
          {metrics.competitorBreakdown.map((c) => (
            <div key={c.name} className="border-hairline border rounded-lg p-4">
              <div className="text-[14px] truncate">{c.name}</div>
              <div className="font-display text-[26px] tabular mt-1">{c.count}</div>
              <div className="text-[11px] text-ink-faint">bahsetme</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
