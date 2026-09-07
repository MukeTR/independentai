import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  Boxes,
  Check,
  Database,
  Lock,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { LAUNCH_OFFER } from '@independentai/shared';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq, type FaqItem } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { ECOMMERCE_TOOL_LINKS, SOLUTION_LINKS } from '@/components/nav-data';

export type SolutionStep = { title: string; body: string };
export type SolutionSetupStep = { t: string; d: string; code?: string };
export type SolutionConfig = {
  path: string;
  /** Kısa ad (Shopify, ikas, Ticimax, E-ticaret) */
  name: string;
  eyebrow: string;
  title: ReactNode;
  intro: string;
  badges: string[];
  breadcrumb: string;
  /** Platforma özgü kurulum; genel sayfada null (platform kartları gösterilir) */
  setup: { title: string; intro: string; steps: SolutionSetupStep[]; notes: string[]; docsHref?: string } | null;
  /** Senkron modeli — dürüst tek cümle */
  syncMode: string;
  faqs: FaqItem[];
  cta: { title: ReactNode; body: string };
};

const HOW_IT_WORKS: SolutionStep[] = [
  {
    title: 'Bağla',
    body: 'Mağazanı seç, yetkilendir: Shopify’da OAuth, ikas’ta Client ID/Secret, Ticimax’ta servis üye kodu. Yalnızca ürün okuma izni istenir.',
  },
  {
    title: 'Katalog senkronu (salt-okunur)',
    body: 'Ürün adı, açıklama, fiyat aralığı, stok durumu, görsel, kategori ve SEO alanları çekilir. Sipariş, müşteri ve ödeme verisi asla istenmez; mağazana yazma yapılmaz.',
  },
  {
    title: 'Hazırlık skoru',
    body: 'Mağazan ve ürün sayfaların için AI hazırlık skoru: yapısal veri (Product/Offer şeması), açıklama netliği, doğrulanabilir gerçekler, AI crawler erişimi.',
  },
  {
    title: 'İzleme soruları',
    body: 'Kategorinde AI’a sorulan soruları izle — “en iyi … markası”, “… için hangi ürünü önerirsin”. Her gece ChatGPT, Claude ve Gemini’de; sıra, ton ve rakiplerle karşılaştırma.',
  },
  {
    title: 'Düzeltme rehberi',
    body: 'Eksik SEO başlığı, zayıf açıklama, şema hatası gibi bulgular için adım adım rehber; ürün açıklama yazıcı (beta) ile AI-dostu taslak.',
  },
];

const SCOPE_IN = [
  'Ürün adı, açıklama, fiyat aralığı, stok durumu',
  'Ürün görseli ve alt metni, kategori/koleksiyon, tür',
  'SEO başlığı/açıklaması; SKU, barkod gibi tanımlayıcılar',
  'Mağaza adı, para birimi, alan adı',
];
const SCOPE_OUT = [
  'Sipariş ve sepet verisi',
  'Müşteri bilgileri, adresler, iletişim',
  'Ödeme ve fatura bilgileri',
  'Mağazana yazma — erişim salt-okunurdur',
];

const PLATFORM_ICONS: Record<string, typeof Store> = {
  '/solutions/shopify': ShoppingBag,
  '/solutions/ikas': Store,
  '/solutions/ticimax': Boxes,
};

/**
 * Çözüm sayfası iskeleti: hero → nasıl çalışır → (kurulum | platform kartları) → veri kapsamı ve güvenlik →
 * ücretsiz araçlar → SSS (FAQPage JSON-LD) → kayıt CTA. Fiyat/rakam/müşteri logosu uydurulmaz.
 */
