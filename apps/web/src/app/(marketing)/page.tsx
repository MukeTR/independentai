import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  BarChart3,
  Zap,
  Eye,
  GitCompare,
  Bell,
  Layers,
  ShieldCheck,
  Brain,
  Check,
  TrendingUp,
  Quote,
  Radar,
  Target,
  Mail,
  Activity,
  Crosshair,
  Code2,
} from 'lucide-react';
import { LAUNCH_OFFER } from '@independentai/shared';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { MockDashboard } from '@/components/marketing/mock-dashboard';
import { PromptCardMock } from '@/components/marketing/prompt-card-mock';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { Reveal } from '@/components/marketing/reveal';
import { Counter } from '@/components/marketing/counter';
import { Marquee } from '@/components/marketing/marquee';
import { ToolBento } from '@/components/marketing/tool-bento';
import { SoftwareApplicationJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'AI çağında markanızın görünürlüğünü ölçün ve optimize edin',
  description:
    "ChatGPT, Claude ve Gemini'nin verdiği cevaplarda markanız geçiyor mu? Independent AI bağımsız bir gözle ölçer — ve 13 GEO aracıyla optimize etmenizi sağlar. İlk 6 ay tüm kullanıcılara ücretsiz.",
  path: '/',
});

const FAIR = LAUNCH_OFFER.fairUse;

const LANDING_FAQS = [
  {
    question: 'AI brand monitoring (GEO) nedir, neden önemli?',
    answer:
      "Geleneksel SEO, kullanıcıları Google'a yönlendirir. Ama 2025'ten itibaren milyonlarca kullanıcı önce ChatGPT'ye, Claude'a veya Gemini'ye soruyor. Yapay zekaların verdiği cevapta markanız geçiyor mu, hangi rakiplerle bahsediyor — bu görünürlük artık SEO kadar kritik. GEO (Generative Engine Optimization), bu yeni gerçeklikte markanı izleme ve optimize etme disiplini. Independent AI tam olarak bunu ölçer.",
  },
  {
    question: 'Independent AI sadece izliyor mu, optimize de ediyor mu?',
    answer:
      "İkisi de. Önce ölçer (3 modelde günlük görünürlük, SoV, trend), sonra 13 GEO aracıyla aksiyon almanızı sağlar: GEO Audit ile sayfanızın AI hazırlık skorunu görür, İçerik Denetleyici ile somut düzeltme kartları alır, AEO Yazıcı ile atıf-dostu içerik üretir, Halüsinasyon tespitiyle modellerin uydurduğu yanlışları yakalar, llms.txt / robots.txt / Schema üreticileriyle teknik altyapınızı AI'a açarsınız.",
  },
  {
    question: 'Hangi yapay zeka modellerini izliyorsunuz?',
    answer:
      'Şu an OpenAI (ChatGPT — gpt-4o-mini), Anthropic (Claude — claude-haiku-4-5) ve Google (Gemini — gemini-2.5-flash) modellerinde paralel sorgu çalıştırıyoruz. Perplexity ve Grok takibi planlanıyor — henüz mevcut değil.',
  },
  {
    question: 'Markamı nasıl tespit ediyorsunuz?',
    answer:
      'Onboarding sırasında marka adı + alternatif yazımlar (domain, kısaltma, farklı dil yazımı) eklersiniz. Sistem bu varyasyonları AI cevap metninde regex + alias matching ile arar; bulduğu her marka için pozisyon (kaçıncı bahsedilen), tonal değerlendirme (LLM destekli, beta) ve cümle bağlamı kaydeder. Ayrıca AI cevaplarındaki atıf kaynaklarını (citation) çıkarıp Top Citation Sources panelinde toplar — model web araması açıkken native atıflar, kapalıyken metin içi linkler (beta).',
  },
  {
    question: 'Sorgularım ne sıklıkla çalışıyor?',
    answer:
      'Her gece yaklaşık 02:00\'de (Türkiye saati, ±1 saat) tüm aktif sorgular 3 modelde otomatik yeniden çalıştırılır ve sonuçlar günlük trende eklenir; birikmiş işler zincirleme tetikleyiciyle tamamlanır. Ayrıca panelden "şimdi çalıştır" diyerek anında manuel rerun yapabilirsiniz. Haftalık özet rapor e-posta ve Slack\'e otomatik gönderilir.',
  },
  {
    question: 'Kayıt sırasında kredi kartı bilgisi gerekiyor mu?',
    answer: `Hayır. Lansman promosyonumuz kapsamında ${LAUNCH_OFFER.startsAt} itibarıyla kayıt olan tüm kullanıcılar ilk ${LAUNCH_OFFER.trialMonths} ay tüm özellikleri adil kullanım sınırları içinde (${FAIR.prompts} soru, ${FAIR.competitors} rakip, ${FAIR.members} ekip üyesi) ve kredi kartı bilgisi olmadan kullanır. Süre sonunda hesap salt-okunur moda geçer; verileriniz silinmez, otomatik ücretlendirme olmaz.`,
  },
  {
    question: 'API erişiminiz var mı?',
    answer:
      'Evet. Hesap sahibi panelden API token üretir; salt-okunur `/api/v1/visibility` ucundan görünürlük skoru, Share of Voice, trend ve rakip dağılımını kendi sisteminize çekersiniz (token başına 60 istek/dk). Webhooks henüz yok, planlanıyor. Ayrıca herkese açık ChatGPT / Claude / Gemini rank-checker araçlarımızı kayıt olmadan deneyebilirsiniz.',
  },
  {
    question: 'Verilerime kim erişebilir?',
    answer:
      "Sadece siz ve hesabınıza davet ettiğiniz takım üyeleri. Verileriniz Supabase Postgres (AB — Frankfurt) üzerinde TLS ile şifrelenir. AI provider'lara giden sorgular sadece izlediğiniz prompt metnini içerir — kullanıcı bilgisi paylaşılmaz.",
  },
];

