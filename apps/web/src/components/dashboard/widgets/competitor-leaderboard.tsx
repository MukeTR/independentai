import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

function sentimentColor(score: number) {
  if (score >= 66) return { dot: 'bg-positive', text: 'text-positive' };
  if (score >= 33) return { dot: 'bg-warning', text: 'text-warning' };
  return { dot: 'bg-danger', text: 'text-danger' };
}

export function CompetitorLeaderboard({
  competitors,
}: {
  competitors: ComprehensiveAnalytics['competitors'];
}) {
  const rows = [...competitors]
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 8);

  const maxSov = Math.max(...rows.map((r) => r.sov), 1);

  return (
    <div className="card p-6">
      <div className="eyebrow">Rakip Lider Tablosu</div>

      {rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">henüz rakip verisi yok</p>
      ) : (
        <div className="mt-5 -mx-2">
          {/* Header row */}
          <div className="flex items-center gap-3 px-2 pb-2 text-ink-faint">
            <div className="eyebrow w-6 shrink-0">#</div>
            <div className="eyebrow flex-1 min-w-0">İsim</div>
            <div className="eyebrow w-12 shrink-0 text-right tabular">Bahis</div>
            <div className="eyebrow w-24 shrink-0">SoV</div>
            <div className="eyebrow w-14 shrink-0 text-right">Duygu</div>
            <div className="eyebrow w-14 shrink-0 text-right">Ort. Sıra</div>
          </div>

          <div className="divide-y divide-hairline">
            {rows.map((c, i) => {
              const sentiment = Math.round(c.sentiment);
              const sc = sentimentColor(sentiment);
              return (
                <div
                  key={`${c.name}-${i}`}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-[8px] hover:bg-paper-2 transition-colors"
                >
                  <div className="w-6 shrink-0 font-mono text-[12px] text-ink-faint tabular">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0 truncate text-[13px] font-medium text-ink">
                    {c.name}
                  </div>

                  <div className="w-12 shrink-0 text-right font-mono text-[13px] text-ink tabular">
                    {c.mentions}
                  </div>

                  <div className="w-24 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-paper-4 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-brand"
                          style={{ width: `${Math.min((c.sov / maxSov) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-ink-muted tabular w-9 text-right">
                        {c.sov.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="w-14 shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${sc.dot}`} />
                      <span className={`font-mono text-[12px] tabular ${sc.text}`}>
                        {sentiment}
                      </span>
                    </div>
                  </div>

                  <div className="w-14 shrink-0 text-right font-mono text-[13px] text-ink-muted tabular">
                    {c.avgPosition > 0 ? c.avgPosition.toFixed(1) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
