import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Code2,
  Database,
  Globe,
  LayoutTemplate,
  Puzzle,
  ScanLine,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Faq } from '@/components/marketing/faq';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { PLATFORM_LABELS } from '@/server/commerce/platform-detect';
import { Ciz } from '@/components/marketing/ciz';

const PATH = '/uyumluluk';

export const metadata = buildMetadata({
  title: 'Uyumluluk — her web teknolojisiyle çalışır',
  description:
    'Kurulum yok: Yanıt herkese açık sayfanızı okur. WordPress, Wix, Framer, Bootstrap, React, Laravel ya da mağaza altyapısı fark etmez; ölçüm HTML çıktısına bakar.',
  path: PATH,
});

const HOW = [
  {
    icon: ScanLine,
    title: 'Kurulum yok',
    body: 'Sitenize kod, eklenti ya da izleme kodu eklemezsiniz. Alan adınızı yazarsınız; Yanıt herkese açık sayfanızı bir arama motoru gibi okur, yalnızca okur.',
  },
  {
    icon: Globe,
    title: 'Teknolojiden bağımsız',
    body: 'Ölçtüğümüz şeyler web standardı: başlık yapısı, meta alanları, schema.org verisi, robots.txt, sitemap, yönlendirmeler ve bağlantılar. Sayfanın hangi araçla üretildiği bunu değiştirmez.',
  },
  {
    icon: Puzzle,
    title: 'Altyapıyı tanırsa adımı ona göre yazar',
    body: 'Sayfanın imzasından altyapıyı tespit edebiliyorsa düzeltme adımları o panele göre anlatılır. Tanıyamazsa ölçüm durmaz; adımlar teknoloji bağımsız yazılır.',
  },
];

/** Birincil anlatım: her tür site. Kategoriler ürün ekiplerinin dilinde, e-ticaret yalnızca bir başlık. */
const STACKS: { icon: typeof Code2; title: string; note: string; items: string[] }[] = [
  {
    icon: LayoutTemplate,
    title: 'Site kurucular',
    note: 'Sürükle bırak araçlarla yapılmış kurumsal ve ajans siteleri.',
    items: ['WordPress · Elementor', 'Wix', 'Squarespace', 'Webflow', 'Framer', 'Weebly', 'Google Sites'],
  },
  {
    icon: Code2,
    title: 'Kodla yazılmış siteler',
    note: 'Ajansların kendi sitelerinin çoğu burada: elde yazılmış şablon ya da modern çatı.',
    items: [
      'HTML5 · CSS',
      'Bootstrap · Tailwind',
      'React · Next.js',
      'Vue · Nuxt',
      'Angular',
      'Svelte · Astro',
      'jQuery ile eski temalar',
    ],
  },
  {
    icon: Database,
    title: 'Sunucu tarafı uygulamalar',
    note: 'Kendi yazılımınızla ürettiğiniz sayfalar da aynı standartla ölçülür.',
    items: ['PHP · Laravel', 'Python · Django', 'Node.js · Express', '.NET', 'Java · Spring', 'Ruby on Rails'],
  },
  {
    icon: Globe,
    title: 'İçerik yönetimi',
    note: 'Blog ve kaynak sayfaları, kurumsal içerik merkezleri.',
    items: ['Drupal', 'Joomla', 'Ghost', 'Strapi', 'Contentful · Sanity', 'Statik site üreticileri'],
  },
  {
    icon: Store,
    title: 'Mağaza altyapıları',
    note: 'Ürün sayfaları için ek kontroller de devreye girer.',
    items: ['Shopify', 'ikas', 'Ticimax', 'IdeaSoft', 'T-Soft', 'WooCommerce', 'Magento · PrestaShop'],
  },
  {
    icon: Puzzle,
    title: 'Tek sayfalık ve kampanya siteleri',
    note: 'Reklam trafiği alan açılış sayfaları ve etkinlik siteleri.',
    items: ['Landing page araçları', 'Tek sayfa uygulamaları', 'Etkinlik ve kampanya siteleri', 'Mikro siteler'],
  },
];

