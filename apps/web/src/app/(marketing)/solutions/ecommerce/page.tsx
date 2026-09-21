import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Boxes,
  Check,
  MessageSquareQuote,
  PackageSearch,
  Radar,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Ciz } from '@/components/marketing/ciz';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { STATS } from '@/data/stats';
import { toolBySlug, toolPath } from '@/lib/tool-registry';

const PATH = '/solutions/ecommerce';

export const metadata = buildMetadata({
  title: 'E-ticaret — ürününüz yapay zekâda nasıl anlatılıyor?',
  description:
    'Alışveriş soruları artık önce yapay zekâya soruluyor. Ürün sayfalarınızın hangi sinyalleri eksik, cevapta kim öneriliyor, ne düzeltmeli? Kurulum gerekmez.',
  path: PATH,
});

/** Müşterinin satın almadan önce sorduğu gerçek kalıplar. */
const QUESTIONS = [
  'Bu ürünü hangi siteden almalıyım, fiyat farkı var mı?',
  '“X marka Y model” için en uygun seçenek hangisi?',
  'Bu kategoride hangi markalar güvenilir?',
  'Bu mağazanın iade ve kargo koşulları nasıl, kaç günde teslim ediyor?',
  'Bu ürünün muadili daha ucuz ne var?',
  'Türkiye’den satan, stokta olan mağaza öner.',
];

/** Semrush kalıbı: her kart = problem başlığı + çözüm cümlesi + ekran/çizim + engelsiz CTA. */
const ACTIONS: {
  icon: typeof ScanLine;
  title: string;
  body: string;
  bullets: string[];
  tool?: string;
  href?: string;
  cta: string;
  image?: string;
  imageAlt?: string;
}[] = [
  {
    icon: ShoppingBag,
    title: 'Mağazanız yapay zekâya ne anlatıyor?',
    body: 'Ana sayfadan ürün sayfasına kadar okunabilirlik, katalog yapısı, şema ve bot erişimi tek taramada çıkar.',
    bullets: ['Katalog ve kategori yapısı', 'Ürün şeması ve zorunlu alanlar', 'Bot erişimi ve sitemap'],
    tool: 'e-ticaret-ai-gorunurluk-testi',
    cta: 'Mağazamı tara',
  },
  {
    icon: PackageSearch,
    title: 'Ürün sayfanız cevap verebiliyor mu?',
    body: 'Tek bir ürün sayfasını alır, yapay zekânın cevap üretirken aradığı alanları tek tek işaretleriz.',
    bullets: [
      'Fiyat, stok, marka, GTIN alanları',
      'Açıklama derinliği ve şablon tekrarı',
      'Görsel ve alt metin sinyalleri',
    ],
    tool: 'urun-sayfasi-testi',
    cta: 'Ürün sayfamı test et',
  },
  {
    icon: Radar,
    title: 'O soruda kim öneriliyor?',
    body: 'Kategorinizdeki bir soruyu doğrudan modele sorar, cevapta hangi markaların geçtiğini ve sıranızı gösteririz.',
    bullets: ['Cevapta geçen markalar', 'Sizin konumunuz', 'Tarih ve model damgası'],
    tool: 'chatgpt-rank-checker',
    cta: 'Bir soru dene',
  },
  {
    icon: ScanLine,
    title: 'Botlar mağazanıza girebiliyor mu?',
    body: 'robots.txt ve sunucu yanıtlarınız yapay zekâ tarayıcılarını engelliyorsa görünürlük en baştan biter.',
    bullets: ['12 bot için kural çözümü', 'noindex ve canonical', 'llms.txt durumu'],
    tool: 'ai-crawler-testi',
    cta: 'Erişimi kontrol et',
  },
  {
    icon: Sparkles,
    title: 'Açıklamalarınız zayıfsa yeniden yazın',
    body: 'Doğrulanabilir özelliklerden yola çıkarak cevap verilebilir ürün metni, SSS ve şema iskeleti üretiriz.',
    bullets: ['Uydurma özellik yok', 'SSS ve meta çıktısı', 'Kopyalanabilir JSON-LD'],
    tool: 'urun-aciklama-yazici',
    cta: 'Açıklama üret',
  },
  {
    icon: Boxes,
    title: 'Tüm kataloğu tek tek değil toplu ölçün',
    body: 'Mağazanızı bağlarsanız ürün kataloğunuz salt okunur senkronlanır; hazırlık skoru ürün ürün çıkar.',
    bullets: ['Shopify, ikas, Ticimax', 'Sipariş ve müşteri verisi çekilmez', 'Panelde ürün bazlı liste'],
    href: '/uyumluluk',
    cta: 'Altyapı uyumluluğu',
    image: '/img/panel/tools.webp',
    imageAlt: 'Panelde araç listesi ekranı',
  },
];