const STATS = [
  { to: 3, suffix: '', label: 'AI modeli paralel' },
  { to: 13, suffix: '', label: 'GEO optimizasyon aracı' },
  { to: 30, suffix: ' gün', label: 'görünürlük trendi' },
  { to: 6, suffix: ' ay', label: 'tüm özellikler ücretsiz' },
];

const MARQUEE_ITEMS = [
  'ChatGPT',
  'Claude',
  'Gemini',
  'Share of Voice',
  'Citation Sources',
  'GEO Audit',
  'Halüsinasyon',
  'AEO',
  'llms.txt',
  'Schema',
  'Rekabet Radarı',
  'Görünürlük Boşluğu',
];

const FEATURES = [
  {
    icon: Brain,
    t: '3 modelde paralel sorgu',
    d: 'ChatGPT, Claude, Gemini — her birinin cevabı ayrı ayrı kayıt altına alınır, karşılaştırılır.',
  },
  {
    icon: Eye,
    t: 'Akıllı marka tespiti',
    d: 'Ana ad + alternatif yazımlar + domain + kısaltmalar; alias matching ile metinde tüm varyasyonlar yakalanır.',
  },
  {
    icon: TrendingUp,
    t: 'Görünürlük skoru',
    d: 'İzlenen tüm sorgularda markanızın geçtiği oran. Tek bir sayı, anlık sağlık göstergesi.',
  },
  {
    icon: GitCompare,
    t: 'Share of Voice',
    d: 'Sizin ve rakiplerinizin toplam bahsetme sayısı içindeki yüzdeniz. Pazar payınızın AI versiyonu.',
  },
  {
    icon: BarChart3,
    t: '30 günlük trend',
    d: "Görünürlük ve SoV'un zaman serisi. Dün ne oldu, geçen hafta ne değişti — net görün.",
  },
  {
    icon: Zap,
    t: 'Anında manuel çalıştırma',
    d: 'Bir prompt eklediniz ve sonucu hemen görmek istiyorsunuz? Tek tıkla 3 modelde paralel koştur.',
  },
  {
    icon: Layers,
    t: 'Rakip karşılaştırma matrisi',
    d: 'Her sorguda hangi rakiplerin geçtiği, kaçıncı sırada bahsedildiği — kategorik dağılım.',
  },
  {
    icon: Bell,
    t: 'Düşüş uyarıları',
    d: 'Görünürlüğünüz beklenmedik bir şekilde düşerse e-posta ve Slack ile haber alın.',
  },
  {
    icon: ShieldCheck,
    t: 'Bağımsız üçüncü taraf',
    d: "AI provider'larla iş ortaklığımız yok. Sonuçlar herhangi bir tarafın menfaatine göre filtrelenmez.",
  },
];

