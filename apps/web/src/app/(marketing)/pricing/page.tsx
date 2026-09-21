import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, ArrowRight, Sparkles, Gift, Users } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { FaqJsonLd, BreadcrumbJsonLd } from '@/components/json-ld';
import { CtaBlock } from '@/components/marketing/cta-block';
import { buildMetadata } from '@/lib/seo';
import { formatTry } from '@independentai/shared';
import { getOffer } from '@/server/offer';
import { computeEntitlement } from '@/server/entitlement';
import { ECOMMERCE_TOOL_LINKS, RANK_CHECKER_LINKS } from '@/components/nav-data';
import { DASHBOARD_TOOLS } from '@/app/dashboard/tools/tools-data';

/**
 * Deneme süresi meta açıklamasında da sayfadaki rakamla aynı olmalı: sabit "14 gün" yazmak,
 * yönetim panelinden süre değiştiğinde arama sonucuyla sayfayı çelişkiye düşürüyordu.
 */
export async function generateMetadata(): Promise<Metadata> {
  const offer = await getOffer();
  return buildMetadata({
    title: 'Fiyatlandırma — ücretsiz rapor, abonelik ve ajans',
    description: `Ücretsiz rapor ve araçlar için hesap gerekmez. Yanıt aylık abonelik, ${offer.trialDays} gün ücretsiz deneme, kart istenmez; Yanıt Agency uygulamayı teklifle üstlenir.`,
    path: '/pricing',
  });
}

// Tek kaynak: entitlement.ts LAUNCH limitleri (pazarlama metni koddan sapmasın).
const LIMITS = computeEntitlement({ plan: 'LAUNCH', trialEndsAt: new Date() }).limits;
const PUBLIC_TOOL_COUNT = ECOMMERCE_TOOL_LINKS.length + RANK_CHECKER_LINKS.length;
const PANEL_TOOL_COUNT = DASHBOARD_TOOLS.length;

