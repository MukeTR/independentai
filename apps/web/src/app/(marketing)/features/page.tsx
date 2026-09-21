import {
  Brain,
  Eye,
  TrendingUp,
  GitCompare,
  BarChart3,
  Zap,
  Layers,
  Bell,
  ShieldCheck,
  Globe2,
  MessagesSquare,
  ArrowRight,
  Sparkles,
  FileText,
  Webhook,
  Languages,
  Clock,
  Code2,
  Wrench,
  Share2,
  ListChecks,
  Radar,
  Quote,
  Search,
  Lock,
  Database,
} from 'lucide-react';
import Link from 'next/link';
import { CAPABILITIES, OFFER, formatTry } from '@independentai/shared';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { ECOMMERCE_TOOL_LINKS, RANK_CHECKER_LINKS } from '@/components/nav-data';
import { Ciz, type CizName } from '@/components/marketing/ciz';
import { buildMetadata } from '@/lib/seo';
import { getOffer } from '@/server/offer';

export const metadata = buildMetadata({
  title: 'Özellikler — Ölç, anla, düzelt',
  description:
    'ChatGPT, Claude ve Gemini müşteri sorularında sizi mi öneriyor? Yanıt ölçer, nedenini gösterir, düzeltme araçlarını verir.',
  path: '/features',
});

/**
 * Ücretsiz araç sayısı. Bugün: e-ticaret araçları + rank checker'lar (nav-data). INTEGRATE, PREP'in
 * `lib/tool-registry.ts` dosyası gelince şu satırı ekler:
 *   + TOOL_REGISTRY.filter((t) => t.enabled).length   (11 yeni site aracı)
 */
const PUBLIC_TOOL_COUNT = ECOMMERCE_TOOL_LINKS.length + RANK_CHECKER_LINKS.length;

type Feature = { icon: typeof Eye; t: string; d: string; badge?: 'yakında' };
/** Bölüm ortasına giren çizim durağı: ilk iki kartın ardından gelir, kalan kartlar altında sürer. */
type Illo = { name: CizName; alt: string; caption: string };
type Pillar = { id: string; eyebrow: string; title: string; body: string; features: Feature[]; illo?: Illo };

/**
 * Sütunlar. Ajans fiyatı sayfadan kaldırıldığı için burada artık `offer` gerekmiyor;
 * SaaS rakamı sayfanın altındaki CTA satırında doğrudan kullanılıyor.
 */
