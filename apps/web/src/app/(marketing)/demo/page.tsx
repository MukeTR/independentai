import Link from 'next/link';
import { ArrowRight, FileText, HelpCircle, LayoutDashboard, Search } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { KVKK_SENTENCE } from '@/components/marketing/report-cta-row';
import { buildMetadata } from '@/lib/seo';
import { enabledTools, toolBySlug, toolPath } from '@/lib/tool-registry';
import { getOffer } from '@/server/offer';

const PATH = '/demo';

export const metadata = buildMetadata({
  title: 'Demo turu — 60 saniyede Yanıt',
  description:
    'Dört adımda Yanıt: sitenizi ücretsiz tarayın, raporu paylaşın, sektörünüzün sorularına bakın, panelde her gün ölçün.',
  path: PATH,
});

const FAQ: FaqItem[] = [
  {
    question: 'Demo hesabı var mı?',
    answer:
      'Hayır. Ücretsiz araçlar ve kalıcı rapor kayıt istemez; kendi sitenizle aynı deneyimi yaşarsınız. Panel demosunu ekibimizle birlikte canlı görmek için satış görüşmesi isteyin.',
  },
  {
    question: 'Panel neyi ölçer, araçlar neyi ölçer?',
    answer:
      'Ücretsiz araçlar sitenizin hazırlığını ölçer (deterministik, yapay zekâ kullanılmaz). Panel ise ChatGPT, Claude ve Gemini cevaplarında markanızın geçip geçmediğini, kaçıncı sırada olduğunu ve rakiplerinizi her gün ölçer; her sayının arkasında tarih ve model damgalı örnek cevap vardır.',
  },
  {
    question: 'Sonuç sözü veriyor musunuz?',
    answer:
      'Hayır. Yapay zekâ cevapları oturumdan oturuma değişir; hiç kimse görünürlük sözü veremez. Biz ölçeriz, nedenini gösteririz ve takip ederiz; düzeltmeyi siz yaparsınız ya da Yanıt Agency yapar.',
  },
];

/**
 * /demo — indekslenen rehber sayfa (demo-login yok; seed hesabı süper admin, MF-5).
 * Dört adım: tarama → rapor → sektör sorusu → panel. "Örnek rapor" satıcının kendi taramasıdır.
 */
