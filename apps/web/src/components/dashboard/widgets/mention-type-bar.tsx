import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

const FILL: Record<string, string> = {
  RECOMMENDED: 'bg-positive',
  LISTED: 'bg-brand',
  COMPARED: 'bg-warning',
  PASSING: 'bg-ink-faint',
};

export function MentionTypeBar({
  mentionTypes,
}: {
  mentionTypes: ComprehensiveAnalytics['mentionTypes'];
}) {
  const max = Math.max(1, ...mentionTypes.map((m) => m.count));

  return (
    <div className="card p-6">
      <div className="eyebrow">Anılma Biçimi</div>
      <p className="mt-1 text-[12px] text-ink-faint">AI markanızı nasıl andı</p>

      {mentionTypes.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-faint">henüz veri yok</p>
      ) : (
        <div className="mt-5 space-y-3">
          {mentionTypes.map((m) => {
            const pct = Math.round((m.count / max) * 100);
            const fill = FILL[m.type] ?? 'bg-ink-faint';
            return (
              <div key={m.type} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-[13px] text-ink-muted">
                  {m.label}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper-4">
                  <div
                    className={`h-full rounded-full ${fill}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[13px] tabular text-ink">
                  {m.count}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
