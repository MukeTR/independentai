'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { RadarEntity } from '@/server/insights';

const COLORS = ['#4F46E5', '#E11D48', '#F59E0B', '#0EA5E9'];

export function CompetitorRadar({ entities, axes }: { entities: RadarEntity[]; axes: string[] }) {
  // recharts formatı: her axis bir satır, her entity bir kolon
  const keyFor = (e: RadarEntity): Record<string, number> => ({
    Görünürlük: e.visibility,
    Bahis: Math.min(100, e.mentions * 5), // normalize görünür hale getir
    Sentiment: e.sentiment,
    Pozisyon: e.position,
    Öneri: e.recommend,
  });

  const data = axes.map((axis) => {
    const row: Record<string, string | number> = { axis };
    entities.forEach((e) => {
      row[e.name] = keyFor(e)[axis] ?? 0;
    });
    return row;
  });

  return (
    <div className="h-[340px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#E5E1D8" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#6B6660', fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#A8A29A', fontSize: 9 }} axisLine={false} />
          {entities.map((e, i) => (
            <Radar
              key={e.name}
              name={e.name}
              dataKey={e.name}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={e.isOwn ? 0.35 : 0.08}
              strokeWidth={e.isOwn ? 2.5 : 1.5}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
