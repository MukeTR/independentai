'use client';

import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const BRAND = '#4F46E5';
const POSITIVE = '#1F7A4D';

function HistogramTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const count = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border border-hairline bg-paper-3 px-3 py-2 shadow-sm">
      <div className="eyebrow mb-0.5">Sıra {label}</div>
      <div className="font-mono tabular text-[13px] text-ink">{count} cevap</div>
    </div>
  );
}

export function PositionHistogram({
  positionHistogram,
}: {
  positionHistogram: ComprehensiveAnalytics['positionHistogram'];
}) {
  const data = positionHistogram ?? [];
  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="card p-6 h-full flex flex-col">
      <div className="eyebrow">Sıralama Dağılımı</div>
      <h3 className="font-display text-[16px] mt-1">Markanız cevaplarda kaçıncı sırada anılıyor</h3>

      {hasData ? (
        <div className="mt-4 flex-1 min-h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap="22%">
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#9A968B', fontSize: 11, fontFamily: 'monospace' }}
                dy={4}
              />
              <Tooltip cursor={{ fill: '#EFEDE5', opacity: 0.6 }} content={<HistogramTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((entry) => (
                  <Cell key={entry.bucket} fill={entry.bucket === '1' ? POSITIVE : BRAND} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-faint">henüz veri yok</p>
      )}
    </div>
  );
}
