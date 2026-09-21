import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SectorLanding } from '@/components/marketing/sector-landing';
import { sectorBySlug, sectorPath } from '@/data/sectors';
import { buildMetadata } from '@/lib/seo';

/**
 * /sektor/<slug> — 9 sektör landing'i (spec §7.2). `generateStaticParams` yok; bilinmeyen slug → notFound().
 * force-dynamic: gömülü araç ve CtaBlock/HowToProceed getOffer() okur (admin override'ı anında görünsün).
 */
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const sector = sectorBySlug(slug);
  if (!sector) return buildMetadata({ title: 'Sektör bulunamadı', noIndex: true });
  return buildMetadata({
    title: sector.headline,
    description: `${sector.intro.slice(0, 200)}${sector.intro.length > 200 ? '…' : ''}`,
    path: sectorPath(sector.slug),
    ogTitle: sector.headline,
  });
}

export default async function SectorPage({ params }: Params) {
  const { slug } = await params;
  const sector = sectorBySlug(slug);
  if (!sector) notFound();
  return <SectorLanding sector={sector} />;
}
