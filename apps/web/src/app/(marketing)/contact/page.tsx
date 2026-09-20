import { Suspense } from 'react';
import Link from 'next/link';
import { Briefcase, MessagesSquare, Newspaper, ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { ContactForm } from '@/components/marketing/contact-form';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'İletişim — Bize yazın',
  description:
    'Satış görüşmesi, Yanıt Agency, ajans ortaklığı, destek veya basın. Formu doldurun; ekibimiz sizinle iletişime geçer. Kişisel veriniz yapay zekâ servislerine gönderilmez.',
  path: '/contact',
});

/**
 * İletişim: tek form (`#form`) + üç kanal kartı (`#sales`, `#press`, `#support`). Kartlar formu konuyla ön-doldurur.
 * `?src=&site=&sektor=&token=&konu=` ile araç/rapor sayfalarından gelen bağlam forma taşınır.
 * Süre taahhüdü yok; mailto yerine form (KVKK ve İYS onayları ayrı kutularda).
 */
const CHANNELS = [
  {
    id: 'sales',
    icon: Briefcase,
    name: 'Satış görüşmesi',
    konu: 'satis',
    description:
      'Yanıt panelini ekibinizle birlikte görmek, Yanıt Agency uygulama hizmeti için teklif almak ya da ajans ortaklığını konuşmak için.',
    cta: 'Satış görüşmesi iste',
  },
  {
    id: 'support',
    icon: MessagesSquare,
    name: 'Destek ve sorular',
    konu: 'destek',
    description: 'Ürünle ilgili sorular, hata bildirimi, hesap ve fatura konuları. Hesabınızın e-postasıyla yazın.',
    cta: 'Destek talebi aç',
  },
  {
    id: 'press',
    icon: Newspaper,
    name: 'Basın ve medya',
    konu: 'basin',
    description: 'Röportaj, haber, podcast davetleri ve görsel/metin materyal talepleri.',
    cta: 'Basın talebi gönder',
  },
] as const;

export default function Contact() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'İletişim', href: '/contact' },
        ]}
      />

      <section className="pt-24 pb-10">
        <Container className="max-w-4xl">
          <div className="eyebrow">İletişim</div>
          <h1 className="font-display text-[44px] lg:text-[64px] tracking-tight mt-4 leading-[1.02]">
            Bize yazın.
            <br />
            <span className="text-brand">Sorunuzu bir insan okur.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Tek form, üç konu. Sitenizi taradıysanız rapor bağlantısı mesajınızla birlikte gelir; ekibimiz aynı
            bulgulara bakarak döner. Kişisel verinizi yapay zekâ servislerine göndermiyoruz.
          </p>
        </Container>
      </section>

      <section className="pb-16">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CHANNELS.map((c) => (
              <div key={c.id} id={c.id} className="card p-7 flex flex-col scroll-mt-24">
                <c.icon className="w-6 h-6 text-brand" aria-hidden />
                <h2 className="font-display text-[20px] mt-4 leading-snug">{c.name}</h2>
                <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed flex-1">{c.description}</p>
                <Link
                  href={`/contact?konu=${c.konu}#form`}
                  className="mt-5 inline-flex items-center gap-2 text-[13.5px] text-brand-deep hover:text-brand min-h-[44px]"
                >
                  {c.cta} <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Section
        id="form"
        eyebrow="Form"
        title="Mesajınızı bırakın."
        intro="Zorunlu alanlar ad soyad, e-posta ve mesaj. Web sitenizi yazarsanız yalnızca herkese açık sayfaları değerlendiririz."
        className="bg-paper-2/40 py-16 lg:py-20 scroll-mt-16"
      >
        <div className="max-w-3xl">
          <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Form yükleniyor…</div>}>
            <ContactForm />
          </Suspense>
        </div>
      </Section>

      <Section eyebrow="Adres" title="Türkiye merkezliyiz." className="py-16 lg:py-20">
        <div className="card p-7 max-w-2xl">
          <div className="text-[14px] text-ink leading-relaxed">
            Yanıt (Independent AI)
            <br />
            (Şirket bilgileri KVKK aydınlatma metninde yayınlanacak)
            <br />
            <span className="text-ink-muted">Türkiye</span>
          </div>
          <div className="mt-5 pt-5 border-t border-hairline text-[12px] text-ink-faint font-mono">
            Vergi dairesi, vergi numarası, MERSIS no — yakında
          </div>
        </div>
      </Section>
    </>
  );
}
