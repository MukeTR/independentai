import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowLeft } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'AI Pazarlama Sözlüğü — GEO terimleri',
  description: 'AI brand visibility, GEO, SoV, llms.txt ve daha fazla terimin Türkçe açıklamaları.',
  path: '/resources/glossary',
});

const TERMS = [
  { term: 'AI Brand Visibility', tr: 'Yapay zeka marka görünürlüğü', d: 'Bir markanın AI sohbet ürünleri (ChatGPT, Claude, Gemini gibi) tarafından üretilen cevaplarda ne sıklıkla, hangi sırada ve hangi tonla geçtiğinin ölçümü.' },
  { term: 'Alias Matching', tr: 'Takma ad eşleştirme', d: 'Bir markanın farklı yazımlarını (Ana ad, kısaltma, domain, yazım hataları) AI cevap metninde tespit etmek için kullanılan yöntem.' },
  { term: 'BrandMention', tr: 'Marka bahsi', d: 'AI cevap metninde geçen herhangi bir marka adı. Her mention için pozisyon, sentiment ve bağlam kaydedilir.' },
  { term: 'GEO (Generative Engine Optimization)', tr: 'Üretken motor optimizasyonu', d: 'SEO\'nun AI çağındaki karşılığı. Markanın AI cevaplarında öne çıkması için yapılan ölçüm ve içerik çalışmaları.' },
  { term: 'llms.txt', tr: '', d: 'Web sitesinin köküne konulan, AI crawler\'larına marka hakkında yapılandırılmış bilgi veren markdown dosyası. llmstxt.org standardı.' },
  { term: 'LLM (Large Language Model)', tr: 'Büyük dil modeli', d: 'GPT-4, Claude, Gemini gibi metin üreten ve cevap veren yapay zeka modelleri.' },
  { term: 'Mention Position', tr: 'Bahsetme sırası', d: 'AI cevap metninde markanın kaçıncı bahsedilen marka olduğu. 1.sıra en değerli.' },
  { term: 'ModelRun', tr: 'Model çalıştırması', d: 'Bir prompt\'un bir AI modelinde çalıştırılmasının kayıtı. Bizim sistemde her gün × her aktif prompt × her model = 1 ModelRun.' },
  { term: 'Prompt', tr: 'İzlenecek soru', d: 'AI modeline gönderilen ve düzenli olarak izlenen soru. "En iyi muhasebe yazılımı" gibi.' },
  { term: 'Sentiment', tr: 'Tonal değerlendirme', d: 'Bir marka bahsinin pozitif, nötr veya negatif olduğunun değerlendirmesi. Şu an heuristic, ileride LLM-tabanlı.' },
  { term: 'Share of Voice (SoV)', tr: 'Ses payı', d: 'Bir markanın, kategorideki rakip markaların toplam bahsetme sayısı içindeki yüzdesi. Pazar payının AI versiyonu.' },
  { term: 'Tenant', tr: 'Müşteri hesabı', d: 'Independent AI\'da bir şirketin hesabı. Bir tenant altında birden fazla user, brand, competitor olabilir.' },
  { term: 'Trial', tr: 'Deneme süresi', d: 'Independent AI\'da kayıt tarihinden itibaren 6 ay olan ücretsiz erişim süresi.' },
  { term: 'Visibility Score', tr: 'Görünürlük skoru', d: 'İzlenen tüm sorgularda markanızın geçtiği oran. 0-100 arası tek sayı.' },
];

const FIRST_LETTERS = [...new Set(TERMS.map((t) => (t.term[0] ?? '').toUpperCase()))].sort();

export default function Glossary() {
  const groups = FIRST_LETTERS.map((letter) => ({
    letter,
    items: TERMS.filter((t) => (t.term[0] ?? '').toUpperCase() === letter).sort((a, b) => a.term.localeCompare(b.term)),
  }));

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Ana sayfa', href: '/' },
        { name: 'Kaynaklar', href: '/resources' },
        { name: 'Sözlük', href: '/resources/glossary' },
      ]} />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Tüm kaynaklar
          </Link>
          <div className="eyebrow mt-6">Kaynaklar</div>
          <h1 className="font-display text-[52px] lg:text-[64px] tracking-tight mt-4 leading-[1.02]">
            AI Pazarlama <span className="text-brand">Sözlüğü</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-6 leading-relaxed max-w-2xl">
            GEO, AI brand monitoring ve dijital pazarlamada karşılaşacağınız önemli terimlerin Türkçe açıklamaları.
          </p>

          {/* Alfabetik nav */}
          <div className="flex flex-wrap gap-2 mt-8">
            {FIRST_LETTERS.map((l) => (
              <a key={l} href={`#g-${l}`} className="chip hover:bg-brand-glow transition">{l}</a>
            ))}
          </div>
        </Container>
      </section>

      <section className="pb-20">
        <Container className="max-w-4xl">
          {groups.map((g) => (
            <div key={g.letter} id={`g-${g.letter}`} className="mb-14">
              <h2 className="font-display text-[40px] tracking-tight text-brand border-b-hairline border-hairline pb-3 mb-6">
                {g.letter}
              </h2>
              <div className="space-y-7">
                {g.items.map((it) => (
                  <div key={it.term}>
                    <h3 className="font-display text-[20px] tracking-tight">
                      {it.term}
                      {it.tr && <span className="text-ink-faint text-[14px] font-normal ml-3">— {it.tr}</span>}
                    </h3>
                    <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">{it.d}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Container>
      </section>

      <CtaBlock
        title={<>Bu terimleri <span className="text-brand">eyleme dök.</span></>}
        body="Independent AI ile markanızın AI görünürlüğünü ölçmeye bugün başlayın."
      />
    </>
  );
}
