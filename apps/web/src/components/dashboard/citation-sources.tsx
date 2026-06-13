import { Quote, ExternalLink } from 'lucide-react';
import type { CitationSource } from '@/server/insights';

/** AI modellerinin en çok atıf verdiği domainler — nereye görünmeniz gerektiğini söyler. */
export function CitationSources({ sources }: { sources: CitationSource[] }) {
  if (sources.length === 0) {
    return (
      <div className="card p-6">
        <Header />
        <p className="text-[13px] text-ink-muted mt-3">
          Henüz atıf verisi yok. Modeller cevaplarında kaynak gösterdikçe (özellikle Gemini/Perplexity), en çok
          atıf alan siteler burada birikecek.
        </p>
      </div>
    );
  }

  const max = sources[0]?.count ?? 1;

  return (
    <div className="card p-6">
      <Header />
      <div className="mt-4 space-y-2.5">
        {sources.map((s) => (
          <div key={s.domain} className="flex items-center gap-3">
            <div className="w-[130px] shrink-0 truncate text-[12.5px] text-ink flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3 text-ink-faint shrink-0" />
              {s.domain}
            </div>
            <div className="flex-1 h-2 rounded-full bg-paper-3 overflow-hidden">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(s.count / max) * 100}%` }} />
            </div>
            <div className="w-10 shrink-0 text-right text-[11.5px] text-ink-muted font-mono">{s.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2">
      <Quote className="w-4 h-4 text-brand" />
      <h3 className="font-display text-[16px]">En Çok Atıf Alan Kaynaklar</h3>
    </div>
  );
}
