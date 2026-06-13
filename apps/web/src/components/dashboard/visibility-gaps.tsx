import Link from 'next/link';
import { TargetIcon, ArrowRight } from 'lucide-react';
import type { VisibilityGap } from '@/server/insights';

/** Markanızın görünmediği ama rakiplerin göründüğü promptlar — fırsat listesi. */
export function VisibilityGaps({ gaps }: { gaps: VisibilityGap[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <TargetIcon className="w-4 h-4 text-warning" />
        <h3 className="font-display text-[16px]">Görünürlük Boşlukları</h3>
      </div>
      <p className="text-[12.5px] text-ink-muted mt-1.5">
        Rakiplerinizin öne çıktığı ama markanızın geçmediği sorular. Buradan başlamak en yüksek etkiyi verir.
      </p>

      {gaps.length === 0 ? (
        <div className="mt-4 text-[13px] text-positive bg-positive/5 border border-positive/20 rounded-lg p-4">
          🎉 Harika — rakiplerin geçip sizin geçmediğiniz bir boşluk yok. Tüm sorularda görünürsünüz.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {gaps.map((g) => (
            <Link
              key={g.promptId}
              href={`/dashboard/prompts/${g.promptId}`}
              className="block rounded-lg border border-hairline p-3.5 hover:bg-paper-3 transition group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] text-ink truncate">{g.promptText}</div>
                  <div className="text-[11.5px] text-ink-muted mt-1.5">
                    Öne çıkan rakipler: <span className="text-danger">{g.competitors.join(', ')}</span>
                    {g.providers.length > 0 && (
                      <span className="text-ink-faint"> · {g.providers.join(', ')}'de eksik</span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-faint shrink-0 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
