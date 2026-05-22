'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';

export function TrendChart({ data }: { data: { date: string; visibility: number }[] }) {
  return (
    <div className="card p-6">
      <div className="eyebrow">Görünürlük Trendi · Son 30 gün</div>
      <div className="h-[260px] mt-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#E8E4D9" />
            <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 11, fill: '#9A968B' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9A968B' }} domain={[0, 100]} unit="%" />
            <Tooltip
              contentStyle={{
                background: '#FFFFFF',
                border: '0.5px solid #DDD9CE',
                borderRadius: 10,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}%`, 'Görünürlük']}
            />
            <Area type="monotone" dataKey="visibility" stroke="#4F46E5" strokeWidth={2} fill="url(#g)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
