import Link from 'next/link';
import {
  Sparkles, ArrowRight, BarChart3, Users, Globe2, Zap, Eye, GitCompare, Bell, Layers,
  ShieldCheck, Brain, Check, TrendingUp, Quote,
} from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { MockDashboard } from '@/components/marketing/mock-dashboard';
import { PromptCardMock } from '@/components/marketing/prompt-card-mock';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { SoftwareApplicationJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'AI çağında markanızın görünürlüğünü ölçün',
  description:
    'ChatGPT, Claude ve Gemini\'nin verdiği cevaplarda markanız geçiyor mu? Independent AI bağımsız bir gözle ölçer. İlk 6 ay tüm kullanıcılara ücretsiz.',
  path: '/',
});

const LANDING_FAQS = [
  {
    question: 'AI brand monitoring (GEO) nedir, neden önemli?',
    answer:
      'Geleneksel SEO, kullanıcıları Google\'a yönlendirir. Ama 2025\'ten itibaren milyonlarca kullanıcı önce ChatGPT\'ye, Claude\'a veya Gemini\'ye soruyor. Yapay zekaların verdiği cevapta markanız geçiyor mu, hangi rakiplerle bahsediyor — bu görünürlük artık SEO kadar kritik. GEO (Generative Engine Optimization), bu yeni gerçeklikte markanı izleme ve optimize etme disiplini. Independent AI tam olarak bunu ölçer.',
  },
  {
    question: 'Hangi yapay zeka modellerini izliyorsunuz?',
    answer:
      'Şu an OpenAI (ChatGPT — gpt-4o-mini), Anthropic (Claude — claude-haiku-4-5) ve Google (Gemini — gemini-1.5-flash) modellerinde paralel sorgu çalıştırıyoruz. Perplexity, Grok ve Mistral entegrasyonları sonraki sürümlerde geliyor.',
  },
  {
    question: 'Markamı nasıl tespit ediyorsunuz?',
    answer:
      'Onboarding sırasında marka adı + alternatif yazımlar (domain, kısaltma, farklı dil yazımı) eklersiniz. Sistem bu varyasyonları AI cevap metninde regex + alias matching ile arar; bulduğu her marka için pozisyon (kaçıncı bahsedilen), tonal değerlendirme ve cümle bağlamı kaydeder.',
  },
  {
    question: 'Sorgularım ne sıklıkla çalışıyor?',
    answer:
      'Her gece 02:00\'de (Türkiye saati) tüm aktif sorgular 3 modelde otomatik yeniden çalıştırılır ve sonuçlar günlük trende eklenir. Ayrıca dashboard\'dan "şimdi çalıştır" diyerek anında manuel rerun yapabilirsiniz.',
  },
  {
    question: 'Kayıt sırasında kredi kartı bilgisi gerekiyor mu?',
    answer:
      'Hayır. Lansman promosyonumuz kapsamında 2026-05-22 itibarıyla kayıt olan tüm kullanıcılar ilk 6 ay tüm özellikleri sınırsız ve kredi kartı bilgisi olmadan kullanır. 6 ay sonunda devam etmek istemezseniz hesabınız donar — otomatik ücretlendirme olmaz.',
  },
  {
    question: 'Rakiplerimi nasıl ekliyorum?',
    answer:
      'Onboarding\'in 2. adımında 3-5 rakip ekleyebilirsiniz, sonra dashboard\'dan istediğiniz zaman ekleme/silme yapabilirsiniz. Sistem her sorgu sonucunda hem sizin markanızı hem rakipleri tarar ve "share of voice" karşılaştırması yapar.',
  },
  {
    question: 'Verilerime kim erişebilir?',
    answer:
      'Sadece siz ve hesabınıza davet ettiğiniz takım üyeleri. Verileriniz Türkiye dışındaki Neon Postgres (US-East) üzerinde tutulur, TLS ile şifrelenir. AI provider\'lara giden sorgular sadece izlediğiniz prompt metnini içerir — kullanıcı bilgisi paylaşılmaz.',
  },
  {
    question: 'API\'iniz var mı?',
    answer:
      'REST API ve webhooks yol haritasında, yakında. Geçerli sürümde tüm işlemler web arayüzü üzerinden yapılır.',
  },
];

