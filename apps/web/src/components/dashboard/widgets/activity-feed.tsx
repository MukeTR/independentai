import { Check } from 'lucide-react';
import type { ComprehensiveAnalytics } from '@/server/dashboard-analytics';

function sentimentDotClass(sentiment: string | null): string {
  switch ((sentiment ?? '').toUpperCase()) {
    case 'POSITIVE':
      return 'bg-positive';
    case 'NEGATIVE':
      return 'bg-danger';
    default:
      return 'bg-neutral';
  }
}

export function ActivityFeed({ activity }: { activity: ComprehensiveAnalytics['activity'] }) {
  const rows = activity.slice(0, 12);

  return (
    <div className="card p-6">
      <div className="eyebrow">Son Aktivite</div>

      {rows.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-faint">henüz çalıştırma yok</p>
      ) : (
        <ul className="mt-4 divide-y divide-hairline">
          {rows.map((item) => (
            <li
              key={item.id}
              className="-mx-2 flex items-start gap-3 rounded-[8px] px-2 py-2.5 transition-colors hover:bg-paper-2"
            >
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-[6px] border border-hairline bg-paper-4 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-muted">
                {item.provider}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-ink">{item.promptText}</p>
                <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                  {item.ownMentioned ? (
                    <>
                      <Check className="h-3.5 w-3.5 shrink-0 text-positive" />
                      <span className="text-positive">
                        anıldı
                        {item.position != null && (
                          <span className="text-ink-faint"> · #{item.position}</span>
                        )}
                      </span>
                      {item.sentiment && (
                        <span
                          className={`ml-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${sentimentDotClass(item.sentiment)}`}
                        />
                      )}
                    </>
                  ) : (
                    <span className="text-ink-faint">anılmadı</span>
                  )}
                </div>
              </div>

              <span className="mt-0.5 shrink-0 font-mono tabular text-[11px] text-ink-faint">
                {item.date.slice(5, 16)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
