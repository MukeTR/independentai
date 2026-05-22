import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { Mail, MessagesSquare, Newspaper, Briefcase } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'İletişim — Bize yazın',
  description: 'Satış görüşmesi, destek, basın talepleri veya ortaklık önerileri. Independent AI ekibi 24 saat içinde döner.',
  path: '/contact',
});

const CHANNELS = [
  {
    id: 'support',
    icon: MessagesSquare,
    name: 'Destek & sorular',
    email: 'destek@independentai.space',
    description: 'Ürünle ilgili sorular, bug raporları, hesap problemleri.',
  },
  {
    id: 'sales',
    icon: Briefcase,
    name: 'Satış görüşmesi',
    email: 'satis@independentai.space',
    description: 'Kurumsal ihtiyaçlar, çoklu marka, özel entegrasyon talepleri.',
  },
  {
    id: 'press',
    icon: Newspaper,
    name: 'Basın & medya',
    email: 'basin@independentai.space',
    description: 'Röportaj, haber, podcast davetleri. Press kit talep edebilirsiniz.',
  },
];

export default function Contact() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'İletişim', href: '/contact' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">İletişim</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Bize yazın.<br />
            <span className="text-brand">24 saat içinde döneriz.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Aşağıdaki üç kanaldan birini kullanın. Direkt e-posta atın; herkes formdan korkar, biz korkmuyoruz.
          </p>
        </Container>
      </section>

      <section className="pb-20">
        <Container>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CHANNELS.map((c) => (
              <div key={c.id} id={c.id} className="card p-7">
                <c.icon className="w-6 h-6 text-brand" />
                <h2 className="font-display text-[20px] mt-4 leading-snug">{c.name}</h2>
                <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{c.description}</p>
                <a
                  href={`mailto:${c.email}`}
                  className="mt-5 inline-flex items-center gap-2 text-[13.5px] text-brand-deep hover:text-brand font-mono"
                >
                  <Mail className="w-4 h-4" />
                  {c.email}
                </a>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Section eyebrow="Adres" title="Türkiye merkezliyiz." className="bg-paper-2/40">
        <div className="card p-7 max-w-2xl">
          <div className="text-[14px] text-ink leading-relaxed">
            Independent AI<br />
            (Şirket bilgileri lansman sonrası KVKK aydınlatma metninde yayınlanacak)<br />
            <span className="text-ink-muted">Türkiye</span>
          </div>
          <div className="mt-5 pt-5 border-t-hairline border-hairline text-[12px] text-ink-faint font-mono">
            Vergi dairesi, vergi numarası, MERSIS no — yakında
          </div>
        </div>
      </Section>
    </>
  );
}
