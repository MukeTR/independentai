import { Activity, Bot, Timer, DollarSign } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

export function HealthPanel({ health }: { health: ComprehensiveAnalytics['health'] }) {
  const { errorRate, mockRate, avgLatencyMs, totalCostUsd } = health;

  const errorColor =
    errorRate === 0 ? 'text-positive' : errorRate < 10 ? 'text-warning' : 'text-danger';

  const fmtPct = (n: number) =>
    `${(Math.round(n * 10) / 10).toLocaleString('tr-TR')}%`;
  const fmtMs = (n: number) =>
    `${Math.round(n).toLocaleString('tr-TR')} ms`;
  const fmtUsd = (n: number) =>
    `$${(Math.round(n * 100) / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="card p-6 h-full">
      <div className="eyebrow">Çalıştırma Sağlığı</div>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-[10px] bg-paper-4 p-4">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-brand" />
            <span className="eyebrow">Hata Oranı</span>
          </div>
          <div className={`mt-2 font-display text-[20px] tabular ${errorColor}`}>
            {fmtPct(errorRate)}
          </div>
        </div>

        <div className="rounded-[10px] bg-paper-4 p-4">
          <div className="flex items-center gap-1.5">
            <Bot className="w-4 h-4 text-brand" />
            <span className="eyebrow">Mock Yanıt</span>
          </div>
          <div className="mt-2 font-display text-[20px] tabular text-ink">
            {fmtPct(mockRate)}
          </div>
          {mockRate > 0 && (
            <div className="mt-1 text-[11px] leading-snug text-ink-faint">
              Gerçek API anahtarı eksik olabilir
            </div>
          )}
        </div>

        <div className="rounded-[10px] bg-paper-4 p-4">
          <div className="flex items-center gap-1.5">
            <Timer className="w-4 h-4 text-brand" />
            <span className="eyebrow">Ort. Gecikme</span>
          </div>
          <div className="mt-2 font-display text-[20px] tabular text-ink">
            {fmtMs(avgLatencyMs)}
          </div>
        </div>

        <div className="rounded-[10px] bg-paper-4 p-4">
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-brand" />
            <span className="eyebrow">Toplam Maliyet</span>
          </div>
          <div className="mt-2 font-display text-[20px] tabular text-ink">
            {fmtUsd(totalCostUsd)}
          </div>
        </div>
      </div>
    </div>
  );
}