/** İkincil: mağaza altyapılarında otomatik tanıma — etiketler platform-detect.ts ile tek kaynaktan. */
const DETECTED: { key: keyof typeof PLATFORM_LABELS; note: string }[] = [
  { key: 'SHOPIFY', note: 'Ürün ve koleksiyon uçlarından okur.' },
  { key: 'IKAS', note: 'Türkçe ürün sayfası kalıplarını tanır.' },
  { key: 'TICIMAX', note: 'Şablon kaynaklı eksik alanları işaretler.' },
  { key: 'IDEASOFT', note: 'Yinelenen başlıkları ayırt eder.' },
  { key: 'TSOFT', note: 'Sitemap bölünmesini kontrol eder.' },
  { key: 'WOOCOMMERCE', note: 'Eklenti kaynaklı çift şemayı görür.' },
  { key: 'MAGENTO', note: 'Katman navigasyonunun ürettiği adresleri işaretler.' },
  { key: 'PRESTASHOP', note: 'Çok dilli kurulumlarda hreflang eşlemesi.' },
  { key: 'OPENCART', note: 'Varsayılan şablonun boş meta alanları.' },
  { key: 'BIGCOMMERCE', note: 'Ürün şeması ve stok alanları.' },
  { key: 'WIX', note: 'Tarayıcıda üretilen içerik için uyarı.' },
  { key: 'SQUARESPACE', note: 'Blok tabanlı sayfalarda başlık hiyerarşisi.' },
];

/**
 * Ölçümün dayandığı açık standartlar — hangi kontrolün hangi belgeye baktığı kaynağıyla yazılır.
 * “Biz öyle diyoruz” yerine doğrulanabilir bir referans: hem okuyan hem alıntılayan için.
 */
const STANDARDS: { check: string; looks: string; source: string; href: string }[] = [
  {
    check: 'Başlık yapısı',
    looks: 'Sayfada tek bir H1 var mı, H2 ve H3 sırayla mı iniyor, bölümler ayrı ayrı alıntılanabiliyor mu.',
    source: 'HTML Living Standard — başlıklar',
    href: 'https://html.spec.whatwg.org/multipage/sections.html#headings-and-outlines',
  },
  {
    check: 'Yapısal veri (JSON-LD)',
    looks: 'Organization, Product, FAQPage gibi tipler var mı; şemada yazan ile sayfada görünen aynı mı.',
    source: 'schema.org tip listesi',
    href: 'https://schema.org/docs/schemas.html',
  },
  {
    check: 'Meta alanları',
    looks: 'title ve description sayfayı doğru tarif ediyor mu, boş ya da şablondan kopya mı.',
    source: 'Google — başlık ve snippet belgeleri',
    href: 'https://developers.google.com/search/docs/appearance/snippet',
  },
  {
    check: 'Bot erişimi',
    looks: 'robots.txt kuralları GPTBot, ClaudeBot, PerplexityBot gibi tarayıcıları farkında olmadan kapatıyor mu.',
    source: 'RFC 9309 — Robots Exclusion Protocol',
    href: 'https://www.rfc-editor.org/rfc/rfc9309.html',
  },
  {
    check: 'Model kaynağı bildirimi',
    looks: 'llms.txt dosyası var mı, içinde markayı anlatan kaynaklar doğru gösterilmiş mi.',
    source: 'llms.txt önerisi',
    href: 'https://llmstxt.org/',
  },
  {
    check: 'Çok dilli eşleme',
    looks: 'hreflang etiketleri karşılıklı mı, dil sürümleri birbirini doğru işaret ediyor mu.',
    source: 'Google — yerelleştirilmiş sürümler',
    href: 'https://developers.google.com/search/docs/specialty/international/localized-versions',
  },
];

const DEEPER = [
  {
    title: 'Mağaza bağlantısı',
    body: 'Shopify, ikas ve Ticimax için salt okunur katalog bağlantısı: ürünleriniz tek tek değil toplu denetlenir. Sipariş ve müşteri verisi çekilmez.',
    href: '/solutions/ecommerce',
    cta: 'E-ticaret çözümünü gör',
  },
  {
    title: 'AI ziyaret ölçümü',
    body: 'Yapay zekâ asistanlarından gelen ziyaretleri ve tarayıcı botlarının isteklerini ayrı ayrı görmek isterseniz siteye küçük bir ölçüm kodu eklenir. İsteğe bağlıdır.',
    href: '/docs',
    cta: 'Kurulum belgesi',
  },
];

