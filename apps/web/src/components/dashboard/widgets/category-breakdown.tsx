import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

const CATEGORY_LABELS: Record<string, string> = {
  discovery: 'Keşif',
  comparison: 'Karşılaştırma',
  review: 'Değerlendirme',
  how_to: 'Nasıl yapılır',
  other: 'Diğer',
  diğer: 'Diğer',
};

function labelFor(category: string): string {
  return CATEGORY_LABELS[category?.toLowerCase()] ?? category ?? 'Diğer';
}

export function CategoryBreakdown({
  categories,
}: {
  categories: ComprehensiveAnalytics['categoryBreakdown'];
}) {
  const rows = [...(categories ?? [])].sort(
    (a, b) => b.visibility - a.visibility,
  );

  return (
    <div className="card p-6 h-full flex flex-col">
      <div className="eyebrow">Kategoriye Göre Görünürlük</div>

      {rows.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px] text-ink-faint">henüz veri yok</p>
        </div>
      ) : (
        <ul className="mt-5 flex-1 flex flex-col justify-center space-y-5">
          {rows.map((row) => {
            const pct = Math.max(0, Math.min(100, Math.round(row.visibility)));
            return (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[13px] font-medium text-ink">
                    {labelFor(row.category)}
                  </span>
                  <span className="shrink-0 font-mono tabular text-[13px] text-ink">
                    {pct}%
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper-4">
                    <div
                      className="h-full rounded-full bg-brand transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono tabular text-[11px] text-ink-faint">
                    {row.runs} çalışma
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
