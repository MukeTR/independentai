import Link from 'next/link';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import type { Offer } from '@independentai/shared';
import { getOffer } from '@/server/offer';
import { ArrowRight, BookOpen, Rocket, Zap, KeyRound, Webhook, FileText, Gauge, Wrench, Bot } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Dokümantasyon',
  description:
    'Yanıt kurulum ve kullanım rehberleri, skor yöntemi (görünürlük, Share of Voice, site araçları), ücretsiz araç uçları ve Public API.',
  path: '/docs',
});

const SECTIONS = [
  {
    icon: Rocket,
    title: 'Hızlı başlangıç',
    description: '5 dakikada kayıt, kurulum ve ilk panel.',
    items: [
      { t: 'Hesap oluşturma', href: '#account' },
      { t: 'Kurulum (3 adım)', href: '#onboarding' },
      { t: 'İlk soruyu ekleme', href: '#first-prompt' },
      { t: 'Paneli okuma', href: '#reading-dashboard' },
    ],
  },
  {
    icon: Gauge,
    title: 'Skorlar ve yöntem',
    description: 'Görünürlük, Share of Voice, pozisyon, site araçlarının 0–100 skoru; sınırlamalar.',
    items: [
      { t: 'Görünürlük skoru', href: '#skorlar' },
      { t: 'Share of Voice', href: '#sov' },
      { t: 'Site araçları skoru', href: '#arac-skoru' },
      { t: 'Sınırlamalar', href: '#sinirlamalar' },
    ],
  },
  {
    icon: BookOpen,
    title: 'Kavramlar',
    description: 'Alias eşleşmesi, atıf, sahipsiz soru, hazırlık skoru.',
    items: [
      { t: 'Alias eşleşmesi', href: '#alias' },
      { t: 'Sentiment', href: '#sentiment' },
      { t: 'Sözlük', href: '/resources/glossary' },
    ],
  },
  {
    icon: Zap,
    title: 'En iyi pratikler',
    description: 'Etkili soru yazımı, alias ve rakip seçimi, trend okuma.',
    items: [
      { t: 'Hangi soruları izlemeli?', href: '#what-prompts' },
      { t: 'Etkili alias listesi', href: '#alias-tips' },
      { t: 'Rakip seçimi', href: '#competitor-tips' },
      { t: 'Trend yorumlama', href: '#trend-reading' },
    ],
  },
  {
    icon: Wrench,
    title: 'Ücretsiz araç uçları',
    description: 'Hesap gerektirmeyen /api/tools/* uçları: girdi, çıktı, sınırlar.',
    items: [
      { t: 'Genel kurallar ve limitler', href: '#araclar' },
      { t: 'Uç listesi', href: '#arac-uclari' },
      { t: 'YanitBot', href: '/bot' },
    ],
  },
  {
    icon: KeyRound,
    title: 'Public API',
    description: 'v1 — salt-okunur görünürlük verisi, Bearer token, 60 istek/dk.',
    items: [
      { t: 'Kimlik doğrulama', href: '/docs/api#auth' },
      { t: 'GET /api/v1/visibility', href: '/docs/api#endpoint' },
      { t: 'Rate limit', href: '/docs/api#rate-limit' },
      { t: 'Ücretsiz araç uçları', href: '/docs/api#tools' },
    ],
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    description: 'Olay tabanlı entegrasyonlar — planlanıyor, henüz yok.',
    items: [{ t: 'Planlanan kapsam', href: '/docs/webhooks' }],
    badge: 'yakında',
  },
  {
    icon: FileText,
    title: 'Veri export',
    description: 'CSV, Google Sheets ve Looker Studio bağlantısı — planlanıyor; bugün Public API kullanın.',
    items: [{ t: 'Public API ile veri çekme', href: '/docs/api#examples' }],
    badge: 'yakında',
  },
];

