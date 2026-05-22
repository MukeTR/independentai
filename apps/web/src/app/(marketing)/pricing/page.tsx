import Link from 'next/link';
import { Check, X, ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { FaqJsonLd, BreadcrumbJsonLd } from '@/components/json-ld';
import { CtaBlock } from '@/components/marketing/cta-block';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Fiyatlandırma — İlk 6 ay ücretsiz',
  description:
    'Lansman fırsatı: 2026-05-22 itibarıyla kayıt olan herkese ilk 6 ay tüm özellikler tamamen ücretsiz. Kredi kartı gerekmez.',
  path: '/pricing',
});

const PLANS = [
  {
    name: 'Launch',
    price: '₺0',
    period: '6 ay',
    description: 'Lansman fırsatı — bugün kayıt olanların tamamına 6 ay boyunca her şey dahil.',
    cta: { label: '6 ay ücretsiz başla', href: '/register' },
    highlight: true,
    features: [
      { v: true, label: '3 model paralel (ChatGPT, Claude, Gemini)' },
      { v: true, label: 'Sınırsız izlenebilir soru' },
      { v: true, label: 'Sınırsız rakip takibi' },
      { v: true, label: 'Her gün otomatik rerun' },
      { v: true, label: 'Anında manuel "şimdi çalıştır"' },
      { v: true, label: '30 günlük trend grafikleri' },
      { v: true, label: 'Share of Voice rakip dağılımı' },
      { v: true, label: 'Marka mention highlight' },
      { v: true, label: '3 kullanıcı' },
    ],
  },
  {
    name: 'Starter',
    price: '₺TBD',
    period: 'ay (6 ay sonra)',
    description: 'Bireysel kullanıcılar ve küçük ekipler için. 6 ay lansman bittikten sonra.',
    cta: { label: 'Plan açıklanınca haber al', href: '/contact' },
    features: [
      { v: true, label: '3 model paralel' },
      { v: true, label: '50 izlenebilir soru' },
      { v: true, label: '10 rakip takibi' },
      { v: true, label: 'Günlük rerun' },
      { v: true, label: '30 günlük trend' },
      { v: false, label: 'API erişimi' },
      { v: false, label: 'Öncelikli destek' },
      { v: true, label: '3 kullanıcı' },
    ],
  },
  {
    name: 'Growth',
    price: '₺TBD',
    period: 'ay (6 ay sonra)',
    description: 'Çoklu marka, ajans, kurumsal pazarlama ekipleri için.',
    cta: { label: 'Plan açıklanınca haber al', href: '/contact' },
    features: [
      { v: true, label: '3 model paralel' },
      { v: true, label: 'Sınırsız soru' },
      { v: true, label: 'Sınırsız rakip' },
      { v: true, label: 'Günlük rerun' },
      { v: true, label: '90 günlük trend' },
      { v: true, label: 'API + Webhook erişimi' },
      { v: true, label: 'Öncelikli destek' },
      { v: true, label: 'Sınırsız kullanıcı' },
    ],
  },
];

