import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BlogPost } from '@/data/blog-posts';

/** Blog yazı kartları grid'i — /blog ve /blog/sayfa/[page] arasında paylaşılır. */
export function PostGrid({ posts }: { posts: BlogPost[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {posts.map((p) => (
        <Link key={p.slug} href={`/blog/${p.slug}`} className="card p-7 hover:bg-paper-3 transition group">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="chip">{p.category}</span>
            <span className="text-[11px] text-ink-faint font-mono">{p.readTimeMin} dk</span>
            <span className="text-[11px] text-ink-faint">·</span>
            <span className="text-[11px] text-ink-faint">
              {new Date(p.publishedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <h2 className="font-display text-[22px] mt-4 leading-snug group-hover:text-brand-deep transition">
            {p.title}
          </h2>
          <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{p.excerpt}</p>
          <div className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-5">
            Devamını oku
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
          </div>
        </Link>
      ))}
    </div>
  );
}