export function SolutionPage({ config }: { config: SolutionConfig }) {
  const fair = LAUNCH_OFFER.fairUse;
  const platforms = SOLUTION_LINKS.filter((l) => l.href in PLATFORM_ICONS);
  return (
    <>
      <FaqJsonLd items={config.faqs} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Çözümler', href: '/solutions' },
          { name: config.breadcrumb, href: config.path },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="eyebrow">{config.eyebrow}</div>
            {config.badges.map((b) => (
              <span key={b} className="chip !text-[10px]">
                {b}
              </span>
            ))}
          </div>
          <h1 className="font-display text-[44px] lg:text-[64px] tracking-tight mt-4 leading-[1.04]">{config.title}</h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">{config.intro}</p>
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <Link href="/register" className="btn-primary inline-flex items-center gap-2">
              Ücretsiz başla <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link href="/arac/e-ticaret-ai-gorunurluk-testi" className="btn-secondary inline-flex items-center gap-2">
              <Search className="w-4 h-4" aria-hidden /> Önce ücretsiz testi dene
            </Link>
            <span className="text-[12px] text-ink-faint font-mono">kredi kartı yok · salt-okunur erişim</span>
          </div>
          <p className="text-[12.5px] text-ink-faint mt-4 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden /> {config.syncMode}
          </p>
        </Container>
      </section>

      <Section eyebrow="Nasıl çalışır" title="Bağla, senkronla, ölç, düzelt — beş adım." className="bg-paper-2/40">
        <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.title} className="card p-5 flex flex-col">
              <div className="font-mono text-[11px] text-brand-deep">0{i + 1}</div>
              <h3 className="font-display text-[17px] mt-2 leading-snug">{s.title}</h3>
              <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {config.setup ? (
        <Section id="kurulum" eyebrow="Kurulum" title={config.setup.title} intro={config.setup.intro}>
          <ol className="space-y-4 max-w-3xl">
            {config.setup.steps.map((s, i) => (
              <li key={s.t} className="card p-5 grid grid-cols-[auto_1fr] gap-4">
                <span
                  className="w-8 h-8 rounded-full bg-ink text-paper-3 font-mono text-[12px] inline-flex items-center justify-center shrink-0"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[16px] leading-snug">{s.t}</h3>
                  <p className="text-[13.5px] text-ink-muted mt-1.5 leading-relaxed">{s.d}</p>
                  {s.code && (
                    <pre className="mt-2 text-[12px] font-mono bg-paper-2 border border-hairline rounded-lg px-3 py-2 overflow-x-auto whitespace-pre">
                      {s.code}
                    </pre>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {config.setup.notes.length > 0 && (
            <ul className="mt-6 max-w-3xl space-y-2">
              {config.setup.notes.map((n) => (
                <li key={n} className="text-[13px] text-ink-muted flex items-start gap-2">
                  <Wrench className="w-3.5 h-3.5 mt-0.5 text-ink-faint shrink-0" aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
          )}
          {config.setup.docsHref && (
            <Link
              href={config.setup.docsHref}
              className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep hover:text-brand mt-6"
            >
              Teknik dokümantasyon <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          )}
        </Section>
      ) : (
        <Section
          id="platformlar"
          eyebrow="Platformlar"
          title="Desteklenen mağaza altyapıları."
          intro="Üç bağlayıcı da beta: çalışıyor, gerçek mağazalarla test ediliyor; sınırları her sayfada açıkça yazıyoruz."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {platforms.map((p) => {
              const Icon = PLATFORM_ICONS[p.href]!;
              return (
                <Link key={p.href} href={p.href} className="card p-6 group hover:-translate-y-0.5 transition-transform">
                  <div className="flex items-center justify-between">
                    <Icon className="w-5 h-5 text-brand" aria-hidden />
                    {'badge' in p && p.badge ? <span className="chip !text-[10px]">{p.badge}</span> : null}
                  </div>
                  <h3 className="font-display text-[19px] mt-4">{p.title}</h3>
                  <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">{p.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep mt-4 group-hover:text-brand">
                    Kurulum adımları <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
          <p className="text-[13px] text-ink-muted mt-6 max-w-2xl leading-relaxed">
            Platformun listede yok mu? Mağaza bağlamadan da ücretsiz araçlarla ürün sayfalarını ve AI crawler erişimini
            test edebilirsin; sihirbazdaki “platformumu bilmiyorum” adımı herkese açık sayfadan altyapını tespit eder.
          </p>
        </Section>
      )}

      <Section
        eyebrow="Veri kapsamı ve güvenlik"
        title="Ne çekiyoruz, ne çekmiyoruz — açıkça."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-6">
            <div className="flex items-center gap-2 text-positive font-medium text-[14px]">
              <Check className="w-4 h-4" aria-hidden /> Çekilen veri
            </div>
            <ul className="mt-4 space-y-2">
              {SCOPE_IN.map((s) => (
                <li key={s} className="text-[13.5px] text-ink-muted flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 mt-1 text-positive shrink-0" aria-hidden /> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-2 text-danger font-medium text-[14px]">
              <X className="w-4 h-4" aria-hidden /> Çekilmeyen veri
            </div>
            <ul className="mt-4 space-y-2">
              {SCOPE_OUT.map((s) => (
                <li key={s} className="text-[13.5px] text-ink-muted flex items-start gap-2">
                  <X className="w-3.5 h-3.5 mt-1 text-danger shrink-0" aria-hidden /> {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
          {[
            {
              icon: Lock,
              t: 'Şifreli kimlik bilgisi',
              d: 'Token, anahtar ve üye kodları AES-256-GCM ile şifreli saklanır; panelde ve loglarda asla görünmez.',
            },
            {
              icon: ShieldCheck,
              t: 'Doğrulanmış uçlar',
              d: 'Sağlayıcı adresleri sabit desenlerle doğrulanır (SSRF koruması); webhook teslimatları HMAC imzasıyla kontrol edilir.',
            },
            {
              icon: Database,
              t: 'PII yok',
              d: 'Kişisel veri işlenmez: katalog yalnızca ürün ve mağaza meta verisidir. KVKK aydınlatmamız bunu kapsar.',
            },
            {
              icon: Trash2,
              t: 'İstediğinde kes / sil',
              d: 'Bağlantıyı kesince kimlik bilgisi silinir ve katalog arşivlenir; silince tüm katalog verisi kalıcı olarak kaldırılır.',
            },
          ].map((f) => (
            <div key={f.t} className="card p-5">
              <f.icon className="w-[18px] h-[18px] text-brand" aria-hidden />
              <h3 className="font-display text-[15px] mt-3">{f.t}</h3>
              <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
        <p className="text-[12.5px] text-ink-faint mt-6 font-mono">
          // Lansman adil kullanımı: hesap başına {fair.storeConnections} mağaza bağlantısı, bağlantı başına{' '}
          {fair.catalogProducts.toLocaleString('tr-TR')} ürün. Ücretli planlar duyurulmadı.
        </p>
      </Section>

      <Section
        eyebrow="Ücretsiz araçlar"
        title="Mağaza bağlamadan önce test et."
        intro="Kayıt gerekmez. Herkese açık sayfalarından okunur; kimlik bilgisi istenmez."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ECOMMERCE_TOOL_LINKS.map((t) => (
            <Link key={t.href} href={t.href} className="card p-5 group hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center justify-between">
                <Plug className="w-4 h-4 text-brand" aria-hidden />
                {'badge' in t && t.badge ? <span className="chip !text-[10px]">{t.badge}</span> : null}
              </div>
              <h3 className="text-[14.5px] font-medium mt-3 leading-snug">{t.title}</h3>
              <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">{t.description}</p>
              <span className="inline-flex items-center gap-1 text-[12.5px] text-brand-deep mt-3 group-hover:text-brand">
                Aç <ArrowRight className="w-3 h-3" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section eyebrow="Sıkça sorulanlar" title={`${config.name} hakkında sorular.`} className="bg-paper-2/40">
        <div className="max-w-3xl">
          <Faq items={config.faqs} defaultOpen={0} />
        </div>
      </Section>

      <CtaBlock
        eyebrow="Lansman · ücretsiz"
        title={config.cta.title}
        body={config.cta.body}
        primaryLabel="Ücretsiz başla"
        secondaryHref="/arac/e-ticaret-ai-gorunurluk-testi"
        secondaryLabel="Önce ücretsiz testi dene"
      />
    </>
  );
}