export default async function PricingPage() {
  const offer = await getOffer();
  const saas = formatTry(offer.saasMonthlyTry);

  const PLANS = [
    {
      name: 'Ücretsiz',
      icon: Gift,
      price: '₺0',
      period: 'hesap gerekmez',
      description: 'Nerede olduğunuzu görün: alan adınızı girin, şok raporu ve ücretsiz araçlar anında çalışsın.',
      cta: { label: 'Sitemi analiz et', href: '/' },
      secondary: { label: 'Ücretsiz araçlar', href: '/arac/e-ticaret-ai-gorunurluk-testi' },
      highlight: false,
      features: [
        'Şok raporu: alan adınız için 0-100 AI görünürlük skoru ve bulgular',
        `${PUBLIC_TOOL_COUNT} ücretsiz araç: e-ticaret AI testi, ürün sayfası testi, AI crawler testi, rank checker'lar`,
        'Kayıt yok, e-posta duvarı yok, kart yok',
        'Sonuç bağlantısı paylaşılabilir',
      ],
    },
    {
      name: 'Yanıt',
      icon: Sparkles,
      price: saas,
      period: 'ay · aylık, istediğiniz zaman iptal',
      description: `Biz bulalım, siz uygulayın. ${offer.trialDays} gün ücretsiz deneme; kart gerekmez, deneme sonunda otomatik ücretlendirme yapılmaz.`,
      cta: { label: `${offer.trialDays} gün ücretsiz dene`, href: '/register' },
      highlight: true,
      features: [
        'ChatGPT, Claude ve Gemini’de her gün otomatik ölçüm',
        `${LIMITS.prompts} izlenebilir soru · ${LIMITS.competitors} rakip (adil kullanım)`,
        'Görünürlük skoru, Share of Voice, 30 günlük trend',
        'Neden görünmediğinizi gösteren bulgular ve yapılacaklar listesi',
        `Panelde ${PANEL_TOOL_COUNT} GEO aracı (denetim, keşif, üretici, e-ticaret)`,
        `Mağaza bağlantısı: ${LIMITS.storeConnections} mağaza, ${LIMITS.catalogProducts.toLocaleString('tr-TR')} ürün`,
        'E-posta + Slack uyarıları, haftalık rapor, paylaşılabilir rapor linki',
        `${LIMITS.members} ekip üyesi · Public API (${LIMITS.apiTokens} token, 60 istek/dk)`,
      ],
    },
    {
      name: 'Yanıt Agency',
      icon: Users,
      price: 'Teklifle',
      period: 'aylık sprint · kapsam görüşmesinden sonra',
      description:
        'Biz bulalım, biz uygulayalım. Yanıt’taki yapılacaklar listesini ekibimiz uygular; ilerlemeyi aynı panelden izlersiniz. Sabit paket yoktur: kapsamı birlikte çıkarır, teklifi ona göre yazarız.',
      cta: { label: 'Yanıt Agency’yi inceleyin', href: '/yanit-agency#teklif' },
      highlight: false,
      features: [
        'Yanıt aboneliği dahil: ölçüm, bulgular, panel',
        'Teknik düzeltmeler: şema, robots/llms.txt, sayfa yapısı',
        'İçerik üretimi ve GEO/SEO uygulaması',
        'Dijital PR, atıf ve entity çalışması',
        'Aylık sprint planı ve ilerleme raporu',
        'Kapsam ve fiyat teklifle netleşir',
      ],
    },
  ];

  /**
   * Cevap-öncelikli karşılaştırma tablosu: bir asistan "Yanıt ne kadar?" sorusuna
   * tek satırdan cevap üretebilsin diye plan farkları paragrafa değil tabloya yazılır.
   */
  const COMPARE: [string, string, string, string][] = [
    ['Ne tür', 'Ücretsiz rapor ve araçlar', 'Yazılım — aylık abonelik', 'Hizmet — aylık sprint'],
    ['Fiyat', '₺0', `${saas} / ay`, 'Teklifle — kapsam görüşmesinden sonra'],
    [
      'Hesap gerekir mi',
      'Hayır; kayıt, e-posta ve kart istenmez',
      `Evet; ${offer.trialDays} gün ücretsiz deneme, kart istenmez`,
      'Evet; Yanıt aboneliği hizmete dahildir',
    ],
    [
      'Ölçüm sıklığı',
      'Tek seferlik tarama, istediğiniz kadar tekrar',
      'Her gün, aynı sorular aynı biçimde',
      'Her gün + ay sonu değerlendirme görüşmesi',
    ],
    ['Yapılacakları kim uygular', 'Siz', 'Siz ya da mevcut ajansınız', 'Yanıt Agency ekibi; ilerleme aynı panelde'],
    ['Taahhüt', 'Yok', 'Aylık, istediğiniz zaman iptal', 'Aylık; devam kararı her ay sonunda'],
  ];

  const PRICING_FAQS = [
    {
      question: 'Yanıt ne kadar, fiyata neler dahil?',
      answer: `Yanıt aboneliği ${saas}/ay’dır ve ${offer.trialDays} gün ücretsiz denenir; kart istenmez. Fiyata ChatGPT, Claude ve Gemini sorgu maliyetleri, ${LIMITS.prompts} izlenebilir soru, ${LIMITS.competitors} rakip, panelde ${PANEL_TOOL_COUNT} GEO aracı, ${LIMITS.members} ekip üyesi ve paylaşılabilir rapor bağlantısı dahildir. Ana sayfadaki rapor ve ${PUBLIC_TOOL_COUNT} herkese açık araç ise ücretsizdir, hesap gerektirmez.`,
    },
    {
      question: 'Yanıt ile Yanıt Agency arasındaki fark ne?',
      answer: `Yanıt bir yazılımdır: ölçer, neyin eksik olduğunu gösterir ve düzeltme sırasını verir; uygulamayı siz ya da ajansınız yapar (${saas}/ay). Yanıt Agency ise bir hizmettir: aynı listeyi uygulayan ekiptir ve aylık sprintle çalışır. Ajans tarafının yayımlanmış bir fiyatı yoktur; kapsam görüşmesinden sonra teklif verilir. Yanıt aboneliği ajans hizmetine dahildir; ajans tarafını almadan da yalnızca yazılımı kullanabilirsiniz.`,
    },
    {
      question: 'Gerçekten ücretsiz olan ne?',
      answer: `Şok raporu (ana sayfadaki analiz) ve tüm /arac araçları ücretsizdir; hesap açmanız, e-posta bırakmanız veya kart girmeniz gerekmez. Sürekli izleme, rakip karşılaştırması ve yapılacaklar listesi Yanıt aboneliğindedir; ${offer.trialDays} gün ücretsiz denersiniz.`,
    },
    {
      question: `${offer.trialDays} günlük deneme nasıl işler, kart gerekir mi?`,
      answer:
        'Kart gerekmez. Kayıt anında deneme başlar, tüm Yanıt özellikleri açıktır. Süre sonunda otomatik ücretlendirme yapılmaz; devam etmek isterseniz aboneliği başlatırsınız, istemezseniz hesap salt-okunur moda geçer ve verileriniz silinmez (7 gün ek süre tanınır).',
    },
    {
      question: 'Aboneliği ne zaman iptal edebilirim?',
      answer:
        'İstediğiniz zaman. Yanıt aylık faturalanır, taahhüt yoktur. İptal ettiğiniz dönemin sonuna kadar erişiminiz sürer; sonrasında hesap salt-okunur olur, ölçüm geçmişiniz görüntülenmeye devam eder.',
    },
    {
      question: 'Yanıt Agency’nin fiyatı neden sayfada yazmıyor?',
      answer:
        'Ajans hizmeti sitenizin büyüklüğüne, bulgu sayısına ve sprint kapsamına göre planlanır; bu üçü bilinmeden yazılan bir rakam ya sizi yanıltır ya bizi. Bu yüzden fiyat listelemiyoruz: Yanıt Agency sayfasındaki formu doldurun, sitenizi okuyup gelelim ve kapsam görüşmesinden sonra net teklif verelim. Yanıt aboneliği hizmete dahildir.',
    },
    {
      question: 'AI sağlayıcı maliyetleri fiyata dahil mi?',
      answer:
        'Evet. ChatGPT, Claude ve Gemini sorgu maliyetleri Yanıt aboneliğine dahildir; ayrıca API anahtarı almanız gerekmez. “Kendi anahtarınızı kullanın” seçeneğini değerlendiriyoruz; henüz yok.',
    },
    {
      question: 'Adil kullanım sınırını aşarsam ne olur?',
      answer: `Yanıt planında ${LIMITS.prompts} soru, ${LIMITS.competitors} rakip, ${LIMITS.members} ekip üyesi ve günde ${LIMITS.manualRunsPerDay} manuel çalıştırma sınırı vardır; sınıra yaklaşınca panel uyarır, sürpriz fatura yoktur. Daha yüksek limit için bize yazın.`,
    },
    {
      question: 'Yıllık ödeme, öğrenci veya non-profit indirimi var mı?',
      answer:
        'Şu an yalnızca aylık abonelik var. Yıllık ödeme indirimi ile öğrenci, erken aşama startup ve non-profit indirimlerini değerlendiriyoruz; oran ve koşullar duyurulmadı.',
    },
    {
      question: 'Ödemeyi nasıl yapıyorum?',
      answer:
        'Online kart ödemesi henüz açılmadı; deneme sonunda devam etmek istediğinizde ekibimiz sizinle aboneliği başlatır ve fatura keser. Kart ile self-servis ödeme yol haritamızda.',
    },
  ];

  return (
    <>
      <FaqJsonLd items={PRICING_FAQS} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Fiyatlandırma', href: '/pricing' },
        ]}
      />

      <section className="pt-24 pb-12">
        <Container className="text-center">
          <div className="inline-flex items-center gap-2 chip mx-auto">
            <Sparkles className="w-3 h-3 text-brand" aria-hidden />
            <span className="font-mono tracking-eyebrow">Rapor ücretsiz · {offer.trialDays} gün deneme · kart yok</span>
          </div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-6 leading-[1.02]">
            Sade fiyatlandırma.
            <br />
            <span className="text-brand">Önce ücretsiz görün, sonra karar verin.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-6 max-w-2xl mx-auto leading-relaxed">
            Nerede olduğunuzu görmek ücretsiz. Sürekli ölçüm ve yapılacaklar için Yanıt’ı {offer.trialDays} gün deneyin;
            uygulamayı da bize bırakmak isterseniz Yanıt Agency aylık sprintle çalışır.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          {/* h1 → h3 atlamasını önleyen bölüm başlığı; tasarım aynı kalsın diye yalnız ekran okuyucuya görünür. */}
          <h2 className="sr-only">Planlar ve fiyatlar</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`card p-7 flex flex-col ${p.highlight ? 'ring-2 ring-brand bg-paper-3' : ''}`}
              >
                {p.highlight && (
                  <div className="chip own !text-[10px] mb-4 self-start">
                    <Sparkles className="w-3 h-3" aria-hidden /> en çok tercih edilen
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <p.icon className="w-4 h-4 text-brand" aria-hidden />
                  <h3 className="eyebrow">{p.name}</h3>
                </div>
                <div
                  className={`font-display tracking-tight mt-2 tabular ${p.highlight ? 'text-[48px]' : 'text-[40px]'}`}
                >
                  {p.price}
                </div>
                <div className="text-[12px] text-ink-faint -mt-1">/ {p.period}</div>
                <p className="text-[13.5px] text-ink-muted mt-4 leading-relaxed">{p.description}</p>

                <ul className="space-y-2.5 mt-6 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[13px]">
                      <Check className="w-3.5 h-3.5 mt-1 text-brand shrink-0" aria-hidden />
                      <span className="text-ink">{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.cta.href}
                  className={`mt-7 ${p.highlight ? 'btn-primary' : 'btn-secondary'} w-full inline-flex items-center justify-center gap-2 text-[14px]`}
                >
                  {p.cta.label} <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                {'secondary' in p && p.secondary && (
                  <Link
                    href={p.secondary.href}
                    className="mt-3 text-center text-[12.5px] text-brand-deep hover:text-brand"
                  >
                    {p.secondary.label} →
                  </Link>
                )}
              </div>
            ))}
          </div>

          <p className="text-center text-[12px] text-ink-faint mt-10 font-mono">
            // Fiyatlar ₺ cinsindendir; deneme sonunda otomatik ücretlendirme yapılmaz
          </p>
        </Container>
      </section>

      <Section
        className="band border-t border-hairline"
        eyebrow="Karşılaştırma"
        title="Hangisi size uygun?"
        intro={`Kısa cevap: nerede olduğunuzu görmek ₺0 ve hesap istemez. Sürekli ölçüm istiyorsanız Yanıt aboneliği ${saas}/ay, ${offer.trialDays} gün ücretsiz. Uygulamayı da devretmek isterseniz Yanıt Agency aylık sprintle çalışır; fiyatı kapsam görüşmesinden sonra teklifle verilir.`}
      >
        <div className="card overflow-x-auto">
          <table className="w-full text-[13.5px] min-w-[760px]">
            <caption className="sr-only">Ücretsiz rapor, Yanıt aboneliği ve Yanıt Agency karşılaştırması</caption>
            <thead>
              <tr className="text-left text-ink-faint font-mono text-[11px] uppercase tracking-wider border-b border-hairline">
                <th scope="col" className="px-5 py-3.5">
                  Karşılaştırma
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Ücretsiz
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Yanıt
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Yanıt Agency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {COMPARE.map((r) => (
                <tr key={r[0]} className="align-top">
                  <th scope="row" className="px-5 py-3.5 text-left text-ink font-medium whitespace-nowrap">
                    {r[0]}
                  </th>
                  <td className="px-4 py-3.5 text-ink-muted leading-relaxed">{r[1]}</td>
                  <td className="px-4 py-3.5 text-ink leading-relaxed">{r[2]}</td>
                  <td className="px-4 py-3.5 text-ink-muted leading-relaxed">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[13px] text-ink-faint mt-5 max-w-3xl leading-relaxed">
          Yanıt yazılımdır, Yanıt Agency hizmettir. İkisi zorunlu bir paket değildir: yalnızca ölçüm alıp uygulamayı
          kendi ekibinizle yapabilirsiniz.
        </p>
      </Section>

      <Section eyebrow="Sıkça sorulanlar" title="Fiyatlandırma soruları.">
        <Faq items={PRICING_FAQS} defaultOpen={0} />
      </Section>

      <CtaBlock
        eyebrow="Önce ücretsiz"
        title={
          <>
            Bugün raporunuzu alın, <span className="text-brand">karar {offer.trialDays} gün sonra.</span>
          </>
        }
        body="Alan adınızı girin, şok raporunuzu görün. Sürekli ölçüm için hesap açın; kart gerekmez."
        primaryHref="/register"
        primaryLabel={`${offer.trialDays} gün ücretsiz dene`}
        secondaryHref="/yanit-agency#teklif"
        secondaryLabel="Yanıt Agency’den teklif alın"
      />
    </>
  );
}