function buildPillars(): Pillar[] {
  return [
    {
      id: 'tracking',
      eyebrow: 'Ölç',
      title: 'Müşteri sorularını 3 modelde, her gün',
      body: 'Müşterilerinizin satın almadan önce sorduğu türden soruları tanımlarsınız (sektör önerileri + kendi eklediğiniz gerçek sorular). Yanıt her gün ChatGPT, Claude ve Gemini’ye sorar; cevapta siz mi varsınız, rakibiniz mi, kaçıncı sırada: kayıt altına alır.',
      features: [
        {
          icon: Brain,
          t: '3 model: ChatGPT, Claude, Gemini',
          d: 'Cevaplar ham hâliyle saklanır; tarih, model ve soru damgası her ölçümde durur. Perplexity ve Grok yol haritasında.',
        },
        {
          icon: Clock,
          t: 'Günlük otomatik ölçüm',
          d: 'Her gece (~02:00 TR, ±1 saat) tüm aktif sorular yeniden çalıştırılır; sabah paneliniz hazır. Tek sorguya değil, seriye bakarsınız.',
        },
        {
          icon: Zap,
          t: 'Anında “şimdi çalıştır”',
          d: 'Yeni bir soru eklediniz; tek tıkla üç modeli birden koşturun, 10–20 saniyede sonuç.',
        },
        {
          icon: Languages,
          t: 'Türkçe öncelikli',
          d: 'Türkçe sorular, Türkçe cevapta marka tespiti: ekler, kesme işaretleri, İ/ı ayrımı doğru ele alınır.',
        },
      ],
    },
    {
      id: 'analytics',
      eyebrow: 'Anla',
      title: 'Görünürlük boşluğu: rakip var, siz yoksunuz',
      body: 'Tek sayı yetmez. Hangi sorularda rakibiniz önerilip siz önerilmiyorsunuz, hangi modelde zayıfsınız, cevaplar hangi kaynaklara dayanıyor: nedeni görürsünüz.',
      illo: {
        name: 'kiyas',
        alt: 'Terazide tartılan iki web sayfası; mavi olan tarafın ağır bastığı çizim',
        caption: 'Aynı soruda kimin ağır bastığını rakip karşılaştırması gösterir.',
      },
      features: [
        {
          icon: TrendingUp,
          t: 'Görünürlük skoru ve trend',
          d: 'İzlenen sorularda markanızın geçtiği cevap oranı (0–100) ve 30 günlük seyri. Formül /docs#skorlar bölümünde açık.',
        },
        {
          icon: GitCompare,
          t: 'Share of Voice ve rakip karşılaştırması',
          d: 'Sizin + rakiplerinizin toplam bahsi içindeki payınız; soru bazında kim önde, kaç sıra önde.',
        },
        {
          icon: Radar,
          t: 'Sahipsiz sorular',
          d: 'Hiçbir rakibin de görünmediği sorular: en ucuz fırsat listesi. Rakibin göründüğü, sizin görünmediğiniz sorular önce gelir.',
        },
        {
          icon: Quote,
          t: 'Atıf kaynakları',
          d: 'Modellerin cevap üretirken dayandığı alan adları. Sağlayıcı web araması açıkken native atıf, kapalıyken metin içi bağlantılar.',
        },
      ],
    },
    {
      id: 'detection',
      eyebrow: 'Marka tespiti',
      title: 'Yazımdan bağımsız, açıklanabilir tespit',
      body: 'Markanız “Acme”, “Acme Corp”, “acme.com” ya da “AcmeCorp” olarak da yazılsa aynı marka sayılır. Tespit deterministiktir: neyin eşleştiği görülür, LLM yorumu yoktur.',
      features: [
        {
          icon: Eye,
          t: 'Alternatif yazımlar (alias)',
          d: 'Kurulumda tüm yazımları girersiniz; kelime sınırlı, Türkçe duyarsız eşleşme. Yanlış pozitifi önlemek için en uzun ad kazanır.',
        },
        {
          icon: Layers,
          t: 'Pozisyon',
          d: 'Cevapta kaçıncı anılan markasınız? İlk sırada olmak listede olmamaktan çok farklı; pozisyon ayrıca ölçülür.',
        },
        {
          icon: MessagesSquare,
          t: 'Cümle bağlamı',
          d: 'Markanın geçtiği cümlenin ±80 karakterlik bağlamı saklanır: “tavsiye edilir” mi, “önerilmez” mi, kendiniz okursunuz.',
        },
        {
          icon: Brain,
          t: 'Sentiment',
          d: 'Pozitif / nötr / negatif ton. Heuristik + LLM sınıflandırma; sağlayıcı anahtarı yoksa yalnızca heuristik.',
        },
      ],
    },
    {
      id: 'tools',
      eyebrow: 'Düzelt',
      title: 'Ücretsiz araçlar ve panel araçları',
      body: `Bulguyu bilmek yetmez, düzeltmek gerekir. ${PUBLIC_TOOL_COUNT} ücretsiz araç hesap istemeden çalışır; panelde denetim, keşif ve üretici araçları aynı bulguları derinleştirir. Uygulamayı isterseniz Yanıt Agency yapar.`,
      illo: {
        name: 'ajans',
        alt: 'Bir web sayfasını anahtar ve boya rulosuyla düzelten iki kişinin çizimi',
        caption: 'Bulguyu bilmek yetmez; listeyi uygulayan biri gerekir.',
      },
      features: [
        {
          icon: Search,
          t: 'Ücretsiz site araçları',
          d: 'E-ticaret AI görünürlük testi, ürün sayfası testi, AI crawler testi ve rank checker’lar; hesap yok, e-posta duvarı yok. Sonuçlar deterministik tarayıcıdan gelir, LLM’e kişisel veri gitmez.',
        },
        {
          icon: Wrench,
          t: 'Panel araçları',
          d: 'GEO denetimi, içerik denetimi, soru bulucu, AEO yazıcı, kanibalizasyon, halüsinasyon kontrolü, şema ve robots üreticileri, llms.txt.',
        },
        {
          icon: ListChecks,
          t: 'Yapılacaklar listesi',
          d: 'Bulguları tek haftalık listede toplayan, işaretledikçe ilerlemeyi gösteren ekran yol haritasında; bugün öneriler araç bazında gelir.',
          badge: 'yakında',
        },
        {
          icon: Sparkles,
          t: 'Yanıt Agency',
          d: 'Analizi biz yaptık, uygulamayı da biz yapalım: teknik düzeltme, şema/entity, içerik ve kaynak çalışması. Aylık sprint, kapsam görüşmesinden sonra teklifle; sonuç sözü yok, ölçüm var.',
        },
      ],
    },
    {
      id: 'reports',
      eyebrow: 'Raporlama ve paylaşım',
      title: 'Ekibinize, müşterinize, sisteminize',
      body: `Haftalık e-posta özeti, düşüş uyarıları, giriş gerektirmeyen paylaşım bağlantısı ve salt-okunur Public API. Ekip daveti ${OFFER.fairUse.members} üyeye kadar; roller ile yetki sınırlanır.`,
      features: [
        {
          icon: Bell,
          t: 'E-posta + Slack uyarıları, haftalık rapor',
          d: 'Görünürlük beklenmedik biçimde düşerse haber verir; haftalık özet aynı kanallardan gider.',
        },
        {
          icon: Share2,
          t: 'Paylaşılabilir rapor bağlantısı',
          d: 'İmzalı, süreli, giriş gerektirmeyen görünürlük özeti: son 7/30/90 gün, trend, modele göre kırılım. Beyaz etiket yok.',
        },
        {
          icon: Code2,
          t: 'Public API',
          d: 'Salt-okunur GET /api/v1/visibility: skor, SoV, trend, rakip ve atıf kaynakları. Token bazlı, 60 istek/dk. Belge: /docs/api.',
        },
        {
          icon: Globe2,
          t: 'Ekip ve roller',
          d: 'Owner, Admin, Viewer; ajanslar için müşteri başına çalışma alanı ve Stratejist/Analist rolleri.',
        },
        {
          icon: FileText,
          t: 'Aylık PDF rapor',
          d: 'Görünürlük, SoV ve rakip değişimini içeren aylık rapor planlanıyor; henüz yok.',
          badge: 'yakında',
        },
        {
          icon: Webhook,
          t: 'Webhooks',
          d: 'Olay tabanlı bildirimler planlanıyor; şimdilik veriyi Public API ile çekin.',
          badge: 'yakında',
        },
      ],
    },
    {
      id: 'trust',
      eyebrow: 'Güven',
      title: 'Bağımsız, açık yöntem, KVKK',
      body: 'Hiçbir yapay zekâ sağlayıcısıyla menfaat ilişkimiz yok; sonuçları olduğu gibi gösteririz. Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.',
      features: [
        {
          icon: ShieldCheck,
          t: 'Bağımsız üçüncü taraf',
          d: 'OpenAI, Anthropic veya Google ile iş ortaklığı yok. Cevaplar filtrelenmez, sıralama değiştirilmez.',
        },
        {
          icon: Lock,
          t: 'Şifreli iletişim',
          d: 'Tüm bağlantılar HTTPS/TLS. Şifreler scrypt ile hashlenir; oturum JWT tabanlı.',
        },
        {
          icon: Database,
          t: 'Veri AB’de',
          d: 'Veriler Supabase Postgres (Frankfurt) üzerinde, günlük yedekleme ile. Dışa aktarılabilir, silinebilir.',
        },
        {
          icon: ShieldCheck,
          t: 'KVKK metinleri',
          d: 'KVKK aydınlatma metni, gizlilik ve kullanım koşulları yayında; veri sahibi hakları aydınlatma metninde.',
        },
      ],
    },
  ];
}