const PLATFORM_LINKS: { label: string; href: string }[] = [
  { label: 'Shopify', href: '/solutions/shopify' },
  { label: 'ikas', href: '/solutions/ikas' },
  { label: 'Ticimax', href: '/solutions/ticimax' },
  { label: 'WooCommerce', href: '/uyumluluk' },
  { label: 'Magento', href: '/uyumluluk' },
  { label: 'IdeaSoft', href: '/uyumluluk' },
  { label: 'T-Soft', href: '/uyumluluk' },
  { label: 'PrestaShop', href: '/uyumluluk' },
  { label: 'OpenCart', href: '/uyumluluk' },
  { label: 'Özel yazılım', href: '/uyumluluk' },
];

const STEPS = [
  {
    n: '01',
    t: 'Tarayın',
    d: 'Alan adınızı yazın. Kurulum, kod ya da kart gerekmez; mağazanız yalnızca okunur.',
  },
  {
    n: '02',
    t: 'Sırayı görün',
    d: 'Bulgular önem sırasına dizilir: ne eksik, neden önemli, nasıl düzeltilir.',
  },
  {
    n: '03',
    t: 'Ölçmeye devam edin',
    d: 'Kategori sorularınız her gün aynı biçimde sorulur; değişimi panelde izlersiniz.',
  },
];

const FAQ = [
  {
    question: 'E-ticarette yapay zekâ görünürlüğü nedir?',
    answer:
      'E-ticarette yapay zekâ görünürlüğü, bir alışveriş sorusunun cevabında mağazanızın ve ürününüzün anılıp anılmadığı, anılıyorsa hangi bilgilerle anlatıldığıdır. Asistan cevabı üretirken ürün sayfanızdaki fiyat, stok, marka, GTIN gibi alanları, kategori yapısını ve şema verisini okur; bu alanlar eksik ya da sayfadaki bilgiyle çelişkiliyse ürününüz cevaba hiç girmez. Ölçüm, sayfanın hangi sinyalleri verdiğine bakar; modelin o gün ne söyleyeceğine değil.',
  },
  {
    question: 'Ürün sayfasında yapay zekâ için hangi alanlar gerekir?',
    answer:
      'Ürün sayfası testinde tek tek işaretlediğimiz alanlar şunlardır:\n— Fiyat ve para birimi, sayfadaki görünen fiyatla aynı olacak biçimde\n— Stok durumu (availability) ve teslim/kargo bilgisi\n— Marka, model ve varsa GTIN/MPN gibi ürün kimlikleri\n— Şablondan kopyalanmamış, ürünün kendi özelliklerini anlatan açıklama\n— Görsel ve alt metin; varyantların ayrı ayrı okunabilmesi\n— Sayfadaki bilgiyle birebir uyumlu Product şeması (JSON-LD)\nBu alanların şemada yazanı ile sayfada görünenin aynı olması, alanların var olmasından daha belirleyicidir.',
  },
  {
    question: 'Mağazamı bağlamadan kullanabilir miyim?',
    answer:
      'Evet. Bu sayfadaki araçların tamamı alan adınızı yazmanız yeterli olacak şekilde çalışır; hesap, e-posta ya da kart istemez. Bağlantı yalnızca tüm kataloğu toplu denetlemek istediğinizde gerekir.',
  },
  {
    question: 'Sipariş veya müşteri verisi çekiyor musunuz?',
    answer:
      'Hayır. Mağaza bağlantısı salt okunur ürün kapsamıyla sınırlıdır: ürün, varyant, fiyat ve stok alanları. Sipariş, müşteri ve ödeme verisine erişim istemiyoruz.',
  },
  {
    question: 'Hangi altyapılarla çalışıyor?',
    answer:
      'Ücretsiz araçlar her altyapıda çalışır; ölçülen şeyler sayfanın kendisinde. Katalog bağlantısı Shopify, ikas ve Ticimax için hazırdır; diğer altyapılarda ürün sayfalarınızı tek tek ya da sitemap üzerinden ölçeriz.',
  },
  {
    question: 'Ürünüm yapay zekâda mutlaka görünecek mi?',
    answer:
      'Böyle bir söz veremeyiz, veren de olmamalı. Biz sitenizin hazırlığını ölçer, eksikleri gösterir ve aynı soruyu her gün aynı biçimde sorarak değişimi takip ederiz. Modelin o gün ne söyleyeceği bizim elimizde değil.',
  },
  {
    question: 'Fiyat ve stok bilgim yanlış görünüyorsa ne yapmalıyım?',
    answer:
      'Çoğu durumda ürün şemasındaki fiyat ve stok alanları eksik ya da sayfadaki bilgiyle çelişiyordur. Ürün sayfası testi bu alanları tek tek işaretler; düzelttikten sonra tekrar tarayıp farkı görebilirsiniz.',
  },
];

