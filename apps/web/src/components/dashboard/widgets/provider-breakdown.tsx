import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

export function ProviderBreakdown({ byProvider }: { byProvider: ComprehensiveAnalytics['byProvider'] }) {
  const fmtPct = (n: number) => `${(n ?? 0).toFixed(0)}%`;

  return (
    <div className="card p-6 h-full flex flex-col">
      <div className="eyebrow">Modellere Göre</div>

      {byProvider.length === 0 ? (
        <p className="mt-4 font-mono text-[11px] text-ink-faint">henüz veri yok</p>
      ) : (
        <div className="mt-4 grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
          {byProvider.map((p) => {
            const visibility = Math.max(0, Math.min(100, p.visibility ?? 0));
            return (
              <div
                key={p.provider}
                className="flex h-full flex-col rounded-[12px] border border-hairline bg-brand-glow/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[13px] text-ink">{p.provider}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">{p.runs} run</span>
                </div>

                <div className="mt-3 font-display text-[22px] tabular tracking-tight text-ink">
                  {fmtPct(p.visibility)}
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-4">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${visibility}%` }} />
                </div>

                <div className="mt-auto pt-3 flex items-center justify-between font-mono text-[11px] tabular text-ink-muted">
                  <span>{p.mentions} bahsetme</span>
                  <span>
                    ort. sıra <span className="text-ink">{p.avgPosition != null ? p.avgPosition.toFixed(1) : '—'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
