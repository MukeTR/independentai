import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import type { Offer } from '@independentai/shared';
import { getOffer } from '@/server/offer';
import { ArrowLeft } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Sözlük — yapay zekâ görünürlüğü terimleri',
  description:
    'Görünürlük skoru, Share of Voice, atıf, alias eşleşmesi, GEO, llms.txt, hazırlık skoru, YanitBot: Yanıt’ta geçen terimlerin Türkçe açıklamaları.',
  path: '/resources/glossary',
});

/** Terimler; deneme süresi admin ayarından (`server/offer.ts`) gelir, `/pricing` ve `/features` ile aynı kaynak. */
function buildTerms(offer: Offer) {
  return [
    {
      term: 'AI Brand Visibility',
      tr: 'Yapay zekâ marka görünürlüğü',
      d: 'Bir markanın yapay zekâ asistanlarının (ChatGPT, Claude, Gemini) ürettiği cevaplarda ne sıklıkla, hangi sırada ve hangi bağlamda geçtiğinin ölçümü. KOBİ diliyle: “ChatGPT sizi öneriyor mu?”',
    },
    {
      term: 'Atıf (Citation)',
      tr: 'Kaynak gösterme',
      d: 'Modelin cevap üretirken dayandığı ya da bağlantı verdiği alan adı. Sağlayıcı web araması açıkken native atıf, kapalıyken metin içi bağlantı sayılır (beta).',
    },
    {
      term: 'Alias Matching',
      tr: 'Takma ad eşleştirme',
      d: 'Bir markanın farklı yazımlarını (Ana ad, kısaltma, domain, yazım hataları) AI cevap metninde tespit etmek için kullanılan yöntem.',
    },
    {
      term: 'BrandMention',
      tr: 'Marka bahsi',
      d: 'Cevap metninde geçen bir marka adı. Her bahis için pozisyon, bağlam cümlesi ve sentiment (beta) kaydedilir; aynı cevapta tekrar 1 sayılır.',
    },
    {
      term: 'Görünürlük boşluğu',
      tr: 'Visibility gap',
      d: 'Rakibin göründüğü, sizin görünmediğiniz soru. Öncelik listesinin başına gelir; hiçbir rakibin görünmediği sorular “sahipsiz” olarak ayrıca listelenir.',
    },
    {
      term: 'Hazırlık skoru',
      tr: 'Readiness score',
      d: 'Ücretsiz site araçlarının verdiği 0–100 skor: deterministik kontrollerin ağırlıklı toplamı (geç/uyar/kal). Sitenizin hazırlığını ölçer, yapay zekânın davranışını değil. Formül: /docs#skorlar.',
    },
    {
      term: 'GEO (Generative Engine Optimization)',
      tr: 'Üretken motor optimizasyonu',
      d: 'SEO’nun AI çağındaki karşılığı. Markanın AI cevaplarında öne çıkması için yapılan ölçüm ve içerik çalışmaları.',
    },
    {
      term: 'llms.txt',
      tr: '',
      d: 'Web sitesinin köküne konulan, AI crawler’larına marka hakkında yapılandırılmış bilgi veren markdown dosyası. llmstxt.org standardı.',
    },
    {
      term: 'LLM (Large Language Model)',
      tr: 'Büyük dil modeli',
      d: 'ChatGPT, Claude, Gemini gibi ürünlerin arkasındaki, metin üreten yapay zekâ modelleri. Cevapları oturumdan oturuma değişebilir; bu yüzden tek sorguya değil seriye bakılır.',
    },
    {
      term: 'Mention Position',
      tr: 'Bahsetme sırası',
      d: 'AI cevap metninde markanın kaçıncı bahsedilen marka olduğu. 1.sıra en değerli.',
    },
    {
      term: 'ModelRun',
      tr: 'Model çalıştırması',
      d: 'Bir prompt’un bir AI modelinde çalıştırılmasının kayıtı. Bizim sistemde her gün × her aktif prompt × her model = 1 ModelRun.',
    },
    {
      term: 'Prompt',
      tr: 'İzlenecek soru',
      d: 'AI modeline gönderilen ve düzenli olarak izlenen soru. “En iyi muhasebe yazılımı” gibi.',
    },
    {
      term: 'Sentiment',
      tr: 'Tonal değerlendirme',
      d: 'Bir marka bahsinin pozitif, nötr veya negatif olduğunun değerlendirmesi. Heuristik + LLM sınıflandırma; sağlayıcı anahtarı yoksa yalnızca heuristik (beta).',
    },
    {
      term: 'Sahipsiz soru',
      tr: 'Unclaimed question',
      d: 'Ne sizin ne rakiplerinizin göründüğü müşteri sorusu. En düşük maliyetli fırsat: cevap veren ilk içerik siz olabilirsiniz.',
    },
    {
      term: 'Share of Voice (SoV)',
      tr: 'Ses payı',
      d: 'Bir markanın, kategorideki rakip markaların toplam bahsetme sayısı içindeki yüzdesi. Pazar payının AI versiyonu.',
    },
    {
      term: 'Tenant',
      tr: 'Müşteri hesabı',
      d: 'Yanıt’ta bir şirketin hesabı. Bir tenant altında birden fazla user, brand, competitor olabilir.',
    },
    {
      term: 'Trial',
      tr: 'Deneme süresi',
      d: `Yanıt’ta kayıt tarihinden itibaren ${offer.trialDays} gün süren, kart gerektirmeyen ücretsiz tam erişim.`,
    },
    {
      term: 'Visibility Score',
      tr: 'Görünürlük skoru',
      d: 'Markanızın geçtiği başarılı cevap sayısı / başarılı cevap sayısı × 100. Hatalı çalıştırmalar paydaya girmez. 0–100.',
    },
    {
      term: 'YanitBot',
      tr: 'Yanıt tarayıcısı',
      d: 'Ücretsiz araçlar ve panel denetimleri için herkese açık sayfaları okuyan tarayıcı. Kullanıcı isteğiyle çalışır, robots.txt ile engellenebilir: /bot.',
    },
  ];
}

