import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Sector } from '@/data/sectors';
import { toolBySlug, toolPath, TOOL_GROUP_LABELS } from '@/lib/tool-registry';

/**
 * "Bu sektörde 3 kontrol" — `sector.checks` (araç slug + neden) → registry'den başlık/soru/açıklama; her kart
 * `/arac/<slug>` sayfasına gider. Araç henüz yayında değilse (INTEGRATE öncesi) link yine üretilir; sayfa INTEGRATE ile açılır.
 */
export function SectorChecks({ sector }: { sector: Sector }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {sector.checks.map((c, i) => {
        const tool = toolBySlug(c.tool);
        if (!tool) return null;
        const href = toolPath(tool.slug);
        return (
          <article key={c.tool} className={`card p-6 flex flex-col rise-${i + 1}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="eyebrow">{TOOL_GROUP_LABELS[tool.group]}</span>
              <span className="font-mono text-[11px] text-ink-faint tabular">{i + 1}/3</span>
            </div>
            <h3 className="font-display text-[20px] tracking-tight mt-3 leading-tight">{tool.title}</h3>
            <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{tool.question}</p>
            <p className="text-[13.5px] mt-4 leading-relaxed border-t border-hairline pt-4">
              <span className="text-ink-faint">Bu sektörde neden: </span>
              {c.why}
            </p>
            <div className="mt-auto pt-5">
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand font-medium"
              >
                {tool.enabled ? 'Aracı aç' : `${tool.shortTitle} aracına git`} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}