const LIMITS = [
  'İçeriği yalnızca tarayıcıda oluşan sayfalarda metin görünmeyebilir; bunu hata değil, uyarı olarak yazarız.',
  'Bot koruması (WAF) isteğimizi reddederse skor üretmeyiz, “taranamadı” deriz.',
  'Giriş arkasındaki sayfalar, sepet ve ödeme adımları taranmaz.',
  'Ölçüm sitenizin yapay zekâya hazırlığını gösterir; modelin o gün hangi markayı söyleyeceğinin sözünü vermez.',
];

const FAQ = [
  {
    question: 'Siteme bir şey kurmam gerekiyor mu?',
    answer:
      'Hayır. Ücretsiz araçların tamamı alan adınızı yazmanız yeterli olacak şekilde çalışır; sayfanız yalnızca okunur. Yalnızca yapay zekâ kaynaklı ziyaretleri ölçmek isterseniz isteğe bağlı bir ölçüm kodu eklenir.',
  },
  {
    question: 'Sitem bir ajans tarafından elde kodlandı, listede yok. Olur mu?',
    answer:
      'Olur. Elde yazılmış HTML, Bootstrap teması ya da özel bir çatı fark etmez; ölçülen şeyler sayfanın kendisinde. Altyapı tanınmadığında yalnızca düzeltme adımlarının anlatımı teknoloji bağımsız olur, kontroller aynı kalır.',
  },
  {
    question: 'Sitem yavaşlar mı, sunucuma yük olur mu?',
    answer:
      'Tarama sırasında sınırlı sayıda istek gönderilir; her araç için istek, veri ve süre bütçesi vardır ve aynı siteye saatlik bir üst sınır uygulanır. Ölçüm kodu eklemediğiniz sürece sayfanızda çalışan hiçbir şey olmaz.',
  },
  {
    question: 'Türkçe dışındaki siteler de ölçülüyor mu?',
    answer:
      'Evet. Teknik kontroller dilden bağımsızdır. Çok dilli kurulumlarda hreflang eşlemesi ayrıca denetlenir; satın alma sorusu kapsaması şu an Türkçe soru setleriyle çalışır.',
  },
];