export default async function Glossary() {
  const TERMS = buildTerms(await getOffer());
  const FIRST_LETTERS = [...new Set(TERMS.map((t) => (t.term[0] ?? '').toUpperCase()))].sort();
  const groups = FIRST_LETTERS.map((letter) => ({
    letter,
    items: TERMS.filter((t) => (t.term[0] ?? '').toUpperCase() === letter).sort((a, b) => a.term.localeCompare(b.term)),
  }));

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Kaynaklar', href: '/resources' },
          { name: 'Sözlük', href: '/resources/glossary' },
        ]}
      />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <Link
            href="/resources"
            className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink"
          >
            <ArrowLeft className="w-3 h-3" aria-hidden /> Tüm kaynaklar
          </Link>
          <div className="eyebrow mt-6">Kaynaklar</div>
          <h1 className="font-display text-[48px] lg:text-[64px] tracking-tight mt-4 leading-[1.02]">
            Yapay zekâ görünürlüğü <span className="text-brand">sözlüğü</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-6 leading-relaxed max-w-2xl">
            Panelde, raporlarda ve ücretsiz araçlarda karşılaşacağınız terimlerin Türkçe açıklamaları. Formüller için{' '}
            <Link href="/docs#skorlar" className="text-brand-deep hover:text-brand">
              skor yöntemi
            </Link>
            .
          </p>

          {/* Alfabetik nav */}
          <div className="flex flex-wrap gap-2 mt-8">
            {FIRST_LETTERS.map((l) => (
              <a key={l} href={`#g-${l}`} className="chip hover:bg-brand-glow transition">
                {l}
              </a>
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
        title={
          <>
            Bu terimleri <span className="text-brand">eyleme dök.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez. Sürekli ölçüm için hesap açın; kart gerekmez."
        secondaryHref="/arac"
        secondaryLabel="Ücretsiz araçlar"
      />
    </>
  );
}
