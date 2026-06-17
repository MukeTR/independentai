import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Path-based blog sayfalama — eski `?page=N` query-param'ı yerine.
 * Sayfa 1 = /blog, sayfa N = /blog/sayfa/N. Her hedef kendi kendine canonical
 * (query-param sürümü /blog'a canonical veriyordu = "discovered, not indexed" tuzağı).
 */
function href(page: number): string {
  return page <= 1 ? '/blog' : `/blog/sayfa/${page}`;
}

export function BlogPagination({ current, total }: { current: number; total: number }) {
  if (total <= 1) return null;

  return (
    <nav className="mt-14 flex items-center justify-center gap-2 flex-wrap" aria-label="Sayfalama">
      <Link
        href={href(current - 1)}
        rel="prev"
        aria-disabled={current === 1}
        className={`btn-secondary !py-2 !px-3 inline-flex items-center gap-1 text-[12px] ${current === 1 ? 'opacity-40 pointer-events-none' : ''}`}
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Önceki
      </Link>

      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const isCurrent = n === current;
        return (
          <Link
            key={n}
            href={href(n)}
            aria-current={isCurrent ? 'page' : undefined}
            className={`min-w-[36px] h-9 inline-flex items-center justify-center rounded-lg text-[12.5px] tabular transition ${isCurrent ? 'bg-ink text-paper-3' : 'border-hairline border text-ink-muted hover:text-ink hover:bg-paper-3'}`}
          >
            {n}
          </Link>
        );
      })}

      <Link
        href={href(current + 1)}
        rel="next"
        aria-disabled={current === total}
        className={`btn-secondary !py-2 !px-3 inline-flex items-center gap-1 text-[12px] ${current === total ? 'opacity-40 pointer-events-none' : ''}`}
      >
        Sonraki <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </nav>
  );
}
