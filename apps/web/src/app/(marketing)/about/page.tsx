import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Yanıt nedir?',
  description:
    'Yanıt, markanızın yapay zekâ cevaplarındaki görünürlüğünü ölçen, nedenini gösteren Türkiye merkezli bağımsız bir platformdur.',
  path: '/about',
});

/** Kaynaklı rakamlar (RESEARCH §C.1). Yıl karışıklığı yasak (§D.2): internet kullanımı 2026 bülteni, üretken YZ 2025 bülteni. */
const FACTS = [
  {
    v: '%92,3',
    t: '16–74 yaş internet kullanımı',
    src: 'TÜİK Hanehalkı Bilişim Teknolojileri Kullanım Araştırması 2026',
  },
  { v: '%19,2', t: 'üretken yapay zekâ kullananlar (16–24 yaşta %39,4)', src: 'TÜİK Yapay Zeka İstatistikleri 2025' },
  {
    v: '%94,49',
    t: 'yapay zekâ kaynaklı web trafiğinde ChatGPT payı (Türkiye)',
    src: 'Digital 2026, We Are Social + Meltwater',
  },
];

const PRINCIPLES = [
  {
    t: 'Ölçeriz, söz vermeyiz',
    d: 'Sonuç sözü, sıralama vaadi ya da “garantili” iş yok. Her iddianın yanında tarih, model ve ekran görüntüsü; skorun altında soru sayısı, motor ve aralık.',
  },
  {
    t: 'Tek sorguya hüküm bağlamayız',
    d: 'Yapay zekâ cevapları oturumdan oturuma değişir. Bu yüzden her gün ölçer, seriye bakarız; landing’deki örnekler “temsili” etiketi taşır.',
  },
  {
    t: 'Bağımsızlık',
    d: 'Hiçbir yapay zekâ sağlayıcısıyla iş ortaklığımız, gelir paylaşımımız ya da teşvikimiz yok. Cevaplar filtrelenmez, sıralama değiştirilmez.',
  },
  {
    t: 'Açık yöntem',
    d: 'Skor formülleri dokümantasyonda; site araçları deterministiktir (aynı girdi, aynı sonuç). Yanlış pozitif üretebilecek kontroller “hata” değil “uyarı” olarak, düşük ağırlıkla ve kaynak linkiyle gösterilir.',
  },
  {
    t: 'Kişisel veri yapay zekâya gitmez',
    d: 'Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz. Lead ve panel verisi (ad, telefon, e-posta) modele asla gönderilmez.',
  },
  {
    t: 'Kodda olmayanı satmayız',
    d: 'Yetenek matrisi tek kaynaktır: bir özellik “yayında” değilse hiçbir sayfa onu çalışan özellik gibi anlatmaz; “yakında” rozeti görünürdür.',
  },
];

