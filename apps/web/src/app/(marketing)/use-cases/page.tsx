import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Briefcase, Crown, Megaphone, Newspaper, Search } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Kim için — 9 sektör, 4 rol',
  description:
    'Klinik, hukuk, SaaS, e-ticaret, ajans, eğitim, turizm, gayrimenkul ve B2B üretici: sektörünüze göre hangi sorular, hangi kontroller.',
  path: '/use-cases',
});

/**
 * 9 sektör (görseller public/img/sektor/*.webp). INTEGRATE, PREP `data/sectors.ts` (SECTORS) gelince bu listeyi
 * oradan türetir; slug ve görsel adları birebir aynıdır.
 */
const SECTORS = [
  {
    slug: 'klinik',
    id: 'klinik',
    name: 'Klinik ve sağlık',
    q: '“İstanbul’da güvenilir saç ekimi kliniği?”',
    d: 'Bilgilendirme ve görünürlük ölçümü; reklam mevzuatına uygun dil.',
  },
  {
    slug: 'hukuk-danismanlik',
    id: 'hukuk',
    name: 'Hukuk ve danışmanlık',
    q: '“Boşanma davası için avukat nasıl seçilir?”',
    d: 'Uzmanlık sayfaları, soru-cevap içerik, entity tutarlılığı.',
  },
  {
    slug: 'saas',
    id: 'saas',
    name: 'SaaS',
    q: '“KOBİ için en iyi CRM hangisi?”',
    d: 'Kategori sorularında görünürlük, karşılaştırma içeriği, atıf kaynakları.',
  },
  {
    slug: 'eticaret-altyapi',
    id: 'ecommerce',
    name: 'E-ticaret',
    q: '“Shopify mi ikas mı?”',
    d: 'Ürün şeması, katalog yapısı, AI crawler erişimi; mağaza bağlantısı (beta).',
  },
  {
    slug: 'ajans',
    id: 'agency',
    name: 'Dijital ajanslar',
    q: '“Trendyol mağazamı yönetecek ajans?”',
    d: 'Müşteri portföyü, roller, paylaşım linkleri; ortaklık programı.',
  },
  {
    slug: 'egitim',
    id: 'egitim',
    name: 'Eğitim',
    q: '“Yazılım bootcamp’i önerir misin?”',
    d: 'Program sayfaları, mezun kanıtı, sık sorulan sorular.',
  },
  {
    slug: 'turizm',
    id: 'turizm',
    name: 'Turizm ve konaklama',
    q: '“Kapadokya’da butik otel?”',
    d: 'Konum, tesis ve fiyat bilgisinin yapılandırılmış sunumu.',
  },
  {
    slug: 'gayrimenkul',
    id: 'gayrimenkul',
    name: 'Gayrimenkul',
    q: '“Ankara’da satılık daire hangi bölge?”',
    d: 'Bölge rehberleri, ilan sayfası şeması, güven sinyalleri.',
  },
  {
    slug: 'b2b-uretici',
    id: 'enterprise',
    name: 'B2B üretici ve kurumsal',
    q: '“Toptan tekstil üreticisi Türkiye”',
    d: 'Marka doğruluğu, ihracat sayfaları, kurumsal entity; düşüş uyarıları.',
  },
];

const BY_ROLE = [
  {
    id: 'marketing',
    icon: Megaphone,
    name: 'Pazarlama liderleri',
    summary:
      'Yeni bir KPI: yapay zekâ görünürlüğü. Bütçe konuşmasında somut veri: hangi sorularda rakibiniz var, siz yoksunuz; 30 günde ne değişti.',
  },
  {
    id: 'founder',
    icon: Crown,
    name: 'Kurucular / patronlar',
    summary:
      'Dört sayı yeter: kaç müşteri sorusu, kaçında rakibiniz var, kaçında siz varsınız, kaç fırsat. Jargon yok; haftalık e-postada gelir.',
  },
  {
    id: 'seo',
    icon: Search,
    name: 'SEO ve içerik uzmanları',
    summary:
      'Klasik sıralama takibinin yanına ChatGPT/Claude/Gemini görünürlüğü. Atıf kaynakları, sahipsiz sorular, sayfa düzeyinde bulgular; Public API ile kendi raporunuza çekin.',
  },
  {
    id: 'pr',
    icon: Newspaper,
    name: 'Kurumsal iletişim',
    summary:
      'Yapay zekâ markanız hakkında ne söylüyor, doğru mu söylüyor? Bağlam cümleleri ve sentiment (beta) ile yanlış bilgiyi erken yakalayın.',
  },
];

export default function UseCasesPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Kim için', href: '/use-cases' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Kim için · 9 sektör, 4 rol</div>
          <h1 className="font-display text-[48px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Hangi sektörde olursanız olun, <span className="text-brand">müşteriniz yapay zekâya soruyor.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Aynı sorun sektörden sektöre farklı görünür: klinikte “güvenilir mi”, SaaS’ta “hangisi daha iyi”, ajansta
            “kim yönetsin”. Her sektör sayfasında müşterinin sorduğu 5 soru, 3 kontrol ve gömülü ücretsiz araç var.
          </p>
        </Container>
      </section>

      <section className="py-10">
        <Container>
          <div className="eyebrow">Sektöre göre</div>
          <h2 className="font-display text-[36px] tracking-tight mt-3 mb-10">Dokuz sektör, dokuz soru seti.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTORS.map((s) => (
              <Link
                key={s.slug}
                id={s.id}
                href={`/sektor/${s.slug}`}
                className="card overflow-hidden group hover:-translate-y-0.5 transition-transform scroll-mt-20"
              >
                <div className="relative aspect-[16/9] bg-paper-2">
                  <Image
                    src={`/img/sektor/${s.slug}.webp`}
                    alt={`${s.name} — yapay zekâ görünürlüğü`}
                    fill
                    sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-[20px] leading-snug">{s.name}</h3>
                  <p className="text-[13.5px] text-ink mt-2 leading-relaxed">{s.q}</p>
                  <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{s.d}</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4 group-hover:text-brand">
                    Sektör sayfası <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-[13.5px]">
            <Link href="/sektor" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
              Tüm sektörler <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
            <Link
              href="/solutions/agencies"
              className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand"
            >
              <Briefcase className="w-3.5 h-3.5" aria-hidden /> Ajans ortaklık programı
            </Link>
          </div>
        </Container>
      </section>

      <Section
        id="roller"
        eyebrow="Role göre"
        title="Hangi rolde olursanız olun, aynı soru."
        intro="Pazarlama, kurucu, SEO, kurumsal iletişim: herkesin gündeminde 'yapay zekâ bizi öneriyor mu?' Yanıt herkese kendi dilinde cevap verir."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {BY_ROLE.map((r) => (
            <div key={r.id} id={r.id} className="card p-7 scroll-mt-20">
              <div className="flex items-center gap-3">
                <r.icon className="w-5 h-5 text-brand" aria-hidden />
                <h3 className="font-display text-[20px]">{r.name}</h3>
              </div>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{r.summary}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBlock
        eyebrow="Önce ücretsiz"
        title={
          <>
            Sektörünüzün sorularında <span className="text-brand">nerede olduğunuzu görün.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez. Sürekli ölçüm için hesap açın; kart gerekmez. Uygulamayı istemezseniz Yanıt Agency yapar (teklifle)."
        secondaryHref="/yanit-agency"
        secondaryLabel="Yanıt Agency"
      />
    </>
  );
}