export default function UyumlulukPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Uyumluluk', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      <section className="pt-24 pb-16">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="eyebrow">Uyumluluk</div>
              <h1 className="font-display text-[40px] lg:text-[54px] tracking-tight mt-3 leading-[1.05]">
                Siteniz neyle yapıldıysa <span className="text-brand">onunla çalışır.</span>
              </h1>
              <p className="text-[17px] lg:text-[19px] text-ink-muted mt-6 leading-relaxed">
                Yanıt sitenize bağlanmaz, sitenizi okur. Ajansınızın kendi sitesi, kurumsal tanıtım sayfanız, bloğunuz
                ya da mağazanız; WordPress, Wix, Framer, Bootstrap ile yazılmış HTML, React veya Laravel fark etmez.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/arac" className="btn-primary inline-flex items-center gap-2">
                  Ücretsiz araçları dene <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/contact#sales" className="btn-secondary">
                  Ekiple görüş
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <Ciz name="uyum" alt="Farklı şekillerdeki bloklar tek bir bağlantı noktasına bağlanıyor" priority />
            </div>
          </div>
        </Container>
      </section>

      <Section className="band border-t border-hairline">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {HOW.map((h) => (
            <div key={h.title} className="card p-7 h-full">
              <span className="w-10 h-10 rounded-xl bg-brand-glow flex items-center justify-center">
                <h.icon className="w-[18px] h-[18px] text-brand" aria-hidden />
              </span>
              <h2 className="font-display text-[20px] mt-5 leading-snug">{h.title}</h2>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{h.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Ne ile yapılmış olursa olsun"
        title="Hangi teknolojilerle çalışıyor? Ajans sitesinden mağazaya, aynı ölçüm."
        intro="Aşağıdakiler sık karşılaştığımız yapılar. Listede olmayan bir teknoloji kullanıyorsanız da ölçüm çalışır: kontroller sayfanın HTML çıktısına bakar, onu üreten araca değil."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {STACKS.map((s) => (
            <div key={s.title} className="card p-6 h-full">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg bg-paper-2 border border-hairline flex items-center justify-center shrink-0">
                  <s.icon className="w-[17px] h-[17px] text-brand" aria-hidden />
                </span>
                <h3 className="font-display text-[18px] leading-snug">{s.title}</h3>
              </div>
              <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">{s.note}</p>
              <ul className="mt-4 space-y-1.5">
                {s.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-[13.5px] text-ink">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section
        className="band border-t border-hairline"
        eyebrow="Ek olarak"
        title="Mağaza altyapımı tanıyor mu?"
        intro="Evet; ürün sayfası olan sitelerde altyapı sayfanın imzasından tespit edilir ve düzeltme adımları doğrudan o panelin diliyle yazılır. Tanınmazsa ölçüm durmaz, adımlar teknoloji bağımsız yazılır."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DETECTED.map((p) => (
            <div key={p.key} className="card p-5 h-full">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand shrink-0" aria-hidden />
                <span className="font-display text-[16.5px]">{PLATFORM_LABELS[p.key]}</span>
              </div>
              <p className="text-[12.5px] text-ink-muted mt-2 leading-relaxed">{p.note}</p>
            </div>
          ))}
        </div>
        <p className="text-[13px] text-ink-faint mt-6">
          Tanınmayan altyapılar “tespit edilemedi” olarak işaretlenir; ölçüm ve öneriler teknoloji bağımsız devam eder.
        </p>
      </Section>

      <Section
        eyebrow="Neye göre ölçüyoruz"
        title="Ölçüm hangi standartlara bakıyor?"
        intro="Kısa cevap: kendi icat ettiğimiz bir listeye değil, açık web standartlarına. Aşağıdaki altı kontrolün her biri, yanında yazan belgeye dayanır; sayfanızı hangi araçla ürettiğiniz bu kontrolleri değiştirmez."
      >
        <div className="card overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[720px]">
            <caption className="sr-only">Kontroller ve dayandıkları açık standartlar</caption>
            <thead>
              <tr className="text-left text-ink-faint font-mono text-[11px] uppercase tracking-wider border-b border-hairline">
                <th scope="col" className="px-5 py-3.5">
                  Kontrol
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Sayfada neye bakar
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Kaynak
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {STANDARDS.map((s) => (
                <tr key={s.check} className="align-top">
                  <th scope="row" className="px-5 py-3.5 text-left text-ink font-medium whitespace-nowrap">
                    {s.check}
                  </th>
                  <td className="px-4 py-3.5 text-ink-muted leading-relaxed">{s.looks}</td>
                  <td className="px-4 py-3.5 leading-relaxed">
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-deep hover:text-brand"
                    >
                      {s.source}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="İsterseniz daha derin"
        title="Bağlantı kurmak zorunda değilsiniz — ama kurabilirsiniz."
        intro="Ücretsiz ölçüm için hiçbir bağlantı gerekmez. Katalogunuzu toplu denetlemek ya da yapay zekâdan gelen ziyaretleri görmek isterseniz iki isteğe bağlı yol var."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DEEPER.map((d) => (
            <div key={d.title} className="card p-7 h-full flex flex-col">
              <h3 className="font-display text-[21px]">{d.title}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{d.body}</p>
              <div className="mt-auto pt-6">
                <Link
                  href={d.href}
                  className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
                >
                  {d.cta} <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section className="band border-t border-hairline" eyebrow="Sınırlar" title="Neyi ölçmediğimizi de yazıyoruz.">
        <ul className="space-y-3 max-w-3xl">
          {LIMITS.map((l) => (
            <li key={l} className="flex gap-3 text-[14.5px] text-ink-muted leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden />
              {l}
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Sıkça sorulanlar" title="Uyumluluk hakkında.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock />
    </>
  );
}
