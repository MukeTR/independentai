'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) {
    return (
      <svg width={80} height={24} className="overflow-visible" aria-hidden>
        <line
          x1={0}
          y1={12}
          x2={80}
          y2={12}
          stroke="#EFEDE5"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const w = 80;
  const h = 24;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - pad * 2) * (1 - (v - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <polyline
        points={points}
        fill="none"
        stroke="#4F46E5"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PromptPerformanceTable({
  prompts,
}: {
  prompts: ComprehensiveAnalytics['promptPerformance'];
}) {
  const rows = prompts ?? [];

  return (
    <div className="card p-6 h-full">
      <div className="flex items-center justify-between gap-4">
        <div className="eyebrow">Soru Performansı</div>
        <Link
          href="/dashboard/prompts"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-brand transition-colors hover:text-brand-deep"
        >
          Tümü
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-[13px] text-ink-faint">Henüz veri yok</p>
      ) : (
        <div className="mt-5 max-h-[340px] overflow-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="sticky top-0 bg-paper-3 z-10">
              <tr className="eyebrow border-b border-hairline text-left">
                <th className="pb-2 pr-4 font-mono font-normal">Soru</th>
                <th className="pb-2 pr-4 font-mono font-normal">Kategori</th>
                <th className="pb-2 pr-4 font-mono font-normal">Görünürlük</th>
                <th className="pb-2 pr-4 text-right font-mono font-normal">
                  Ort. Sıra
                </th>
                <th className="pb-2 text-right font-mono font-normal">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {rows.map((p) => {
                const vis = Math.max(0, Math.min(100, p.visibility));
                return (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-paper-2"
                  >
                    <td className="py-3 pr-4 align-middle">
                      <Link
                        href={`/dashboard/prompts/${p.id}`}
                        className="block max-w-[260px] truncate text-[13px] text-ink transition-colors group-hover:text-brand-deep"
                        title={p.text}
                      >
                        {p.text}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      {p.category ? (
                        <span className="inline-flex items-center rounded-full bg-paper-4 px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                          {p.category}
                        </span>
                      ) : (
                        <span className="text-[12px] text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="tabular w-9 shrink-0 font-mono text-[12px] text-ink">
                          {vis.toFixed(0)}%
                        </span>
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-4">
                          <div
                            className="h-full rounded-full bg-brand"
                            style={{ width: `${vis}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right align-middle">
                      <span className="tabular font-mono text-[13px] text-ink">
                        {p.avgPosition != null ? p.avgPosition.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td className="py-3 text-right align-middle">
                      <div className="flex justify-end">
                        <Sparkline data={p.sparkline} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
