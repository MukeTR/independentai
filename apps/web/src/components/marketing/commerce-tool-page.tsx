/**
 * E-ticaret lead-magnet araç sayfalarının ortak iskeleti (sunucu bileşeni):
 * breadcrumb + FAQ JSON-LD, hero, araç, "nasıl hesaplanır" (eksen + ağırlık, dürüst), sınırlamalar,
 * SSS, ilgili araçlar, CTA. E-posta duvarı yok.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';

export type ScoringAxis = { key: string; label: string; weight: number; description: string };

export const COMMERCE_TOOL_LINKS = [
  {
    href: '/arac/e-ticaret-ai-gorunurluk-testi',
    label: 'E-ticaret AI Görünürlük Testi',
    desc: 'Mağazanın AI motorlarına hazırlığı, 6 eksen',
  },
  {
    href: '/arac/urun-sayfasi-testi',
    label: 'Ürün Sayfası Testi',
    desc: 'Tek ürün sayfası: şema, içerik, cevap uyumu',
  },
  { href: '/arac/ai-crawler-testi', label: 'AI Crawler Testi', desc: 'robots.txt bot matrisi, indekslenebilirlik' },
  {
    href: '/arac/urun-aciklama-yazici',
    label: 'Ürün Açıklama Yazıcı',
    desc: 'AI destekli açıklama + SSS + meta + JSON-LD',
  },
] as const;

export function CommerceToolPage({
  path,
  eyebrow,
  title,
  intro,
  tool,
  axes,
  scoringNotes,
  limitations,
  faq,
  children,
}: {
  path: string;
  eyebrow: string;
  title: ReactNode;
  intro: string;
  tool: ReactNode;
  /** Eksenler ve ağırlıklar; boşsa "nasıl hesaplanır" bölümü gizlenir */
  axes?: ScoringAxis[];
  scoringNotes?: string[];
  limitations: string[];
  faq: FaqItem[];
  children?: ReactNode;
}) {
  const crumbName = typeof title === 'string' ? title : eyebrow;
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Ücretsiz araçlar', href: '/arac/e-ticaret-ai-gorunurluk-testi' },
          { name: crumbName, href: path },
        ]}
      />
      <FaqJsonLd items={faq} />

      <Section className="pt-16 lg:pt-24 pb-10">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <div className="chip own !text-[10px] inline-flex">{eyebrow} · ücretsiz · kayıt gerekmez</div>
            <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">{title}</h1>
            <p className="text-[16px] text-ink-muted mt-5 leading-relaxed">{intro}</p>
          </div>
          <div className="max-w-4xl mx-auto mt-10">{tool}</div>
        </Container>
      </Section>

      {children}

      {axes && axes.length > 0 && (
        <Section className="py-14" id="nasil-hesaplanir">
          <Container>
            <div className="max-w-3xl mx-auto">
              <h2 className="font-display text-[26px] tracking-tight">Skor nasıl hesaplanır?</h2>
              <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
                Her eksen 0-100 arası puanlanır; genel skor eksenlerin aşağıdaki ağırlıklarla toplamıdır. Kontroller
                deterministiktir: aynı sayfa aynı anda iki kez taranırsa aynı sonucu verir. Yapay zeka (LLM) puanlamada
                kullanılmaz.
              </p>
              <div className="card overflow-x-auto mt-6">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-faint border-b border-hairline">
                      <th className="px-4 py-3 font-normal">Eksen</th>
                      <th className="px-4 py-3 font-normal">Ağırlık</th>
                      <th className="px-4 py-3 font-normal">Neye bakar?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {axes.map((a) => (
                      <tr key={a.key} className="border-b border-hairline last:border-0 align-top">
                        <td className="px-4 py-3 whitespace-nowrap">{a.label}</td>
                        <td className="px-4 py-3 font-mono tabular">%{a.weight}</td>
                        <td className="px-4 py-3 text-ink-muted">{a.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {scoringNotes && scoringNotes.length > 0 && (
                <ul className="mt-5 space-y-2 text-[13.5px] text-ink-muted leading-relaxed list-disc list-inside">
                  {scoringNotes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
              <p className="text-[12.5px] text-ink-faint mt-4">
                Tam bulgu kataloğu ve ağırlık gerekçeleri proje dokümantasyonunda:{' '}
                <code className="font-mono text-[11.5px] bg-paper-4 px-1.5 py-0.5 rounded">
                  docs/COMMERCE_SCORING.md
                </code>
              </p>
            </div>
          </Container>
        </Section>
      )}

      <Section className="py-14 bg-paper-2/40">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[22px] tracking-tight">Sınırlamalar — dürüst notlar</h2>
            <ul className="mt-4 space-y-2.5 text-[14px] text-ink-muted leading-relaxed">
              {limitations.map((l, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 font-mono text-[12px] mt-1 text-brand">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section className="py-14">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[26px] tracking-tight mb-6">Sıkça sorulan sorular</h2>
            <Faq items={faq} />
          </div>
        </Container>
      </Section>

      <Section className="py-10">
        <Container>
          <div className="max-w-4xl mx-auto">
            <div className="eyebrow mb-4">Diğer ücretsiz e-ticaret araçları</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {COMMERCE_TOOL_LINKS.filter((t) => t.href !== path).map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="card p-4 hover:-translate-y-0.5 hover:shadow-lg transition-all group"
                >
                  <div className="text-[14px] font-medium leading-tight">{t.label}</div>
                  <div className="text-[12px] text-ink-faint mt-1">{t.desc}</div>
                  <div className="inline-flex items-center gap-1 text-[12px] text-brand-deep mt-3 group-hover:gap-2 transition-all">
                    Aracı aç <ArrowRight className="w-3 h-3" aria-hidden />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <CtaBlock
        eyebrow="Sürekli izleme"
        title={
          <>
            Tek tarama fotoğraf çeker; <span className="text-brand">Independent AI</span> her gün ölçer.
          </>
        }
        body="Mağazanı bağla, ürünlerinin ChatGPT, Claude ve Gemini cevaplarında nasıl anıldığını rakiplerinle karşılaştır. İlk 6 ay ücretsiz."
        primaryLabel="Ücretsiz başla"
        secondaryHref="/features"
        secondaryLabel="Özellikleri gör"
      />
    </>
  );
}