function FeatureCard({ f }: { f: Feature }) {
  return (
    <div className={`card p-6 ${f.badge === 'yakında' ? 'border-dashed' : ''}`}>
      <div className="flex items-center justify-between">
        <f.icon className="w-5 h-5 text-brand" aria-hidden />
        {f.badge ? <span className="chip !text-[10px]">{f.badge}</span> : null}
      </div>
      <h3 className="font-display text-[19px] mt-4 leading-snug">{f.t}</h3>
      <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{f.d}</p>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = { live: 'yayında', roadmap: 'yakında' };

export default async function FeaturesPage() {
  const offer = await getOffer();
  const pillars = buildPillars();
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Özellikler', href: '/features' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Özellikler · Ölç → Anla → Düzelt</div>
          <h1 className="font-display text-[48px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Sizi mi öneriyor, rakibinizi mi — <span className="text-brand">ve neden?</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Müşteriniz satın almadan önce yapay zekâya soruyor. Yanıt o sorularda kimin önerildiğini ölçer, nedenini
            gösterir, düzeltme araçlarını verir ve her sabah yeniden ölçer. Siz düzeltin ya da Yanıt Agency düzeltsin.
          </p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link href="/arac" className="btn-primary inline-flex items-center gap-2">
              Ücretsiz araçlarla başlayın <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/pricing" className="btn-secondary">
              Fiyatlandırma
            </Link>
            <span className="text-[12px] text-ink-faint font-mono ml-2">
              {offer.trialDays} gün deneme · kart yok · {formatTry(offer.saasMonthlyTry)}/ay
            </span>
          </div>
          <nav aria-label="Bölümler" className="mt-8 flex flex-wrap gap-2">
            {pillars.map((p) => (
              <a key={p.id} href={`#${p.id}`} className="chip hover:bg-brand-glow transition !text-[11.5px]">
                {p.eyebrow}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      {pillars.map((p, idx) => (
        <Section
          key={p.id}
          id={p.id}
          eyebrow={p.eyebrow}
          title={p.title}
          intro={p.body}
          className={`scroll-mt-20 ${idx % 2 === 1 ? 'bg-paper-2/40' : ''}`}
        >
          {p.illo ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {p.features.slice(0, 2).map((f) => (
                  <FeatureCard key={f.t} f={f} />
                ))}
              </div>
              <figure className="mt-10 max-w-[460px] mx-auto rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
                <Ciz name={p.illo.name} alt={p.illo.alt} className="p-2" />
                <figcaption className="text-[12.5px] text-ink-faint px-6 py-4 border-t border-hairline">
                  {p.illo.caption}
                </figcaption>
              </figure>
              <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5">
                {p.features.slice(2).map((f) => (
                  <FeatureCard key={f.t} f={f} />
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {p.features.map((f) => (
                <FeatureCard key={f.t} f={f} />
              ))}
            </div>
          )}
        </Section>
      ))}

      {/* Yetenek matrisi — tek kaynak: CAPABILITIES */}
      <Section
        id="capabilities"
        eyebrow="Yetenek matrisi"
        title="Ne yayında, ne yakında?"
        intro="Aşağıdaki liste koddaki yetenek matrisinden gelir; bir özellik burada 'yayında' değilse hiçbir sayfa onu çalışan özellik gibi anlatmaz."
        className="bg-paper-2/40 scroll-mt-20"
      >
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {CAPABILITIES.map((c) => (
            <li
              key={c.key}
              className={`card p-4 flex items-start gap-3 ${c.status === 'roadmap' ? 'border-dashed bg-transparent' : ''}`}
            >
              <span
                className={`chip !text-[10px] shrink-0 ${c.status === 'live' ? 'own' : ''}`}
                aria-label={`durum: ${STATUS_LABEL[c.status]}`}
              >
                {STATUS_LABEL[c.status]}
              </span>
              <span>
                <span className="text-[13.5px] text-ink leading-snug block">{c.label}</span>
                {c.note ? (
                  <span className="text-[12px] text-ink-faint mt-1 block leading-relaxed">{c.note}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex items-center gap-3 flex-wrap">
          <BarChart3 className="w-4 h-4 text-brand" aria-hidden />
          <span className="text-[13px] text-ink-muted">Yol haritası kullanıcı geri bildirimiyle şekilleniyor.</span>
          <Link
            href="/contact#form"
            className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1.5"
          >
            İstek yollayın <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </Section>

      <CtaBlock
        eyebrow="Önce ücretsiz"
        title={
          <>
            Önce ölçün, <span className="text-brand">sonra düzeltin.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez. Sürekli ölçüm, rakip karşılaştırması ve raporlar için hesap açın; kart gerekmez."
        secondaryHref="/arac"
        secondaryLabel="Ücretsiz araçlar"
      />
    </>
  );
}