export default function EcommerceSolutionPage() {
  const chatgpt = STATS.chatgptShare;
  const genAi = STATS.genAiUsage;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Çözümler', href: '/solutions' },
          { name: 'E-ticaret', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ} />

      {/* 1 — Hero */}
      <section className="pt-20 pb-14">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <div className="eyebrow">Çözüm · E-ticaret</div>
              <h1 className="font-display text-[40px] lg:text-[54px] tracking-tight mt-3 leading-[1.05]">
                Ürününüz yapay zekâda <span className="text-brand">nasıl anlatılıyor?</span>
              </h1>
              <p className="text-[17px] lg:text-[19px] text-ink-muted mt-6 leading-relaxed max-w-2xl">
                Alışveriş sorusu artık önce sohbete soruluyor. Cevapta hangi mağaza öneriliyor, sizin ürününüz hangi
                cümlelerle anlatılıyor, hangi alan eksik kaldığı için hiç anılmıyor? Alan adınızı yazın, 25 saniyede
                görün.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={toolPath('e-ticaret-ai-gorunurluk-testi')}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  Mağazamı ücretsiz tara <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <Link href="/contact?src=eticaret#sales" className="btn-secondary">
                  Ekiple görüş
                </Link>
              </div>
              <p className="text-[12.5px] text-ink-faint mt-4">
                Kayıt gerekmez · sayfanız yalnızca okunur · sipariş ve müşteri verisine dokunulmaz
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-hairline overflow-hidden bg-paper-3">
                <Image
                  src="/img/sektor/eticaret-altyapi.webp"
                  alt="Ürün listesi gösteren bir tarayıcı penceresi, yanında alışveriş sepeti ve kargo kutusu çizimi"
                  width={1200}
                  height={675}
                  priority
                  unoptimized
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 1b — Kısa cevap: sayfanın tek başına alıntılanabilir tanımı */}
      <section className="pb-14 border-b border-hairline">
        <Container>
          <div className="card p-7 lg:p-8 max-w-3xl">
            <div className="eyebrow">Kısa cevap</div>
            <h2 className="font-display text-[22px] lg:text-[26px] tracking-tight mt-3 leading-snug">
              E-ticarette yapay zekâ görünürlüğü nedir?
            </h2>
            <p className="text-[15.5px] lg:text-[16.5px] text-ink mt-4 leading-relaxed">
              E-ticarette yapay zekâ görünürlüğü, bir alışveriş sorusunun cevabında mağazanızın ve ürününüzün anılıp
              anılmadığı, anılıyorsa hangi bilgilerle anlatıldığıdır.
            </p>
            <p className="text-[14px] text-ink-muted mt-3.5 leading-relaxed">
              Asistan cevabı üretirken ürün sayfanızdaki fiyat, stok, marka ve ürün kimliği alanlarını, kategori
              yapısını, şema verisini ve bot erişimini okur. Bu sinyaller eksikse ya da sayfadaki bilgiyle çelişiyorsa
              ürününüz cevaba hiç girmez. Bu sayfadaki altı araç her birini ayrı ayrı ölçer; ölçüm sitenizin hazırlığını
              gösterir, modelin o gün ne söyleyeceğinin sözünü vermez.
            </p>
          </div>
        </Container>
      </section>

      {/* 2 — Müşteri soruları */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Müşteriniz bunu soruyor"
        title="Müşteriniz alışverişten önce yapay zekâya ne soruyor?"
        intro="Cevapta bir mağaza adı geçiyor. Sizinki değilse, o satış başka yere gitti."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUESTIONS.map((q) => (
            <div key={q} className="card p-5 h-full flex gap-3">
              <MessageSquareQuote className="w-4 h-4 text-brand shrink-0 mt-1" aria-hidden />
              <p className="text-[14.5px] leading-relaxed">{q}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 3 — Ne yapabilirsiniz (Semrush kartı kalıbı) */}
      <Section
        eyebrow="Ne yapabilirsiniz"
        title="Bugün ne yapabilirsiniz? Altı iş, hepsi hesapsız."
        intro="Her kart tek bir işi çözer ve engelsizdir: hesap açmadan çalıştırabilirsiniz."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ACTIONS.map((a) => {
            const tool = a.tool ? toolBySlug(a.tool) : undefined;
            const live = tool?.enabled === true;
            const href = a.href ?? (live ? toolPath(a.tool as string) : '/arac');
            return (
              <div key={a.title} className="card h-full flex flex-col overflow-hidden">
                {a.image && (
                  <span className="block border-b border-hairline bg-paper-2">
                    <Image
                      src={a.image}
                      alt={a.imageAlt ?? a.title}
                      width={900}
                      height={260}
                      unoptimized
                      className="w-full h-[128px] object-cover object-top"
                    />
                  </span>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <span className="w-10 h-10 rounded-xl bg-brand-glow flex items-center justify-center">
                    <a.icon className="w-[18px] h-[18px] text-brand" aria-hidden />
                  </span>
                  <h3 className="font-display text-[19px] mt-4 leading-snug">{a.title}</h3>
                  <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{a.body}</p>
                  <ul className="mt-4 space-y-1.5">
                    {a.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-[13px] text-ink-muted">
                        <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {b}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-5">
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand"
                    >
                      {a.cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 4 — Veri */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Neden şimdi"
        title="Neden şimdi? Alışveriş davranışı değişti."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[genAi, chatgpt].map((s) => (
            <div key={s.key} className="card p-7 h-full">
              <div className="font-display text-[44px] tabular leading-none text-brand">{s.value}</div>
              <div className="text-[14px] text-ink mt-3 leading-snug">{s.label}</div>
              <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">{s.sentence}</p>
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[11.5px] text-ink-faint mt-4 font-mono leading-relaxed hover:text-brand-deep"
              >
                Kaynak: {s.source} · {s.year}
              </a>
            </div>
          ))}
          <div className="card p-7 h-full flex flex-col justify-center">
            <p className="text-[15px] text-ink-muted leading-relaxed">
              Sorun “yapay zekâda görünmek” değil; müşterinizin sorduğu o cümlede mağazanızın anılıp anılmadığı.
            </p>
            <Link
              href={toolPath('chatgpt-rank-checker')}
              className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand mt-4"
            >
              Bir soruyla deneyin <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </Section>

      {/* 5 — Nasıl çalışır */}
      <Section eyebrow="Nasıl çalışır" title="Nasıl çalışıyor? Üç adım, aynı gün.">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <Ciz name="urun" alt="Bir alışveriş çantası ve yanında ürünü anlatan konuşma balonu" />
          </div>
          <div className="lg:col-span-7">
            <ol className="space-y-6">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-5">
                  <span className="font-display text-[22px] text-brand tabular shrink-0">{s.n}</span>
                  <div>
                    <h3 className="font-display text-[19px]">{s.t}</h3>
                    <p className="text-[14.5px] text-ink-muted mt-1.5 leading-relaxed">{s.d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-[14.5px] text-ink-muted mt-8 leading-relaxed">
              Listeyi uygulayacak vaktiniz yoksa{' '}
              <Link href="/yanit-agency" className="text-brand-deep hover:text-brand">
                Yanıt Agency ürün sayfalarınızı ve şemanızı düzeltir
              </Link>
              ; ölçüm yine aynı panelde durur.
            </p>
          </div>
        </div>
      </Section>

      {/* 6 — Altyapı */}
      <Section
        className="band border-t border-hairline"
        eyebrow="Altyapınız"
        title="Hangi altyapılarla çalışıyor?"
        intro="Ücretsiz araçlar için hiçbir bağlantı gerekmez. Katalog senkronu Shopify, ikas ve Ticimax için hazır; gerisinde ölçüm sayfalarınız üzerinden yürür."
      >
        <div className="flex flex-wrap gap-2.5">
          {PLATFORM_LINKS.map(({ label, href }) => (
            <Link key={label} href={href} className="chip !text-[13px] !px-4 !py-2 hover:border-brand">
              <Store className="w-3.5 h-3.5 text-brand" aria-hidden /> {label}
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Sıkça sorulanlar" title="E-ticaret için sorular.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock />
    </>
  );
}