/** Hızlı başlangıç; deneme süresi admin ayarından (`server/offer.ts`) gelir. */
function buildQuickStart(offer: Offer) {
  return [
    {
      id: 'account',
      n: '01',
      t: 'Hesap oluşturun',
      c: `/register adresine gidin. E-posta, şifre, şirket adı yeterli. Kart gerekmez; ${offer.trialDays} gün boyunca tüm özellikler açık.`,
    },
    {
      id: 'onboarding',
      n: '02',
      t: 'Kurulum (3 adım)',
      c: '1) Marka adınızı + 3–5 alternatif yazımı (alias) girin. 2) 3–5 rakip ekleyin. 3) Sektörünüzü seçin; önerilen soruların 3–5’ini alın ya da kendi müşteri sorularınızı yazın. Süre: ~2 dakika. Kurulum bitince siteniz otomatik taranır.',
    },
    {
      id: 'first-prompt',
      n: '03',
      t: 'İlk soruyu ekleyin',
      c: 'Panelde “Sorular” sekmesi. Müşterilerinizin satın almadan önce sorabileceği soruları yazın; örn. “Restoranlar için en iyi POS yazılımı”. “Şimdi çalıştır” ile 10–20 saniyede üç modelin cevabını görürsünüz.',
    },
    {
      id: 'reading-dashboard',
      n: '04',
      t: 'Paneli okuyun',
      c: 'Görünürlük = soruların yüzde kaçında markanız geçti. Share of Voice = sizin + rakiplerin toplam bahsi içinde payınız. Trend = son 30 günde değişim. Modele göre = ChatGPT / Claude / Gemini kırılımı. Görünürlük boşluğu = rakip var, siz yoksunuz.',
    },
  ];
}

const CONCEPTS = [
  {
    id: 'alias',
    t: 'Alias eşleşmesi',
    c: 'Marka adı ve alternatif yazımları cevap metninde kelime sınırlarıyla, Türkçe büyük/küçük harf duyarsız (İ/i, I/ı), NFC normalize aranır. Kesme işaretli ekler (“Acme’nin”) bahsi bozmaz; iç içe adlarda en uzun eşleşme kazanır. Deterministiktir; LLM yorumu yoktur.',
  },
  {
    id: 'sentiment',
    t: 'Sentiment',
    c: 'Heuristik + LLM sınıflandırma; sağlayıcı anahtarı yoksa yalnızca heuristik. Skor: POZİTİF 100 / NÖTR 50 / NEGATİF 0. Beta olduğu için tek başına karar metriği değil, bağlam cümlesiyle birlikte okuyun.',
  },
];

const PRACTICES = [
  {
    id: 'what-prompts',
    t: 'Hangi soruları izlemeli?',
    c: 'Alıcı niyeti taşıyan, marka içermeyen sorular: “KOBİ için en iyi CRM”, “İstanbul’da güvenilir saç ekimi kliniği”. “Acme iyi mi?” izlemek anlamsızdır; markanız zaten geçer. Sektör sayfalarındaki 5 soru iyi bir başlangıçtır.',
  },
  {
    id: 'alias-tips',
    t: 'Etkili alias listesi',
    c: 'Ana ad, kısaltma, alan adı, birleşik/ayrık yazımlar, eski marka adı. Çok genel kelimeleri (ör. “Yanıt”) tek başına eklemeyin; yanlış pozitif üretir.',
  },
  {
    id: 'competitor-tips',
    t: 'Rakip seçimi',
    c: 'Müşterinin sizinle kıyasladığı 3–5 marka; pazar payı en büyük değil, aynı soruda çıkanlar. Rakip kıyas aracı ile toplantıda hızlıca doğrulayabilirsiniz.',
  },
  {
    id: 'trend-reading',
    t: 'Trend yorumlama',
    c: 'Tek günlük dalgalanma normaldir; cevaplar oturumdan oturuma değişir. 7 ve 30 günlük ortalamaya bakın; düşüş uyarısı bu yüzden tek güne değil seriye bağlıdır.',
  },
];

/** Ücretsiz araç uçları — hesap yok, e-posta yok. Yeni site araçları (`/api/tools/site/*`) INTEGRATE ile eklenir. */
const TOOL_ENDPOINTS = [
  {
    m: 'POST',
    p: '/api/tools/geo-audit',
    b: '{ url }',
    d: 'GEO hazırlık denetimi: 5 eksen, 0–100, bulgular. IP başına 10/saat.',
  },
  {
    m: 'POST',
    p: '/api/tools/rank-check',
    b: '{ brand, prompt, provider: OPENAI|ANTHROPIC|GOOGLE }',
    d: 'Tek soruda markanız anıldı mı, kaçıncı sırada, yerine kim önerildi. IP başına 8/saat; sağlayıcı yoksa 503.',
  },
  {
    m: 'POST',
    p: '/api/tools/ecommerce-visibility',
    b: '{ url }',
    d: 'Mağaza AI görünürlük testi (6 eksen, 25 sn bütçe).',
  },
  {
    m: 'POST',
    p: '/api/tools/product-page',
    b: '{ url }',
    d: 'Ürün sayfası testi: Product şeması, içerik, crawler erişimi.',
  },
  {
    m: 'POST',
    p: '/api/tools/ai-crawler',
    b: '{ url }',
    d: 'AI crawler erişim testi: robots.txt, llms.txt, meta robots.',
  },
  {
    m: 'POST',
    p: '/api/tools/agency-preanalysis',
    b: '{ domains: string[] (≤3) }',
    d: 'Ajans ön-analizi: skor + platform + 3 bulgu. IP başına 3/saat.',
  },
  {
    m: 'POST',
    p: '/api/tools/platform-detect',
    b: '{ url }',
    d: 'E-ticaret platformu tespiti (Shopify, ikas, Ticimax…).',
  },
];