export default async function DemoPage() {
  const offer = await getOffer();
  const tools = enabledTools().filter((t) => t.kind !== null);
  const firstTool = toolBySlug('seo-karnesi')?.enabled ? toolBySlug('seo-karnesi') : tools[0];
  const coverage = toolBySlug('musteriniz-nasil-soruyor');
  const coverageHref = coverage?.enabled ? toolPath(coverage.slug) : '/arac';
  const scanHref = firstTool ? toolPath(firstTool.slug) : '/arac';

  const STEPS = [
    {
      n: '01',
      icon: Search,
      t: 'Siteyi 20 saniyede tarayın',
      d: `"İzninizle sitenizi tarayayım" deyip adresi yazın. ${firstTool?.title ?? 'Araç'} hüküm cümlesiyle döner: kaç kritik, kaç uyarı, kaç tamam — ve 100 üzerinden skor.`,
      href: scanHref,
      cta: 'Sitemi tara',
    },
    {
      n: '02',
      icon: FileText,
      t: 'Kalıcı raporu WhatsApp’tan gönderin',
      d: 'Her tarama 30 gün geçerli bir /rapor bağlantısı üretir. Skor halkası, eksenler, ilk 5 öneri ve tüm kontroller aynı bağlantıdan açılır; giriş gerekmez. "Bu rapor kalıcı, WhatsApp’tan atıyorum."',
      href: '/arac',
      cta: 'Tüm araçlar',
    },
    {
      n: '03',
      icon: HelpCircle,
      t: 'Sektörün satın alma sorularına bakın',
      d: 'Müşteri "İstanbul’da güvenilir … hangisi, fiyatı ne kadar?" diye soruyor. Satın alma sorusu kapsama aracı sitenizde bu sorulara cevap olup olmadığını sayfa sayfa gösterir; anahtar kelime eşleşmesidir, cevap kalitesini ölçmez.',
      href: coverageHref,
      cta: coverage?.enabled ? 'Soruları kontrol et' : 'Araç listesine git',
    },
    {
      n: '04',
      icon: LayoutDashboard,
      t: 'Panelde her gün ölçün',
      d: `İki yol: Yanıt panelinde ChatGPT, Claude ve Gemini cevaplarını rakiplerinizle birlikte her gün takip edin (${offer.trialDays} gün deneme, kart yok) ya da düzeltmeyi Yanıt Agency yapsın (teklifle).`,
      href: '/pricing',
      cta: 'Fiyatlandırma',
    },
  ] as const;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Demo turu', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="eyebrow">Demo turu</div>
          <h1 className="font-display text-[44px] lg:text-[64px] tracking-tight mt-4 leading-[1.02]">
            60 saniyede Yanıt:
            <br />
            <span className="text-brand">tara, göster, takip et.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Müşteriniz satın almadan önce yapay zekâya soruyor: sizi mi öneriyor, rakibinizi mi? Yanıt ölçer, nedenini
            gösterir, takip eder — siz düzeltin ya da Yanıt Agency düzeltsin. Aşağıdaki dört adım, satış görüşmesinde de
            aynı sırayla ilerler.
          </p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link href={scanHref} className="btn-primary inline-flex items-center gap-2 min-h-[44px]">
              Kendi sitemle deneyeyim <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link
              href="/contact?src=demo&konu=satis#form"
              className="btn-secondary min-h-[44px] inline-flex items-center"
            >
              Panel demosu için satış görüşmesi
            </Link>
          </div>
          <p className="text-[12px] text-ink-faint mt-4">{KVKK_SENTENCE}</p>
        </Container>
      </section>

      <Section eyebrow="Dört adım" title="Satıcının 60 saniyesi." className="bg-paper-2/40 py-16 lg:py-20">
        <ol className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {STEPS.map((s) => (
            <li key={s.n} className="card p-7 flex flex-col">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] tracking-[0.14em] text-brand">{s.n}</span>
                <s.icon className="w-5 h-5 text-brand" aria-hidden />
              </div>
              <h3 className="font-display text-[20px] tracking-tight mt-3 leading-snug">{s.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed flex-1">{s.d}</p>
              <Link
                href={s.href}
                className="mt-5 inline-flex items-center gap-2 text-[13.5px] text-brand-deep hover:text-brand min-h-[44px]"
              >
                {s.cta} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        eyebrow="Örnek rapor"
        title="Örnek rapor sizin raporunuzdur."
        intro="Temsili ekran yerine gerçek sonuç: bir araç seçin, adresi yazın; 30 gün geçerli rapor bağlantınız hazır. Skorun altında kontrol sayısı, tarih ve yöntem yazar — hazırlık ölçer, yapay zekâ davranışını değil."
        className="py-16 lg:py-20"
      >
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {tools.slice(0, 6).map((t) => (
            <li key={t.slug}>
              <Link
                href={toolPath(t.slug)}
                className="card p-4 h-full flex flex-col hover:-translate-y-0.5 transition-all"
              >
                <div className="text-[14px] font-medium leading-tight">{t.title}</div>
                <div className="text-[12px] text-ink-faint mt-1 flex-1">{t.question}</div>
                <span className="inline-flex items-center gap-1 text-[12px] text-brand-deep mt-3">
                  Aracı aç <ArrowRight className="w-3 h-3" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="py-14 bg-paper-2/40">
        <Container>
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-[26px] tracking-tight mb-6">Sıkça sorulan sorular</h2>
            <Faq items={FAQ} />
          </div>
        </Container>
      </Section>
    </>
  );
}