const FEATURES = [
  { icon: Brain, t: '3 modelde paralel sorgu', d: 'ChatGPT, Claude, Gemini — her birinin cevabı ayrı ayrı kayıt altına alınır, karşılaştırılır.' },
  { icon: Eye, t: 'Akıllı marka tespiti', d: 'Ana ad + alternatif yazımlar + domain + kısaltmalar; alias matching ile metinde tüm varyasyonlar yakalanır.' },
  { icon: TrendingUp, t: 'Görünürlük skoru', d: 'İzlenen tüm sorgularda markanızın geçtiği oran. Tek bir sayı, anlık sağlık göstergesi.' },
  { icon: GitCompare, t: 'Share of Voice', d: 'Sizin ve rakiplerinizin toplam bahsetme sayısı içindeki yüzdeniz. Pazar payınızın AI versiyonu.' },
  { icon: BarChart3, t: '30 günlük trend', d: 'Görünürlük ve SoV\'un zaman serisi. Dün ne oldu, geçen hafta ne değişti — net görün.' },
  { icon: Zap, t: 'Anında manuel çalıştırma', d: 'Bir prompt eklediniz ve sonucu hemen görmek istiyorsunuz? Tek tıkla 3 modelde paralel koştur.' },
  { icon: Layers, t: 'Rakip karşılaştırma matrisi', d: 'Her sorguda hangi rakiplerin geçtiği, kaçıncı sırada bahsedildiği — kategorik dağılım.' },
  { icon: Bell, t: 'Düşüş uyarıları', d: 'Görünürlüğünüz beklenmedik bir şekilde düşerse email ile haber alın.', badge: 'yakında' },
  { icon: ShieldCheck, t: 'Bağımsız üçüncü taraf', d: 'AI provider\'larla iş ortaklığımız yok. Sonuçlar herhangi bir tarafın menfaatine göre filtrelenmez.' },
];

const USE_CASES = [
  {
    eyebrow: 'SaaS',
    title: 'Yazılım önerilerinde geçiyor musunuz?',
    body: 'B2B SaaS şirketleri için müşteri yolculuğu AI\'da başlıyor. "En iyi proje yönetim aracı" sorularına AI ne yanıt veriyor? Markanız orada mı?',
  },
  {
    eyebrow: 'E-ticaret',
    title: 'Marka önerilerinde sıranız ne?',
    body: '"En iyi … markası" sorularına AI cevabında ilk üçte var mısınız? Rakiplerinizden önce mi sonra mı bahsediliyor?',
  },
  {
    eyebrow: 'Ajanslar',
    title: 'Müşterilerinizin GEO performansını yönetin',
    body: 'Birden fazla markanın AI görünürlüğünü tek panelde takip edin, aylık raporlarınızda yeni bir KPI sunun.',
  },
  {
    eyebrow: 'Kurumsal',
    title: 'AI çağında marka itibarınızı koruyun',
    body: 'Yapay zekanın size dair anlattığı hikayeyi izleyin, sentiment kayarsa erken farkına varın.',
  },
];