export default function About() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Yanıt nedir?', href: '/about' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Yanıt nedir?</div>
          <h1 className="font-display text-[48px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Müşteriniz satın almadan önce yapay zekâya soruyor.
            <br />
            <span className="text-brand">Biz cevabı ölçüyoruz.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Yanıt; ChatGPT, Claude ve Gemini’nin müşteri sorularında sizi mi rakibinizi mi önerdiğini ölçer, nedenini
            gösterir ve her gün takip eder. Düzeltmeyi siz yaparsınız ya da Yanıt Agency yapar. Türkiye merkezli,
            bağımsız.
          </p>
        </Container>
      </section>

      <Section id="mission" eyebrow="Misyon" className="scroll-mt-20">
        <div className="max-w-3xl text-[17px] text-ink leading-[1.7] space-y-6">
          <p>
            Yirmi yıl boyunca “görünür müyüz” sorusunun cevabı Google’daki sıramızdı. Bugün müşteri, satın almadan önce
            soruyu bir yapay zekâ asistanına soruyor; asistan iki-üç isim sayıyor ve çoğu zaman tıklanacak bir bağlantı
            bile göstermiyor. O iki-üç ismin içinde değilseniz, satın alma sürecine hiç girmiyorsunuz.
          </p>
          <p>
            Yanıt bu boşluk için var: markanızın o cevaplarda geçip geçmediğini <strong>ölçmek</strong>, geçmiyorsa{' '}
            <strong>nedenini</strong> göstermek, düzeltmenin yolunu vermek ve her sabah <strong>yeniden ölçmek</strong>.
            KOBİ’ye “GEO” ya da “AEO” demiyoruz; “ChatGPT sizi öneriyor mu?” diyoruz.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5">
          {FACTS.map((f) => (
            <div key={f.v} className="card p-6">
              <div className="font-display text-[34px] tabular text-brand">{f.v}</div>
              <div className="text-[14px] text-ink mt-2 leading-snug">{f.t}</div>
              <div className="text-[11.5px] text-ink-faint mt-3 font-mono leading-relaxed">{f.src}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="principles"
        eyebrow="Yöntem ve dürüstlük ilkeleri"
        title="Nasıl çalıştığımızı saklamıyoruz."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PRINCIPLES.map((p) => (
            <div key={p.t} className="border-l-2 border-brand/40 pl-6 py-1">
              <h3 className="font-display text-[20px] tracking-tight">{p.t}</h3>
              <p className="text-[14px] text-ink-muted mt-2 leading-relaxed max-w-2xl">{p.d}</p>
            </div>
          ))}
        </div>
        <Link
          href="/how-it-works"
          className="mt-10 inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
        >
          Yöntemin tamamı: Analiz → Düzelt → Ölç <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </Section>

      <Section id="team" eyebrow="Ekip" title="Küçük, odaklı, ulaşılabilir." className="scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 card p-8">
            <p className="text-[15px] text-ink-muted leading-relaxed">
              Yanıt (eski adıyla Independent AI) Türkiye merkezli, bağımsız bir üründür. Ürünü bir kurucu geliştiriyor;
              uygulama tarafında (Yanıt Agency) teknik SEO, şema ve içerik işlerini üstlenen küçük bir ekip çalışıyor.
              Erken aşamadayız; yol haritasını kullanıcı geri bildirimiyle şekillendiriyoruz.
            </p>
            <p className="text-[13px] text-ink-faint mt-4 leading-relaxed">
              Ekip sayfasında isim yayımlamıyoruz; toplantıda tanışırsınız. Referans ve vaka bilgisi talep üzerine,
              sorgu-model-tarih bağlamıyla paylaşılır.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-1 gap-3">
            {[
              { role: 'Ürün ve ölçüm', d: 'Panel, araçlar, skor yöntemi, Public API' },
              { role: 'Uygulama (Yanıt Agency)', d: 'Teknik düzeltme, şema/entity, içerik, kaynak çalışması' },
              { role: 'Satış ve destek', d: 'Demo, teklif, onboarding, KVKK soruları' },
            ].map((r) => (
              <div key={r.role} className="card p-5">
                <div className="font-display text-[16px]">{r.role}</div>
                <div className="text-[13px] text-ink-muted mt-1">{r.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-4 text-[13.5px]">
          <Link href="/contact#sales" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            Satış görüşmesi <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
          <Link href="/contact#press" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            Basın <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
          <Link href="/bot" className="inline-flex items-center gap-1.5 text-brand-deep hover:text-brand">
            YanitBot (tarayıcımız) <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </Section>

      <CtaBlock
        title={
          <>
            Önce nerede olduğunuzu görelim; <span className="text-brand">gerisini birlikte kararlaştırırız.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez. Sürekli ölçüm için hesap açın; kart gerekmez. Uygulama için Yanıt Agency teklif verir."
        secondaryHref="/yanit-agency"
        secondaryLabel="Yanıt Agency"
      />
    </>
  );
}