const PRICING_FAQS = [
  {
    question: '"6 ay ücretsiz" gerçekten ücretsiz mi?',
    answer:
      'Evet. Kayıt olurken kredi kartı bilgisi istemiyoruz. 6 ay sonunda sizi ücretlendiremeyiz; sadece "devam etmek ister misiniz?" mesajı gönderiyoruz. İsterseniz devam, istemezseniz hesap arşive alınır.',
  },
  {
    question: '6 ay sonra fiyatlar ne olacak?',
    answer:
      'Henüz nihai fiyatları açıklamadık çünkü gerçek kullanım verisi toplayıp adil bir fiyat belirleyeceğiz. Lansman kullanıcılarının "early adopter" indirimi olacak — kayıt tarihine göre kalıcı bir indirim sözü veriyoruz.',
  },
  {
    question: 'AI provider maliyetlerini siz mi karşılıyorsunuz?',
    answer:
      'Lansmanda evet — kendi OpenAI, Anthropic, Google API maliyetlerimizi yansıtmıyoruz. 6 ay sonrası planlarda AI maliyetleri abonelik fiyatına dahil olacak; "kendi key\'inizi kullanın" opsiyonu da sunmayı planlıyoruz.',
  },
  {
    question: 'Yıllık abonelik indirimi var mı?',
    answer:
      'Lansmanda fiyat yok, yıllık da yok. 6 ay sonrası planlarda yıllık ödeyenlere standart %15-20 indirim öngörüyoruz.',
  },
  {
    question: 'Plan değiştirebilir miyim, sınır aşarsam ne olur?',
    answer:
      'Lansmanda zaten sınır yok. 6 ay sonrası planlarda kademeli olarak uyarı + üst plana yumuşak geçiş tasarlıyoruz. Sürpriz fatura yok.',
  },
  {
    question: 'İndirim/öğrenci/non-profit indirimi var mı?',
    answer:
      'Evet. Öğrenci hesabı (.edu.tr email ile), erken aşama startup (50K TL altı aylık gelir) ve non-profit organizasyonlara kalıcı %50 indirim planlıyoruz. Detaylar 6 ay sonra duyurulacak.',
  },
];

export default function PricingPage() {
  return (
    <>
      <FaqJsonLd items={PRICING_FAQS} />
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Fiyatlandırma', href: '/pricing' }]} />

      <section className="pt-24 pb-12">
        <Container className="text-center">
          <div className="inline-flex items-center gap-2 chip mx-auto">
            <Sparkles className="w-3 h-3 text-brand" />
            <span className="font-mono tracking-eyebrow">Lansman · 6 ay ücretsiz</span>
          </div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-6 leading-[1.02]">
            Sade fiyatlandırma.<br />
            <span className="text-brand">Önce ücretsiz, sonrası adil.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-6 max-w-2xl mx-auto leading-relaxed">
            Lansman sürümümüzdesiniz. Bugün kayıt olan herkese 6 ay boyunca tüm özellikleri sınırsız sunuyoruz —
            kredi kartı bilgisi olmadan. Karşılığında bizden tek beklediğimiz: gerçek geri bildirim.
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
                    <Sparkles className="w-3 h-3" /> şu an aktif
                  </div>
                )}
                <div className="eyebrow">{p.name}</div>
                <div className="font-display text-[48px] tracking-tight mt-2 tabular">{p.price}</div>
                <div className="text-[12px] text-ink-faint -mt-1">/ {p.period}</div>
                <p className="text-[13.5px] text-ink-muted mt-4 leading-relaxed">{p.description}</p>

                <ul className="space-y-2.5 mt-6 flex-1">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]">
                      {f.v ? (
                        <Check className="w-3.5 h-3.5 mt-1 text-brand shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 mt-1 text-ink-faint shrink-0" />
                      )}
                      <span className={f.v ? 'text-ink' : 'text-ink-faint line-through'}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={p.cta.href}
                  className={`mt-7 ${p.highlight ? 'btn-primary' : 'btn-secondary'} w-full inline-flex items-center justify-center gap-2 text-[14px]`}
                >
                  {p.cta.label} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-[12px] text-ink-faint mt-10 font-mono">
            // Vergiler (KDV %20) dahildir, faturalar e-arşiv olarak gönderilir
          </p>
        </Container>
      </section>

      <Section eyebrow="Sıkça sorulanlar" title="Fiyatlandırma soruları.">
        <Faq items={PRICING_FAQS} defaultOpen={0} />
      </Section>

      <CtaBlock
        eyebrow="6 ay boyunca her şey ücretsiz"
        title={<>Bugün başla, <span className="text-brand">karar 6 ay sonra.</span></>}
        body="Kayıt 30 saniye sürer. İlk dashboardunuz mock veri ile bile çalışır, gerçek AI sorgularını da hemen tetikleyebilirsiniz."
      />
    </>
  );
}
