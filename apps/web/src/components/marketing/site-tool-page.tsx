/**
 * Site aracı pazarlama sayfası fabrikası (sunucu bileşeni): registry'den başlık/soru/açıklama alır,
 * `CommerceToolPage` (breadcrumb "Ücretsiz araçlar" → /arac, FAQ JSON-LD, "nasıl hesaplanır", sınırlamalar, SSS)
 * içine Suspense'li `SiteTool` koyar. Kullanım (app/(marketing)/arac/<slug>/page.tsx):
 *
 *   const page = createSiteToolPage({ slug:'seo-karnesi', eyebrow:'SEO', intro, axes: SEO_AXES, limitations, faq });
 *   export const metadata = page.metadata;
 *   export default page.Page;
 */
import { Suspense, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { toolBySlug, toolPath } from '@/lib/tool-registry';
import { CommerceToolPage, type ScoringAxis } from './commerce-tool-page';
import type { FaqItem } from './faq';
import { SiteTool } from './site-tool';

export type SiteToolPageDef = {
  slug: string;
  eyebrow: string;
  /** h1 — verilmezse registry `question` */
  question?: string;
  /** h1 içinde vurgulanacak (text-brand) parça; question'da geçmeli */
  highlight?: string;
  intro: string;
  /** <title> — verilmezse "{registry.title} — {question}" */
  metaTitle?: string;
  /** meta description — verilmezse registry `description` + intro */
  description?: string;
  axes: ScoringAxis[];
  scoringNotes?: string[];
  limitations: string[];
  faq: FaqItem[];
  sectorSelect?: boolean | 'required';
  competitorInput?: boolean;
  /** Varsayılan SiteTool yerine araca özel istemci (renderExtra ile mockup vb.) */
  tool?: ReactNode;
  /** Araç ile "nasıl hesaplanır" arasına eklenen bölümler */
  children?: ReactNode;
};

function highlightTitle(question: string, highlight?: string): ReactNode {
  if (!highlight) return question;
  const i = question.indexOf(highlight);
  if (i === -1) return question;
  return (
    <>
      {question.slice(0, i)}
      <span className="text-brand">{highlight}</span>
      {question.slice(i + highlight.length)}
    </>
  );
}

export function createSiteToolPage(def: SiteToolPageDef): { metadata: Metadata; Page: () => ReactNode; path: string } {
  const found = toolBySlug(def.slug);
  if (!found) throw new Error(`Araç registry'de yok: ${def.slug}`);
  const entry = found;
  const path = toolPath(entry.slug);
  const question = def.question ?? entry.question;
  const metadata = buildMetadata({
    title: def.metaTitle ?? `${entry.title} — ${question}`,
    description: def.description ?? `${entry.description} ${def.intro}`.slice(0, 300),
    path,
  });

  function Page() {
    return (
      <CommerceToolPage
        path={path}
        eyebrow={def.eyebrow}
        title={highlightTitle(question, def.highlight)}
        intro={def.intro}
        tool={
          <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
            {def.tool ?? (
              <SiteTool slug={entry.slug} sectorSelect={def.sectorSelect} competitorInput={def.competitorInput} />
            )}
          </Suspense>
        }
        axes={def.axes}
        scoringNotes={def.scoringNotes}
        limitations={def.limitations}
        faq={def.faq}
      >
        {def.children}
      </CommerceToolPage>
    );
  }

  return { metadata, Page, path };
}
