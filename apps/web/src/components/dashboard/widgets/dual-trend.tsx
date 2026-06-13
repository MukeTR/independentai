'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

type DualTrendProps = {
  trend: ComprehensiveAnalytics['trend'];
};

export function DualTrend({ trend }: DualTrendProps) {
  const hasData = trend.length > 0;

  return (
    <div className="card p-6">
      <div className="eyebrow">Görünürlük &amp; Ses Payı Trendi</div>

      {hasData ? (
        <div className="mt-4 h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="dualTrendVisibility" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dualTrendSov" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B45309" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#B45309" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="2 2" stroke="#E8E4D9" vertical={false} />

              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => value.slice(5)}
                tick={{ fontSize: 11, fill: '#9A968B' }}
                tickLine={false}
                axisLine={{ stroke: '#E8E4D9' }}
                dy={6}
              />
              <YAxis
                domain={[0, 100]}
                unit="%"
                tick={{ fontSize: 11, fill: '#9A968B' }}
                tickLine={false}
                axisLine={false}
                width={48}
              />

              <Tooltip
                cursor={{ stroke: '#DDD9CE', strokeWidth: 1 }}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDD9CE',
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: '0 4px 16px rgba(20, 17, 13, 0.06)',
                }}
                labelStyle={{ color: '#5E5A52', marginBottom: 4 }}
                itemStyle={{ padding: 0 }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />

              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="plainline"
                wrapperStyle={{ fontSize: 12, color: '#5E5A52' }}
              />

              <Area
                type="monotone"
                dataKey="visibility"
                name="Görünürlük"
                stroke="#4F46E5"
                strokeWidth={2}
                fill="url(#dualTrendVisibility)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: '#4F46E5' }}
              />
              <Area
                type="monotone"
                dataKey="sov"
                name="Ses Payı"
                stroke="#B45309"
                strokeWidth={2}
                fill="url(#dualTrendSov)"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: '#B45309' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-6 flex h-[200px] items-center justify-center text-[13px] text-ink-faint">
          Henüz veri yok
        </div>
      )}
    </div>
  );
}
