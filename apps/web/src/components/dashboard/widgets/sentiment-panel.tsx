'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

type Props = {
  sentiment: ComprehensiveAnalytics['sentiment'];
  sentimentTrend: ComprehensiveAnalytics['sentimentTrend'];
};

const COLORS = {
  positive: '#1F7A4D',
  neutral: '#9A968B',
  negative: '#B43A28',
} as const;

const LEGEND = [
  { key: 'positive', label: 'Pozitif', color: COLORS.positive },
  { key: 'neutral', label: 'Nötr', color: COLORS.neutral },
  { key: 'negative', label: 'Negatif', color: COLORS.negative },
] as const;

export function SentimentPanel({ sentiment, sentimentTrend }: Props) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  const segments = [
    { color: COLORS.positive, value: sentiment.positive },
    { color: COLORS.neutral, value: sentiment.neutral },
    { color: COLORS.negative, value: sentiment.negative },
  ];

  return (
    <div className="card p-6">
      <div className="eyebrow">Duygu Analizi</div>

      {total === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">henüz duygu verisi yok</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-paper-4">
            {segments.map((s, i) =>
              s.value > 0 ? (
                <div
                  key={i}
                  style={{ width: `${pct(s.value)}%`, backgroundColor: s.color }}
                  className="h-full transition-all"
                />
              ) : null,
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            {LEGEND.map((l) => (
              <div key={l.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-[12px] text-ink-muted">{l.label}</span>
                <span className="font-mono tabular text-[12px] text-ink">
                  {sentiment[l.key]}
                </span>
              </div>
            ))}
          </div>

          {sentimentTrend.length > 0 ? (
            <div className="mt-5 h-[150px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sentimentTrend}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    {LEGEND.map((l) => (
                      <linearGradient
                        key={l.key}
                        id={`sent-${l.key}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor={l.color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={l.color} stopOpacity={0.06} />
                      </linearGradient>
                    ))}
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v: string) => String(v).slice(5)}
                    tick={{ fontSize: 10, fill: '#9A968B' }}
                    tickLine={false}
                    axisLine={{ stroke: '#E8E4D9' }}
                    minTickGap={16}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: '1px solid #DDD9CE',
                      fontSize: 12,
                      boxShadow: '0 4px 16px rgba(20,17,13,0.08)',
                    }}
                    labelStyle={{ color: '#5E5A52', fontSize: 11 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="positive"
                    name="Pozitif"
                    stackId="s"
                    stroke={COLORS.positive}
                    strokeWidth={1.5}
                    fill="url(#sent-positive)"
                  />
                  <Area
                    type="monotone"
                    dataKey="neutral"
                    name="Nötr"
                    stackId="s"
                    stroke={COLORS.neutral}
                    strokeWidth={1.5}
                    fill="url(#sent-neutral)"
                  />
                  <Area
                    type="monotone"
                    dataKey="negative"
                    name="Negatif"
                    stackId="s"
                    stroke={COLORS.negative}
                    strokeWidth={1.5}
                    fill="url(#sent-negative)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="mt-5 text-[12px] text-ink-faint">henüz veri yok</p>
          )}
        </>
      )}
    </div>
  );
}
