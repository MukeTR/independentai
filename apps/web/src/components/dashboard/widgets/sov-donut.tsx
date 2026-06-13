'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

const COMPETITOR_COLORS = ['#E11D48', '#F59E0B', '#0EA5E9', '#7C3AED', '#64748B'];
const BRAND = '#4F46E5';
const OTHER = '#EFEDE5';

type Slice = { name: string; value: number; color: string };

function clampPct(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(100, n);
}

export function SovDonut({
  ownSov,
  competitors,
}: {
  ownSov: number;
  competitors: ComprehensiveAnalytics['competitors'];
}) {
  const own = clampPct(ownSov);

  const top = [...(competitors ?? [])]
    .sort((a, b) => b.sov - a.sov)
    .slice(0, 5)
    .map((c, i) => ({
      name: c.name,
      value: clampPct(c.sov),
      color: COMPETITOR_COLORS[i % COMPETITOR_COLORS.length] ?? OTHER,
    }));

  const accounted = top.reduce((sum, s) => sum + s.value, own);
  const remainder = Math.max(0, 100 - accounted);

  const slices: Slice[] = [
    { name: 'Markanız', value: own, color: BRAND },
    ...top,
  ];
  if (remainder > 0.5) {
    slices.push({ name: 'Diğer', value: remainder, color: OTHER });
  }

  const hasData = slices.some((s) => s.value > 0);

  return (
    <div className="card p-6 h-full">
      <div className="eyebrow">Ses Payı Dağılımı</div>

      {!hasData ? (
        <p className="mt-6 text-sm text-ink-faint">henüz veri yok</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
          <div className="relative h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={1.5}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {slices.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    borderRadius: 10,
                    border: '1px solid #DDD9CE',
                    background: '#FFFFFF',
                    fontSize: 12,
                    boxShadow: '0 4px 16px rgba(20,17,13,0.08)',
                    padding: '8px 10px',
                  }}
                  itemStyle={{ color: '#14110D', padding: 0 }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display tabular text-[28px] leading-none text-ink">
                {own.toFixed(1)}%
              </span>
              <span className="mt-1 text-[11px] text-ink-faint">sizin payınız</span>
            </div>
          </div>

          <ul className="space-y-2">
            {slices.map((s) => (
              <li
                key={s.name}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="truncate text-ink-muted">{s.name}</span>
                </span>
                <span className="tabular font-mono text-[12px] text-ink">
                  {s.value.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