const DIFFERENTIATORS = [
  {
    icon: Radar,
    eyebrow: 'Rekabet Radarı',
    title: 'Rakiplerinizle yan yana, tek bakışta',
    body: 'Her modelde sizin ve rakiplerinizin görünürlüğü tek radar görünümünde. Kim hangi soruda öne geçmiş, nerede açık bırakmışsınız — anında okuyun.',
  },
  {
    icon: Quote,
    eyebrow: 'Top Citation Sources · beta',
    title: 'Yapay zeka kimden alıntı yapıyor?',
    body: 'AI cevaplarındaki atıf kaynaklarını çıkarır ve sıralar: modelin web araması açıkken native atıflar, kapalıyken metin içi linkler. Modellerin güvendiği siteleri görün — backlink ve içerik stratejinizi oraya yönlendirin.',
  },
  {
    icon: Crosshair,
    eyebrow: 'Görünürlük Boşluğu',
    title: 'Hangi sorularda hiç yoksunuz?',
    body: 'Rakiplerin geçtiği ama sizin hiç görünmediğiniz soruları işaretler. En yüksek getirili GEO fırsatlarınızın net listesi.',
  },
  {
    icon: Activity,
    eyebrow: 'Sentiment (beta) + Mention Type',
    title: 'Sadece geçiyor musunuz — nasıl geçiyorsunuz?',
    body: 'Her bahsedilme etiketlenir: LLM destekli olumlu/nötr/olumsuz ton (beta) ve bahsetme türü (öneri, karşılaştırma, pasif anma). Görünürlüğün kalitesini ölçün.',
  },
];

const AUTOMATION = [
  { icon: Zap, t: 'Günlük otomatik cron', d: 'Her gece ~02:00 TR (±1 saat) — tüm sorular 3 modelde yeniden koşar.' },
  { icon: Bell, t: 'Düşüş uyarıları', d: 'Görünürlük düşüşünde e-posta ve Slack bildirimi.' },
  { icon: Mail, t: 'Haftalık rapor', d: "E-posta ve Slack'e özet performans raporu." },
  {
    icon: Code2,
    t: 'Public API',
    d: 'API token + /api/v1/visibility ile veriyi kendi sisteminize çekin (salt-okunur). Webhooks planlanıyor.',
  },
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
    body: 'Müşteri markanızın AI görünürlüğünü panelde takip edin, aylık raporlarınızda yeni bir KPI sunun. Tek hesapta çoklu marka planlanıyor.',
  },
  {
    eyebrow: 'Kurumsal',
    title: 'AI çağında marka itibarınızı koruyun',
    body: 'Yapay zekanın size dair anlattığı hikayeyi izleyin, sentiment kayarsa veya yanlış bilgi üretirse erken farkına varın.',
  },
];