export default async function Docs() {
  const QUICK_START = buildQuickStart(await getOffer());
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Dokümantasyon', href: '/docs' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Dokümantasyon</div>
          <h1 className="font-display text-[48px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Yanıt’ı <span className="text-brand">en iyi şekilde kullanın.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Kurulum, skor yöntemi, ücretsiz araç uçları ve Public API. Public API yayında; webhooks ve veri export
            yakında.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((s) => (
              <div key={s.title} className={`card p-7 ${'badge' in s && s.badge ? 'border-dashed' : ''}`}>
                <div className="flex items-center justify-between">
                  <s.icon className="w-5 h-5 text-brand" aria-hidden />
                  {'badge' in s && s.badge && <span className="chip !text-[10px]">{s.badge}</span>}
                </div>
                <h2 className="font-display text-[19px] mt-4">{s.title}</h2>
                <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{s.description}</p>
                <ul className="space-y-2 mt-5">
                  {s.items.map((i) => (
                    <li key={i.t}>
                      <Link
                        href={i.href}
                        className="text-[13px] text-ink-muted hover:text-brand-deep inline-flex items-center gap-1.5 transition"
                      >
                        <ArrowRight className="w-3 h-3" aria-hidden />
                        {i.t}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Section id="hizli-baslangic" eyebrow="Hızlı başlangıç" title="5 dakikada başlangıç." className="bg-paper-2/40">
        <div className="space-y-10">
          {QUICK_START.map((s) => (
            <div key={s.id} id={s.id} className="border-l-2 border-brand/40 pl-6 scroll-mt-24">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
              <h3 className="font-display text-[22px] tracking-tight mt-2">{s.t}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed max-w-2xl">{s.c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="skorlar"
        eyebrow="Skorlar ve yöntem"
        title="Her skorun formülü burada."
        intro="Açıklamasız 0–100 sahte kesinliktir. Panel, Public API, haftalık rapor ve uyarılar aynı fonksiyonları kullanır; farklı yüzeylerde farklı sonuç çıkmaz. Kaynak: packages/shared/src/metrics.ts ve docs/METRICS.md."
        className="scroll-mt-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div id="visibility" className="card p-6 scroll-mt-24">
            <div className="eyebrow">Görünürlük (visibility)</div>
            <p className="font-mono text-[12.5px] mt-3 leading-relaxed text-ink">
              kendi markanın en az bir kez geçtiği SUCCESS çalıştırma sayısı
              <br />÷ SUCCESS çalıştırma sayısı × 100
            </p>
            <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">
              Bir çalıştırma = bir soru × bir model × bir gün. Markanız aynı cevapta birden çok kez geçse de o
              çalıştırma bir kez sayılır. Hatalı (ERROR) çalıştırmalar paydaya girmez; ayrıca raporlanır. Paydası
              sıfırsa skor 0.
            </p>
          </div>
          <div id="sov" className="card p-6 scroll-mt-24">
            <div className="eyebrow">Share of Voice</div>
            <p className="font-mono text-[12.5px] mt-3 leading-relaxed text-ink">
              kendi marka bahis sayısı
              <br />÷ (kendi + rakip bahis sayısı) × 100
            </p>
            <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">
              Çalıştırma başına marka başına en fazla 1 bahis. Yalnızca panelde tanımlı rakipler hesaba girer;
              tanımlamadığınız marka “rakip” sayılmaz.
            </p>
          </div>
          <div id="pozisyon" className="card p-6 scroll-mt-24">
            <div className="eyebrow">Pozisyon ve öneri oranı</div>
            <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">
              Pozisyon: cevapta tanınan markaların (kendi + rakipler) ilk geçiş sırası; 1 en iyi. Ortalama pozisyon
              yalnızca markanızın geçtiği çalıştırmalar üzerinden hesaplanır. Öneri oranı: kendi bahislerinin yüzde kaçı
              “önerildi” bağlamında.
            </p>
          </div>
          <div id="arac-skoru" className="card p-6 scroll-mt-24">
            <div className="eyebrow">Site araçları (0–100)</div>
            <p className="font-mono text-[12.5px] mt-3 leading-relaxed text-ink">
              eksen skoru = kazanılan / mümkün × 100
              <br />
              toplam = Σ(eksen skoru × eksen ağırlığı) / Σ ağırlık
            </p>
            <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">
              Her kontrol geç (1) / uyar (0,5) / kal (0) üretir; yalnızca uygulanabilen kontroller sayılır.
              Deterministik, crawl-only: aynı girdi, aynı skor. LLM yok, JavaScript render yok. Skorun altında kontrol
              sayısı, tarih ve “hazırlık ölçer, AI davranışını değil” notu yazar. Eksen ağırlıkları
              docs/COMMERCE_SCORING.md’de.
            </p>
          </div>
        </div>
        <div id="sinirlamalar" className="card p-6 mt-5 scroll-mt-24">
          <div className="eyebrow">Sınırlamalar (okuyun)</div>
          <ul className="mt-3 space-y-2 text-[13.5px] text-ink-muted list-disc pl-5 leading-relaxed">
            <li>Yapay zekâ cevapları oturumdan oturuma değişir; tek sorguya hüküm bağlamayın, seriye bakın.</li>
            <li>Site araçları hazırlığı ölçer; “ChatGPT sizi önerecek” anlamına gelmez.</li>
            <li>JavaScript ile render edilen içerik ham HTML’de görünmeyebilir: hata değil, uyarı.</li>
            <li>
              Çoklu H1, llms.txt yokluğu, X-XSS-Protection eksikliği gibi tartışmalı kontroller düşük ağırlıklı
              uyarıdır.
            </li>
            <li>Hız verisi (PSI/CrUX) yoktur.</li>
            <li>
              Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.
            </li>
          </ul>
        </div>
      </Section>

      <Section id="kavramlar" eyebrow="Kavramlar" title="Tespit nasıl çalışır?" className="bg-paper-2/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {CONCEPTS.map((c) => (
            <div key={c.id} id={c.id} className="card p-6 scroll-mt-24">
              <h3 className="font-display text-[19px]">{c.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{c.c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="pratikler" eyebrow="En iyi pratikler" title="Doğru soru, doğru rakip, doğru okuma.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {PRACTICES.map((c) => (
            <div key={c.id} id={c.id} className="card p-6 scroll-mt-24">
              <h3 className="font-display text-[19px]">{c.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{c.c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="araclar"
        eyebrow="Ücretsiz araç uçları"
        title="/api/tools/* — hesap yok, e-posta yok."
        intro="Ücretsiz araçların arkasındaki uçlar herkese açıktır ve JSON döner. Kayıtsız kullanımda IP başına saatlik sınır ve küresel tavan vardır; 429’da Retry-After başlığı bekleme süresini verir. Yalnızca http/https ve herkese açık adresler; özel ağ adresleri 400 döner. Sonuçlar önbelleğe alınabilir: yeni site araçlarında 24 saate, eski araçlarda 10 dakikaya kadar."
        className="bg-paper-2/40 scroll-mt-24"
      >
        <div id="arac-uclari" className="card overflow-x-auto scroll-mt-24">
          <table className="w-full text-[13px] min-w-[720px]">
            <thead>
              <tr className="text-left text-ink-faint font-mono text-[11px] uppercase tracking-wider border-b border-hairline">
                <th className="px-5 py-3">Uç</th>
                <th className="px-4 py-3">Gövde (JSON)</th>
                <th className="px-4 py-3">Ne döner / sınır</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {TOOL_ENDPOINTS.map((e) => (
                <tr key={e.p} className="align-top">
                  <td className="px-5 py-3 font-mono text-[12.5px] whitespace-nowrap">
                    <span className="text-brand-deep">{e.m}</span> {e.p}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px] text-ink-muted">{e.b}</td>
                  <td className="px-4 py-3 text-ink-muted">{e.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[12.5px] text-ink-faint mt-4 font-mono">
          // Yeni site araçları (SEO karnesi, WhatsApp önizleme, güvenlik başlıkları, yönlendirme zinciri, kırık link,
          robots/sitemap, hreflang, şema denetimi, satın alma sorusu kapsama, güven sinyalleri, rakip kıyas) aynı
          kurallarla /api/tools/site/&lt;araç&gt; altında yayımlanır; tam liste /docs/api#tools.
        </p>
        <div className="mt-6 flex items-center gap-3 flex-wrap text-[13.5px]">
          <Link href="/docs/api#tools" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            Araç uçları ayrıntısı <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
          <Link href="/bot" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            <Bot className="w-3.5 h-3.5" aria-hidden /> Tarayıcımız YanitBot
          </Link>
        </div>
      </Section>
    </>
  );
}
