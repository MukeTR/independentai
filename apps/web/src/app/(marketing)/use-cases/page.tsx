import Link from 'next/link';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowRight, Building2, Store, ShoppingBag, Briefcase, Megaphone, Crown, Search, Newspaper } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Kullanım senaryoları — SaaS, e-ticaret, ajans, kurumsal',
  description: 'Hangi sektörde, hangi rolde olursanız olun: AI cevaplarında görünürlüğünüz pazarlama hedeflerinizi etkiliyor. Senaryolarla anlatımı.',
  path: '/use-cases',
});

const BY_INDUSTRY = [
  {
    id: 'saas',
    icon: Building2,
    name: 'SaaS şirketleri',
    pain: 'B2B alıcılarınız "en iyi CRM", "en iyi proje yönetim aracı" sorularını artık önce AI\'ya soruyor. Cevabın ilk 3\'ünde yoksanız demo talebine bile düşmüyorsunuz.',
    solution: 'Independent AI ile sektörünüzdeki tüm değerlendirme sorularını izleyin. Görünürlüğünüzü rakiplerinizle karşılaştırın. Hangi modelde zayıfsınız anlayıp content stratejinizi oraya yönlendirin.',
    metrics: ['Kategori soruları görünürlüğü', 'Vs. rakipler SoV', 'Modele göre dağılım'],
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    name: 'E-ticaret markaları',
    pain: '"En iyi spor ayakkabı markası" veya "kahve makinesi önerir misin" sorularında siz olmayabilirsiniz. Marka sıralamasında üst 3\'te değilseniz tıklama almıyorsunuz.',
    solution: 'Kategori sorularınızı sistematik izleyin. Yeni ürün lansmanlarında ay başında görünürlük baseline\'ı alın, kampanya sonrası ölçün — etkisini AI cevaplarında somut görün.',
    metrics: ['Kategori görünürlüğü', 'Pozisyon takibi', 'Kampanya öncesi/sonrası fark'],
  },
  {
    id: 'restaurant',
    icon: Store,
    name: 'Restoran & yerel işletmeler',
    pain: '"İstanbul\'da iyi italyan restoranı" veya "Ankara çorbacısı" sorularında AI hangi yerleri öneriyor? Sizin yeriniz orada mı?',
    solution: 'Lokasyon bazlı sorularınızı izleyin. Rakip restoranlarla karşılaştırın. Google My Business ve sosyal medya stratejinizin AI çıktısına yansıdığını ölçün.',
    metrics: ['Lokal görünürlük', 'Rakip restoranlar SoV', 'Modele göre öneri'],
  },
  {
    id: 'agency',
    icon: Briefcase,
    name: 'Dijital ajanslar',
    pain: 'Müşterileriniz "neden bizi öneri listesinde göremiyoruz" diye soracak — siz cevap veremezseniz başka ajansa gidecekler.',
    solution: 'Birden fazla müşteri markasının AI görünürlüğünü tek panelde takip edin. Aylık raporlarınıza yeni bir KPI ekleyin: "Müşterinizin AI Visibility Score\'u". Müşteri retention\'ı için yeni bir hikaye.',
    metrics: ['Multi-tenant yönetim', 'Aylık PDF rapor (yakında)', 'Müşteri bazlı dashboard'],
  },
  {
    id: 'enterprise',
    icon: Crown,
    name: 'Kurumsal markalar',
    pain: 'Marka itibarı yıllarca yatırım yapılarak inşa edildi. AI cevaplarında hatalı, eksik veya rakip yanlı bir tasvirden anında haberdar olmanız gerek.',
    solution: '"Marka adınız nedir, ne yapar, ne için ünlüdür" gibi temel soruları izleyin. Hatalı bilgi tespit ederseniz iletişim/PR ekibiniz proaktif düzeltmeye gidebilir.',
    metrics: ['Brand health monitoring', 'Sentiment trend', 'Anomali uyarıları (yakında)'],
  },
];

const BY_ROLE = [
  {
    id: 'marketing',
    icon: Megaphone,
    name: 'Pazarlama liderleri',
    summary: 'CMO / VP Marketing. Yıllık planlamada yeni bir KPI: AI Visibility. Bütçe ayırma argümanı olarak somut veri.',
  },
  {
    id: 'founder',
    icon: Crown,
    name: 'Kurucular / CEO',
    summary: 'Solo ya da küçük ekip kurucusu. Müşteri kazanımı yolunuzun en üst noktasında AI duruyor — orada görünmek hayati.',
  },
  {
    id: 'seo',
    icon: Search,
    name: 'SEO uzmanları',
    summary: 'Geleneksel sıralama takibinin yanına GEO sıralaması ekleyin. Müşterinize geleceği önceden gören danışman olun.',
  },
  {
    id: 'pr',
    icon: Newspaper,
    name: 'PR / iletişim',
    summary: 'Geleneksel media monitoring artık yetmez. AI nasıl konuşuyor sizden hakkınızda? Sentiment kayışını erken yakalayın.',
  },
];

export default function UseCasesPage() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Kullanım senaryoları', href: '/use-cases' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Kullanım senaryoları</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Hangi sektörde olursanız olun, müşterileriniz <span className="text-brand">AI'ya soruyor.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Farklı sektörlerde aynı problem farklı şekillerde görünüyor. Bu sayfa size benzer bir konumdaki
            şirketlerin Independent AI'ı nasıl kullandığına dair somut senaryolar sunar.
          </p>
        </Container>
      </section>

      {/* By industry */}
      <section className="py-10">
        <Container>
          <div className="eyebrow">Sektöre göre</div>
          <h2 className="font-display text-[36px] tracking-tight mt-3 mb-12">Beş tipik sektör.</h2>

          <div className="space-y-10">
            {BY_INDUSTRY.map((u) => (
              <div key={u.id} id={u.id} className="card p-8 lg:p-10 grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-4">
                  <u.icon className="w-7 h-7 text-brand" />
                  <h3 className="font-display text-[28px] mt-4 leading-tight">{u.name}</h3>
                  <div className="mt-4 space-y-2">
                    {u.metrics.map((m) => (
                      <div key={m} className="text-[12px] text-ink-faint font-mono">// {m}</div>
                    ))}
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-8 space-y-5">
                  <div>
                    <div className="eyebrow">Problem</div>
                    <p className="text-[15px] text-ink mt-2 leading-relaxed">{u.pain}</p>
                  </div>
                  <div>
                    <div className="eyebrow text-brand-deep">Çözüm</div>
                    <p className="text-[15px] text-ink-muted mt-2 leading-relaxed">{u.solution}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* By role */}
      <Section
        eyebrow="Role göre"
        title="Hangi rolde olursan ol, AI görünürlüğü senin işin."
        intro="Marketing, PR, SEO, kurucu — herkesin gündeminde aynı soru: 'AI bizden bahsediyor mu?'"
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {BY_ROLE.map((r) => (
            <div key={r.id} id={r.id} className="card p-7">
              <div className="flex items-center gap-3">
                <r.icon className="w-5 h-5 text-brand" />
                <h3 className="font-display text-[20px]">{r.name}</h3>
              </div>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{r.summary}</p>
            </div>
          ))}
        </div>
      </Section>

      <CtaBlock />
    </>
  );
}
