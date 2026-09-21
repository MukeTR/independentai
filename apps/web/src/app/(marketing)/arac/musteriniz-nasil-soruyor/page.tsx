/**
 * /arac/musteriniz-nasil-soruyor — ücretsiz araç sayfası.
 * Sektör seçilince müşterinin yapay zekâya yazdığı cümleler aşama aşama listelenir; site adresi verilirse
 * yalnız O SAYFA okunur ve her sorunun karşılığı var / kısmen / yok olarak işaretlenir.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardList, Compass, PenLine, Search } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Reveal } from '@/components/marketing/reveal';
import { QuestionBankTool } from '@/components/marketing/question-bank-tool';
import { buildMetadata } from '@/lib/seo';

const PATH = '/arac/musteriniz-nasil-soruyor';

export const metadata = buildMetadata({
  title: 'Müşteriniz sizi nasıl soruyor? — ücretsiz soru listesi',
  description:
    'Sektörünüzü seçin: müşterinizin yapay zekâ asistanına yazdığı gerçek cümleleri keşiften satın alma sonrasına kadar görün. Site adresi verirseniz o sayfada bu soruların karşılığı var mı kontrol edelim. Kayıt gerekmez.',
  path: PATH,
});

const STEPS = [
  {
    icon: Compass,
    title: 'Sektörünüzü seçin',
    body: 'Liste anında gelir; site adresi girmeniz gerekmez. Sorular keşif, karşılaştırma, fiyat ve kapsam, güven ve yetki, satın alma sonrası olmak üzere beş aşamaya ayrılmıştır.',
  },
  {
    icon: Search,
    title: 'İsterseniz bir sayfa adresi ekleyin',
    body: 'Hizmet, ürün ya da ana sayfanızın adresini verin. Yalnızca o sayfa okunur; her sorunun ipuçları sayfanın görünür metninde ve meta açıklamasında aranır.',
  },
  {
    icon: PenLine,
    title: 'Şehir ve hizmet adını yazın',
    body: 'Bu iki alan sunucuya gitmez. Soru cümlelerindeki yer tutucuları doldurur ve sayfa başlığı yazarken kullanabileceğiniz birkaç kalıbı sizin sözlerinizle kurar.',
  },
  {
    icon: ClipboardList,
    title: 'Önce üç soruyla başlayın',
    body: 'Sonuçta karşılığı olmayan sorular öne alınır. Her soru için “cevabı hangi sayfa vermeli” yazar; o sayfaya bir başlık ya da SSS maddesi açıp cevabı ilk iki cümlede verin.',
  },
] as const;

const LIMITS = [
  'Yalnızca girdiğiniz tek sayfa okunur. Sitenizin tamamı taranmaz; başka sayfalarınızda cevap veriyor olabilirsiniz.',
  'Kontrol metin eşleşmesidir: sayfada sözün geçmesi cevabın iyi yazıldığını göstermez, geçmemesi de sorunun cevapsız olduğunu kesinleştirmez.',
  'Sorular yapay zekâ asistanlarının size gerçekten yönlendirdiği trafiği ölçmez; bu araç sitenizin hazırlığına bakar, asistanların davranışına değil.',
  'Sayfanız açılmazsa (alan adı çözülmezse ya da sunucu 403 gibi bir cevap verirse) oran üretilmez; “Adrese ulaşılamadı” denir ve yalnızca soru listesi gösterilir.',
  'Soru bankası sektörün ortak diline dayanır; kendi müşterinizin kullandığı özel bir cümle listede olmayabilir.',
];

const FAQ: FaqItem[] = [
  {
    question: 'Sorular nereden geliyor, uydurma mı?',
    answer:
      'Sorular sektör sektör hazırlanmış bir bankadan gelir ve müşterilerin yapay zekâ asistanına yazdığı cümle biçimlerini taklit eder: uzun, konuşma dilinde, koşullu. Marka adı içermezler; her sorunun altında o soruya hangi sayfanın cevap vermesi gerektiği ve neden önemli olduğu yazar.',
  },
  {
    question: '“Kısmen” ne anlama geliyor?',
    answer:
      'Her sorunun sayfada aranan birkaç ipucu vardır. İpuçlarının hepsi girdiğiniz sayfada geçiyorsa “karşılığı var”, en az biri geçiyorsa “kısmen”, hiçbiri geçmiyorsa “karşılığı yok” denir. Eşleşme Türkçe eklere duyarlıdır: “fiyat” ipucu “fiyatları” yazan bir sayfada da bulunur.',
  },
  {
    question: 'Site adresi vermezsem araç ne işe yarar?',
    answer:
      'Liste tek başına bir içerik planıdır: müşterinizin hangi aşamada ne sorduğunu, cevabın hangi sayfada durması gerektiğini gösterir. Bunu yazı planına, SSS bölümüne veya satış ekibinizin hazırlığına çevirebilirsiniz. Adres vermediğiniz sürece hiçbir sayfa okunmaz.',
  },
  {
    question: 'Bu araç yapay zekâ cevaplarında görüneceğimi söylüyor mu?',
    answer:
      'Hayır. Araç yalnızca “bu soruların sitenizde karşılığı var mı” sorusunu yanıtlar; bir sonuç sözü vermez. Asistanların cevaplarında markanızın anılıp anılmadığını günlük ölçümle takip etmek Yanıt panelinin işidir.',
  },
];

export default function Page() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Ücretsiz araçlar', href: '/arac' },
          { name: 'Müşteriniz sizi nasıl soruyor?', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      <Section className="pt-16 lg:pt-24 pb-10">
        <Container>
          <div className="max-w-3xl mx-auto text-center">
            <div className="chip own !text-[10px] inline-flex">Soru bankası · ücretsiz · kayıt gerekmez</div>
            <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">
              Müşteriniz sizi <span className="text-brand">nasıl soruyor?</span>
            </h1>
            <p className="text-[16px] text-ink-muted mt-5 leading-relaxed">
              Kimse markanızın adını yazarak başlamıyor. Derdini, bütçesini ve şehrini tek cümleye sıkıştırıp yapay
              zekâya soruyor. Sektörünüzü seçin, o cümleleri aşama aşama görün; isterseniz bir sayfa adresi ekleyin,
              girdiğiniz sayfada bu soruların karşılığı var mı bakalım.
            </p>
          </div>
          <div className="max-w-5xl mx-auto mt-10">
            <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
              <QuestionBankTool />
            </Suspense>
          </div>
        </Container>
      </Section>

      <Section className="py-14 bg-paper-2/40" id="nasil-kullanilir">
        <Container>
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-[26px] tracking-tight">Nasıl kullanılır?</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-6">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 60}>
                  <div className="card p-5 h-full">
                    <div className="flex items-center gap-2.5">
                      <s.icon className="w-4 h-4 text-brand shrink-0" aria-hidden />
                      <div className="font-display text-[16px] tracking-tight">{s.title}</div>
                    </div>
                    <p className="text-[13.5px] text-ink-muted mt-2.5 leading-relaxed">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="py-14">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[22px] tracking-tight">Kapsama kuralı ve sınırlar</h2>
            <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
              Kural tek cümle: bir sorunun ipuçlarının hepsi girdiğiniz sayfada geçiyorsa “karşılığı var”, en az biri
              geçiyorsa “kısmen”, hiçbiri geçmiyorsa “karşılığı yok”. Kontrol deterministiktir — aynı sayfa aynı anda
              iki kez bakıldığında aynı sonucu verir; puanlamada yapay zekâ kullanılmaz.
            </p>
            <ul className="mt-5 space-y-2.5 text-[14px] text-ink-muted leading-relaxed">
              {LIMITS.map((l, i) => (
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

      <Section className="py-14 bg-paper-2/40">
        <Container>
          <div className="max-w-4xl mx-auto card p-6 sm:p-8">
            <div className="eyebrow mb-3">Listeyi işe çevirmek</div>
            <h2 className="font-display text-[24px] lg:text-[30px] tracking-tight leading-tight">
              Soruları biliyorsunuz. Sıra cevapları yazmakta.
            </h2>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              Karşılığı olmayan her soru bir sayfa başlığı, bir SSS maddesi ya da bir fiyat açıklaması demektir. Bu işi
              kendiniz yapabilirsiniz; listeyi kopyalayıp yazmaya başlamanız yeterli. Vaktiniz yoksa Yanıt Agency
              soruları sayfa planına çevirir, metinleri yazar ve sonucu aynı ölçümle takip eder.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/yanit-agency" className="btn-primary inline-flex items-center gap-2">
                Yanıt Agency’yi inceleyin <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link href="/arac" className="btn-secondary">
                Diğer ücretsiz araçlar
              </Link>
            </div>
          </div>
        </Container>
      </Section>

      <Section className="py-14">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[26px] tracking-tight mb-6">Sıkça sorulan sorular</h2>
            <Faq items={FAQ} />
          </div>
        </Container>
      </Section>

      <CtaBlock
        eyebrow="Tek fotoğraf değil"
        title={
          <>
            Sorular değişmiyor; <span className="text-brand">cevaplarınız değişmeli.</span>
          </>
        }
        body="Bu araç girdiğiniz sayfanın bugünkü hâline bakar. Yanıt panelinde aynı soruların yapay zekâ cevaplarındaki karşılığını günlük takip eder, eksikleri yapılacak işe çevirirsiniz."
        secondaryHref="/features"
        secondaryLabel="Özellikleri gör"
      />
    </>
  );
}