export default function Landing() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FaqJsonLd items={LANDING_FAQS} />

      {/* Hero */}
      <section className="pt-24 lg:pt-32 pb-20">
        <Container>
          <div className="rise-1 inline-flex items-center gap-2 chip">
            <Sparkles className="w-3 h-3 text-brand" />
            <span className="font-mono tracking-eyebrow">Lansman · İlk 6 ay tüm kullanıcılara ücretsiz</span>
          </div>

          <div className="grid grid-cols-12 gap-10 mt-8">
            <div className="col-span-12 lg:col-span-7">
              <h1 className="rise-2 font-display text-[52px] lg:text-[80px] leading-[0.98] tracking-tight">
                Yapay zekalar şirketinizden{' '}
                <span className="text-brand">bahsediyor mu?</span>
              </h1>
              <p className="rise-3 text-[17px] lg:text-[19px] text-ink-muted mt-7 max-w-2xl leading-relaxed">
                Müşterileriniz artık Google'da değil — ChatGPT'de, Claude'da, Gemini'de
                öneri istiyor. Independent AI; bu sohbetlerde markanızın ne kadar geçtiğini,
                rakiplerinizle nasıl konumlandığını, hangi modelde nasıl göründüğünüzü
                bağımsız bir gözle ölçer.
              </p>

              <div className="rise-4 flex items-center gap-3 mt-10 flex-wrap">
                <Link href="/register" className="btn-primary inline-flex items-center gap-2">
                  6 ay ücretsiz dene <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/how-it-works" className="btn-secondary">Nasıl çalışır</Link>
                <span className="text-[12px] text-ink-faint font-mono ml-2">kredi kartı gerekmez</span>
              </div>

              <div className="rise-5 mt-12 flex items-center gap-7 flex-wrap text-[12px] text-ink-faint">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand" /> 3 model paralel</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand" /> Her gece otomatik</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand" /> Türkçe içerik için optimize</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand" /> Bağımsız üçüncü taraf</span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 rise-5">
              <MockDashboard />
            </div>
          </div>
        </Container>
      </section>

      {/* Why now / problem */}
      <Section
        eyebrow="Neden şimdi"
        title={<>Müşterileriniz artık arama motoruna değil, <span className="text-brand">yapay zekaya soruyor.</span></>}
        intro="2026 itibarıyla milyonlarca kullanıcı 'en iyi…' sorularını önce ChatGPT'ye veya Claude'a sorup öneri alıyor. Bu yeni davranışta görünmüyorsanız, satış hunisinin başı sizden geçmiyor demektir."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              n: '01',
              t: 'Yeni satın alma yolculuğu',
              d: 'Kullanıcı sorusunu AI\'ya soruyor → AI 2-3 marka öneriyor → kullanıcı sadece o markaları araştırıyor. Listede yoksanız fırsat yok.',
            },
            {
              n: '02',
              t: "SEO'dan farklı bir oyun",
              d: "Google'da 50.sayfada bile olsanız tıklanma şansınız var. AI cevabında 1-2-3 dışında 4. olmak görünmemekle aynı.",
            },
            {
              n: '03',
              t: 'Ölçemediğinizi yönetemezsiniz',
              d: 'AI cevapları kapalı bir kutu. Her gün manuel kontrol edemezsiniz. Sistematik ölçüm olmadan optimizasyon yapılamaz.',
            },
          ].map((s) => (
            <div key={s.n} className="card p-7">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
              <h3 className="font-display text-[20px] mt-4 leading-snug">{s.t}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section
        eyebrow="Nasıl çalışır"
        title="Üç adım — sonra her sabah size rapor."
        intro="Onboarding 2 dakika sürer. Geri kalan her şeyi sistem otomatik halleder."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { n: '01', t: 'Markanızı tanıtın', d: 'Şirket adı, alternatif yazımlar, web sitesi ve 3-5 rakip ekleyin. Aliasları akıllı yakalama için detaylandırmanız önerilir.' },
            { n: '02', t: 'İzlenecek soruları girin', d: 'Müşterilerinizin AI\'a sorabileceği soruları yazın — örn. "İstanbul\'da en iyi dijital ajans" veya "muhasebe yazılımı önerir misin".' },
            { n: '03', t: 'Her sabah rapor', d: 'Her gece tüm sorular 3 modelde otomatik çalışır. Sabah dashboard\'unuzda görünürlük skoru, SoV, trend ve rakip dağılımı sizi bekler.' },
          ].map((s) => (
            <div key={s.n} className="card p-7">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
              <h3 className="font-display text-[22px] mt-4 leading-tight">{s.t}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Real AI answers preview */}
      <Section
        eyebrow="Gerçek AI cevapları"
        title={<>Sadece sayı değil. Modelin <span className="text-brand">kelime kelime cevabı.</span></>}
        intro="Markanızın hangi cümlede, hangi tonla geçtiğini görün. Rakipleriniz nerede bahsediliyor — ve neden sizden önce bahsediliyor olabilirler."
      >
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-7">
            <PromptCardMock />
          </div>
          <div className="col-span-12 lg:col-span-5">
            <div className="space-y-6">
              {[
                {
                  t: 'Marka highlight',
                  d: 'Markanız geçtiği her cümlede vurgulanır, rakipleriniz ayrı renkte işaretlenir. Tek bakışta görünürlük net.',
                },
                {
                  t: 'Pozisyon takibi',
                  d: 'Cevapta kaç tane marka bahsedildi, siz kaçıncı sıradasınız? Listenin başında olmak listede olmamaktan çok daha kıymetli.',
                },
                {
                  t: 'Cümle bağlamı',
                  d: 'Markanız "öneririm" ile mi, "yetersiz" ile mi geçiyor? Cümlenin etrafındaki bağlam kaydedilir.',
                },
              ].map((b) => (
                <div key={b.t} className="border-l-2 border-brand/40 pl-5">
                  <h4 className="font-display text-[18px] tracking-tight">{b.t}</h4>
                  <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{b.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Features grid */}
      <Section
        eyebrow="Özellikler"
        title="Tek bir panelde, AI çağı için pazarlama altyapısı."
        intro="GEO ölçümünün her bileşeni — model çeşitliliği, akıllı tespit, trend grafikleri, rakip karşılaştırması. Sade ama tam."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, t, d, badge }) => (
            <div key={t} className="card p-6">
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5 text-brand" />
                {badge && <span className="chip !text-[10px]">{badge}</span>}
              </div>
              <h3 className="font-display text-[17px] mt-4 leading-snug">{t}</h3>
              <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link href="/features" className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand">
            Tüm özellik detayları <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* Use cases */}
      <Section
        eyebrow="Kimler için"
        title="Müşterileri AI'dan öneri alan herkes için."
        intro="Farklı sektörlerde aynı sorun: yapay zekanın gözünden nasıl görünüyoruz?"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USE_CASES.map((u) => (
            <div key={u.eyebrow} className="card p-7">
              <div className="eyebrow text-brand-deep">{u.eyebrow}</div>
              <h3 className="font-display text-[22px] mt-3 leading-snug">{u.title}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{u.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link href="/use-cases" className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand">
            Tüm kullanım senaryoları <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* Quote / testimonial-style block (aspirational, marked) */}
      <Section className="bg-paper-2/40">
        <div className="card p-10 lg:p-14 max-w-4xl mx-auto text-center">
          <Quote className="w-8 h-8 text-brand/40 mx-auto" />
          <p className="font-display text-[28px] lg:text-[34px] tracking-tight mt-6 leading-snug">
            "AI cevaplarında yokuz" derken aslında hangi cevaplarda olmadığımızı bilmiyorduk. Şimdi her sabah
            ilk açtığımız sekme Independent AI oluyor.
          </p>
          <div className="mt-7 text-[13px] text-ink-faint">
            — <span className="text-ink">Lansman testçisi</span>, SaaS pazarlama lideri
          </div>
        </div>
      </Section>

      {/* Pricing summary */}
      <Section
        eyebrow="Fiyatlandırma"
        title="Lansmanda her şey ücretsiz. 6 ay sonra ne istiyorsanız."
        intro="Bugün hesap aç, 6 ay boyunca tüm özellikleri sınırsız kullan. 6 ay sonunda devam etmek istemezsen otomatik ücretlendirme yok."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { t: 'Launch', p: '₺0', desc: '6 ay boyunca her şey dahil. Lansman fırsatı.', highlight: true,
              items: ['3 model paralel', 'Sınırsız soru', 'Sınırsız rakip', 'Günlük rerun', 'Trend + SoV'] },
            { t: 'Starter', p: '₺??', desc: '6 ay sonrası için. Küçük ekipler ve solo kuruculara.',
              items: ['Tek marka', '50 izlenen soru', '3 kullanıcı', 'Email destek'] },
            { t: 'Growth', p: '₺??', desc: 'Çoklu marka, ajans veya kurumsal pazarlama ekipleri.',
              items: ['Sınırsız marka', 'Sınırsız soru', 'Sınırsız kullanıcı', 'Öncelikli destek', 'API erişimi'] },
          ].map((p) => (
            <div key={p.t} className={`card p-7 ${p.highlight ? 'ring-2 ring-brand' : ''}`}>
              {p.highlight && <div className="chip own !text-[10px] mb-3">aktif</div>}
              <div className="eyebrow">{p.t}</div>
              <div className="font-display text-[40px] tracking-tight mt-2 tabular">{p.p}</div>
              <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{p.desc}</p>
              <ul className="space-y-2 mt-5">
                {p.items.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px]">
                    <Check className="w-3.5 h-3.5 text-brand" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <Link href="/pricing" className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand">
            Plan detayları <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="Sıkça sorulanlar" title="Ürün hakkında bilinmesi gerekenler.">
        <Faq items={LANDING_FAQS} defaultOpen={0} />
      </Section>

      {/* Final CTA */}
      <CtaBlock />
    </>
  );
}