export default function Landing() {
  return (
    <>
      <SoftwareApplicationJsonLd />
      <FaqJsonLd items={LANDING_FAQS} />

      {/* Hero */}
      <section className="relative pt-24 lg:pt-32 pb-20 overflow-hidden">
        <div className="aurora-bg" aria-hidden />
        <Container className="relative z-10">
          <div className="rise-1 inline-flex items-center gap-2 chip">
            <Sparkles className="w-3 h-3 text-brand" />
            <span className="font-mono tracking-eyebrow">Lansman · İlk 6 ay tüm kullanıcılara ücretsiz</span>
          </div>

          <div className="grid grid-cols-12 gap-10 mt-8">
            <div className="col-span-12 lg:col-span-7">
              <h1 className="rise-2 font-display text-[52px] lg:text-[80px] leading-[0.98] tracking-tight">
                Yapay zekalar şirketinizden <span className="text-shimmer">bahsediyor mu?</span>
              </h1>
              <p className="rise-3 text-[17px] lg:text-[19px] text-ink-muted mt-7 max-w-2xl leading-relaxed">
                Müşterileriniz artık Google'da değil — ChatGPT'de, Claude'da, Gemini'de öneri istiyor. Independent AI bu
                sohbetlerdeki görünürlüğünüzü bağımsız bir gözle <span className="text-ink">ölçer</span>, sonra 13 GEO
                aracıyla <span className="text-ink">optimize etmenizi</span> sağlar.
              </p>

              <div className="rise-4 flex items-center gap-3 mt-10 flex-wrap">
                <Link href="/register" className="btn-primary inline-flex items-center gap-2">
                  6 ay ücretsiz dene <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/how-it-works" className="btn-secondary">
                  Nasıl çalışır
                </Link>
                <span className="text-[12px] text-ink-faint font-mono ml-2">kredi kartı gerekmez</span>
              </div>

              <div className="rise-5 mt-12 flex items-center gap-7 flex-wrap text-[12px] text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand" /> 3 model paralel
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand" /> Her gece otomatik
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand" /> Türkçe için optimize
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-brand" /> Bağımsız üçüncü taraf
                </span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-5 rise-5">
              <div className="float">
                <MockDashboard />
              </div>
            </div>
          </div>

          {/* Stats band */}
          <div className="rise-5 grid grid-cols-2 lg:grid-cols-4 gap-px mt-16 rounded-2xl overflow-hidden border-hairline border bg-hairline">
            {STATS.map((s) => (
              <div key={s.label} className="bg-paper-3 px-6 py-7">
                <div className="font-display text-[40px] lg:text-[46px] tracking-tight text-brand tabular leading-none">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="text-[12.5px] text-ink-muted mt-2 leading-snug">{s.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Marquee */}
      <div className="py-6 border-y border-hairline bg-paper-2/50">
        <Marquee>
          {MARQUEE_ITEMS.map((m) => (
            <span
              key={m}
              className="mx-6 inline-flex items-center gap-2 text-[15px] text-ink-faint font-display whitespace-nowrap"
            >
              <span className="w-1 h-1 rounded-full bg-brand/50" /> {m}
            </span>
          ))}
        </Marquee>
      </div>

      {/* Why now / problem */}
      <Section
        eyebrow="Neden şimdi"
        title={
          <>
            Müşterileriniz artık arama motoruna değil, <span className="text-brand">yapay zekaya soruyor.</span>
          </>
        }
        intro="2026 itibarıyla milyonlarca kullanıcı 'en iyi…' sorularını önce ChatGPT'ye veya Claude'a sorup öneri alıyor. Bu yeni davranışta görünmüyorsanız, satış hunisinin başı sizden geçmiyor demektir."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              n: '01',
              t: 'Yeni satın alma yolculuğu',
              d: "Kullanıcı sorusunu AI'ya soruyor → AI 2-3 marka öneriyor → kullanıcı sadece o markaları araştırıyor. Listede yoksanız fırsat yok.",
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
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="card p-7 h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
                <h3 className="font-display text-[20px] mt-4 leading-snug">{s.t}</h3>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* GEO toolbox — the new feature suite */}
      <Section
        eyebrow="GEO Araç Kutusu · Yeni"
        title={
          <>
            Ölçmek başlangıç. <span className="text-brand">13 araçla optimize edin.</span>
          </>
        }
        intro="Independent AI sadece görünürlüğünüzü göstermez — onu yükseltecek somut araçları da verir. Denetleyin, keşfedin, üretin; hepsi tek panelde, Türkçe."
        className="bg-paper-2/40"
      >
        <ToolBento />
      </Section>

      {/* Dashboard differentiators */}
      <Section
        eyebrow="Panelde öne çıkanlar"
        title="Rakiplerin gösteremediği derinlik."
        intro="Görünürlük tek bir sayı değil. Kiminle, nerede, hangi tonla ve hangi kaynaklara dayanarak görünüyorsunuz — hepsini ayrıştırır."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DIFFERENTIATORS.map((d, i) => (
            <Reveal key={d.eyebrow} delay={i * 80}>
              <div className="card p-7 h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-brand-glow flex items-center justify-center shrink-0">
                    <d.icon className="w-[18px] h-[18px] text-brand" />
                  </span>
                  <span className="eyebrow text-brand-deep">{d.eyebrow}</span>
                </div>
                <h3 className="font-display text-[21px] mt-5 leading-snug">{d.title}</h3>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{d.body}</p>
              </div>
            </Reveal>
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
            {
              n: '01',
              t: 'Markanızı tanıtın',
              d: 'Şirket adı, alternatif yazımlar, web sitesi ve 3-5 rakip ekleyin. Aliasları akıllı yakalama için detaylandırmanız önerilir.',
            },
            {
              n: '02',
              t: 'İzlenecek soruları girin',
              d: 'Müşterilerinizin AI\'a sorabileceği soruları yazın — örn. "İstanbul\'da en iyi dijital ajans" veya "muhasebe yazılımı önerir misin".',
            },
            {
              n: '03',
              t: 'Her sabah rapor',
              d: 'Her gece tüm sorular 3 modelde otomatik çalışır. Sabah panelinizde görünürlük skoru, SoV, trend ve rakip dağılımı sizi bekler.',
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="card p-7 h-full">
                <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
                <h3 className="font-display text-[22px] mt-4 leading-tight">{s.t}</h3>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Automation & integration strip */}
      <Section
        eyebrow="Otomasyon & entegrasyon"
        title="Kurun, unutun — sistem çalışmaya devam etsin."
        intro="Bir kez ayarlayın; ölçüm, uyarı, raporlama ve veri akışı arka planda otomatik döner."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {AUTOMATION.map((a, i) => (
            <Reveal key={a.t} delay={i * 70}>
              <div className="card p-6 h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <a.icon className="w-5 h-5 text-brand" />
                <h3 className="font-display text-[16px] mt-4 leading-snug">{a.t}</h3>
                <p className="text-[12.5px] text-ink-muted mt-2 leading-relaxed">{a.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <div className="mt-9 flex items-center gap-4 flex-wrap">
            <Link href="/arac/chatgpt-rank-checker" className="btn-secondary inline-flex items-center gap-2">
              <Target className="w-4 h-4 text-brand" /> Ücretsiz rank-checker'ı dene
            </Link>
            <Link
              href="/docs/api"
              className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
            >
              <Code2 className="w-4 h-4" /> API dokümanları
            </Link>
          </div>
        </Reveal>
      </Section>

      {/* Real AI answers preview */}
      <Section
        eyebrow="Gerçek AI cevapları"
        title={
          <>
            Sadece sayı değil. Modelin <span className="text-brand">kelime kelime cevabı.</span>
          </>
        }
        intro="Markanızın hangi cümlede, hangi tonla geçtiğini görün. Rakipleriniz nerede bahsediliyor — ve neden sizden önce bahsediliyor olabilirler."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-12 lg:col-span-7">
            <Reveal>
              <PromptCardMock />
            </Reveal>
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
                  t: 'Cümle bağlamı + sentiment',
                  d: 'Markanız "öneririm" ile mi, "yetersiz" ile mi geçiyor? Cümlenin etrafındaki bağlam ve ton kaydedilir.',
                },
              ].map((b, i) => (
                <Reveal key={b.t} delay={i * 80}>
                  <div className="border-l-2 border-brand/40 pl-5">
                    <h4 className="font-display text-[18px] tracking-tight">{b.t}</h4>
                    <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{b.d}</p>
                  </div>
                </Reveal>
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
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, t, d }, i) => (
            <Reveal key={t} delay={(i % 3) * 70}>
              <div className="card p-6 h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <Icon className="w-5 h-5 text-brand" />
                <h3 className="font-display text-[17px] mt-4 leading-snug">{t}</h3>
                <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/features"
            className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
          >
            Tüm özellik detayları <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* Use cases */}
      <Section
        eyebrow="Kimler için"
        title="Müşterileri AI'dan öneri alan herkes için."
        intro="Farklı sektörlerde aynı sorun: yapay zekanın gözünden nasıl görünüyoruz?"
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.eyebrow} delay={(i % 2) * 80}>
              <div className="card p-7 h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                <div className="eyebrow text-brand-deep">{u.eyebrow}</div>
                <h3 className="font-display text-[22px] mt-3 leading-snug">{u.title}</h3>
                <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{u.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/use-cases"
            className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
          >
            Tüm kullanım senaryoları <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Section>

      {/* Quote */}
      <Section>
        <Reveal>
          <div className="card p-10 lg:p-14 max-w-4xl mx-auto text-center">
            <Quote className="w-8 h-8 text-brand/40 mx-auto" />
            <p className="font-display text-[28px] lg:text-[34px] tracking-tight mt-6 leading-snug">
              "AI cevaplarında yokuz" derken aslında hangi cevaplarda olmadığımızı bilmiyorduk. Şimdi her sabah ilk
              açtığımız sekme Independent AI oluyor.
            </p>
            <div className="mt-7 text-[13px] text-ink-faint">
              — <span className="text-ink">Lansman testçisi</span>, SaaS pazarlama lideri
            </div>
          </div>
        </Reveal>
      </Section>

      {/* Pricing summary */}
      <Section
        eyebrow="Fiyatlandırma"
        title="Lansmanda her şey ücretsiz. 6 ay sonra ne istiyorsanız."
        intro="Bugün hesap aç, 6 ay boyunca tüm özellikleri adil kullanım sınırları içinde kullan. 6 ay sonunda devam etmek istemezsen otomatik ücretlendirme yok; ücretli plan fiyatları henüz açıklanmadı."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              t: 'Launch',
              p: '₺0',
              desc: '6 ay boyunca her şey dahil. Lansman fırsatı.',
              highlight: true,
              items: [
                '3 model paralel',
                `Adil kullanım: ${FAIR.prompts} soru · ${FAIR.competitors} rakip`,
                `${FAIR.members} ekip üyesi`,
                '13 GEO aracı',
                'API + uyarılar',
              ],
            },
            {
              t: 'Starter',
              p: 'Duyurulacak',
              desc: '6 ay sonrası — fiyat açıklanmadı. Küçük ekipler ve solo kurucular için taslak kapsam.',
              items: ['Tek marka', '50 izlenen soru', '3 kullanıcı', 'E-posta destek'],
            },
            {
              t: 'Growth',
              p: 'Duyurulacak',
              desc: '6 ay sonrası — fiyat açıklanmadı. Ajans ve kurumsal ekipler için taslak kapsam.',
              items: [
                'Çoklu marka (planlanıyor)',
                'Daha yüksek soru/rakip limitleri',
                'Genişletilmiş ekip',
                'Öncelikli destek',
                'API erişimi',
              ],
            },
          ].map((p, i) => (
            <Reveal key={p.t} delay={i * 80}>
              <div className={`card p-7 h-full ${p.highlight ? 'ring-2 ring-brand' : ''}`}>
                {p.highlight && <div className="chip own !text-[10px] mb-3">aktif</div>}
                <div className="eyebrow">{p.t}</div>
                <div
                  className={`font-display tracking-tight mt-2 tabular ${p.highlight ? 'text-[40px]' : 'text-[26px] leading-[1.6]'}`}
                >
                  {p.p}
                </div>
                <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{p.desc}</p>
                <ul className="space-y-2 mt-5">
                  {p.items.map((it) => (
                    <li key={it} className="flex items-center gap-2 text-[13px]">
                      <Check className="w-3.5 h-3.5 text-brand" /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
          >
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
