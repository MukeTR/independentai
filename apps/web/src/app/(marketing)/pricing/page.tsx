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

export const metadata = buildMetadata({
  title: 'Fiyatlandırma — Ücretsiz rapor, aylık abonelik, ajans sprinti',
  description:
    'Şok raporu ve tüm araçlar ücretsiz, hesap gerekmez. Yanıt aylık abonelik, ücretsiz deneme, kart gerekmez, istediğiniz zaman iptal. Yanıt Agency aylık sprint, teklifle.',
  path: '/pricing',
});

// Tek kaynak: entitlement.ts LAUNCH limitleri (pazarlama metni koddan sapmasın).
const LIMITS = computeEntitlement({ plan: 'LAUNCH', trialEndsAt: new Date() }).limits;
const PUBLIC_TOOL_COUNT = ECOMMERCE_TOOL_LINKS.length + RANK_CHECKER_LINKS.length;
const PANEL_TOOL_COUNT = DASHBOARD_TOOLS.length;

export default async function PricingPage() {
  const offer = await getOffer();
  const saas = formatTry(offer.saasMonthlyTry);
  const agency = formatTry(offer.agencyFromMonthlyTry);

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
        `Mağaza bağlantısı: ${LIMITS.storeConnections} mağaza, ${LIMITS.catalogProducts.toLocaleString('tr-TR')} ürün (beta)`,
        'E-posta + Slack uyarıları, haftalık rapor, paylaşılabilir rapor linki',
        `${LIMITS.members} ekip üyesi · Public API (${LIMITS.apiTokens} token, 60 istek/dk)`,
      ],
    },
    {
      name: 'Yanıt Agency',
      icon: Users,
      price: `${agency}’den`,
      period: 'ay · aylık sprint, teklifle',
      description:
        'Biz bulalım, biz uygulayalım. Yanıt’taki yapılacaklar listesini ekibimiz uygular; ilerlemeyi aynı panelden izlersiniz.',
      cta: { label: 'Ekiple görüş', href: '/contact#sales' },
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

  const PRICING_FAQS = [
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
      question: 'Yanıt Agency fiyatı neden “-den başlayan”?',
      answer: `Ajans hizmeti sitenizin büyüklüğüne, bulgu sayısına ve sprint kapsamına göre planlanır. ${agency}/ay başlangıç fiyatıdır; ön analizden sonra net teklif alırsınız. Yanıt aboneliği hizmete dahildir.`,
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
                  <div className="eyebrow">{p.name}</div>
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
        secondaryHref="/contact#sales"
        secondaryLabel="Yanıt Agency ile görüş"
      />
    </>
  );
}
