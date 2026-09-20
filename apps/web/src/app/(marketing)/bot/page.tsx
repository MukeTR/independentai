import Link from 'next/link';
import { ArrowRight, Bot, Gauge, ShieldCheck, Slash } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata, SITE_URL } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'YanitBot — tarayıcımız hakkında',
  description:
    'YanitBot, Yanıt’ın ücretsiz site araçları ve panel denetimleri için herkese açık sayfaları okuyan tarayıcıdır. Ne çeker, ne çekmez, User-Agent dizeleri, tarama bütçesi ve nasıl engellenir.',
  path: '/bot',
});

/** Sabah kararı #16: UA'daki adres SITE_URL (independentai.space) kalır; yanit.io geçişinde tek seferde değişir. */
const UA = `YanitBot/1.0 (+${SITE_URL}/bot)`;
/**
 * Geçiş dönemi kimliği: GEO denetimi, içerik denetimi, platform tespiti ve e-ticaret araçları hâlâ
 * `server/safe-fetch.ts` sabitini gönderir. INTEGRATE bu sabiti SCAN_UA ile değiştirene kadar
 * (PAZARLAMA_HIKAYESI §8) iki dize de aynı tarayıcıya aittir; sayfa ikisini de açıkça söyler.
 */
const LEGACY_UA = 'IndependentAI-GEOBot/1.0 (+https://independentai.space)';

const FETCHES = [
  'Girilen alan adının ana sayfası ve ilgili birkaç sayfa (ör. bir ürün sayfası, hakkında/iletişim)',
  'robots.txt, sitemap.xml, llms.txt',
  'HTTP başlıkları (güvenlik başlıkları, yönlendirme zinciri, canonical)',
  'Sayfadaki HTML: title, meta, H1, Open Graph, JSON-LD şemaları, hreflang, bağlantılar',
];

const NEVER = [
  'Giriş gerektiren sayfalar, formlar, çerezler ya da oturum verisi',
  'JavaScript çalıştırma (ham HTML okunur; JS ile render edilen içerik görünmeyebilir — bunu uyarı olarak söyleriz)',
  'Kişisel veri: ziyaretçi, müşteri ya da sipariş bilgisi istenmez; çekilen içerik yapay zekâ servislerine gönderilmez',
  'Görsel, video ya da ikili dosya indirme (yalnız başlık/boyut bilgisi)',
];

const BUDGET = [
  {
    k: 'Tetikleyici',
    v: 'Kullanıcı isteği: biri alan adınızı ücretsiz bir araca ya da panele girdiğinde. Kendiliğinden gezmez.',
  },
  {
    k: 'Bütçe',
    v: 'Tarama başına en fazla 120 istek / 5 MB / 25 saniye; hedef alan adı başına saatte en fazla 12 tarama (çok istekli araçlarda 6). Bütçe dolunca tarama kısmi sonuçla durur.',
  },
  {
    k: 'Önbellek',
    v: 'Aynı alan adı için sonuç yeni site araçlarında 24 saate, eski araçlarda (GEO denetimi, e-ticaret ve ürün sayfası taramaları) 10 dakikaya kadar önbellekte kalır; bu sürede tekrar tarama yapılmaz.',
  },
  { k: 'Kimlik', v: `User-Agent: ${UA} · Accept-Language: tr-TR` },
  {
    k: 'Geçiş',
    v: `Geçiş süresince GEO denetimi, içerik denetimi, platform tespiti ve e-ticaret araçları eski kimlikle de görünebilir: ${LEGACY_UA}. İki dize aynı tarayıcıya aittir; engelleme kuralınızı ikisi için de yazın.`,
  },
  { k: 'Kaynak', v: 'Bulut (Vercel) çıkış IP’leri; sabit IP listesi yok. Kimlik için UA dizesine bakın.' },
];

const ROBOTS = `User-agent: YanitBot
Disallow: /

User-agent: IndependentAI-GEOBot
Disallow: /`;

export default function BotPage() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'YanitBot', href: '/bot' },
        ]}
      />

      <section className="pt-24 pb-12">
        <Container className="max-w-4xl">
          <div className="inline-flex items-center gap-2 chip">
            <Bot className="w-3 h-3 text-brand" aria-hidden />
            <span className="font-mono tracking-eyebrow">YanitBot</span>
          </div>
          <h1 className="font-display text-[44px] lg:text-[60px] tracking-tight mt-5 leading-[1.02]">
            Sunucu kayıtlarınızda <span className="text-brand">YanitBot</span> mu gördünüz?
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            YanitBot, Yanıt’ın ücretsiz site araçları ve panel denetimleri için herkese açık sayfaları okuyan
            tarayıcıdır. Kendiliğinden web’i gezmez: biri alan adınızı bir araca girdiğinde, sınırlı bir bütçeyle
            sitenizi okur ve durur.
          </p>
          <div className="mt-6 card p-4 font-mono text-[13px] text-ink overflow-x-auto">
            <div>{UA}</div>
            <div className="mt-2 text-ink-faint text-[12px]">geçiş süresince ayrıca: {LEGACY_UA}</div>
          </div>
        </Container>
      </section>

      <Section eyebrow="Ne çeker, ne çekmez" title="Yalnızca herkese açık olanı okur." className="py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-7">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-brand" aria-hidden />
              <div className="font-display text-[18px]">Çeker</div>
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px] list-disc pl-5 text-ink">
              {FETCHES.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div className="card p-7">
            <div className="flex items-center gap-2">
              <Slash className="w-5 h-5 text-brand" aria-hidden />
              <div className="font-display text-[18px]">Asla</div>
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px] list-disc pl-5 text-ink-muted">
              {NEVER.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-[12.5px] text-ink-faint mt-5">
          Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.
        </p>
      </Section>

      <Section
        eyebrow="Tarama bütçesi ve kimlik"
        title="Küçük, kısa, tanımlı."
        className="py-12 lg:py-16 bg-paper-2/40"
      >
        <div className="card divide-y divide-hairline">
          {BUDGET.map((b) => (
            <div key={b.k} className="grid grid-cols-12 gap-4 p-5 text-[14px]">
              <div className="col-span-12 sm:col-span-3 font-mono text-[12px] text-ink-faint uppercase tracking-wider">
                {b.k}
              </div>
              <div className="col-span-12 sm:col-span-9 text-ink-muted leading-relaxed break-words">{b.v}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-[13px] text-ink-muted">
          <Gauge className="w-4 h-4 text-brand" aria-hidden /> Tüm istekler SSRF korumalı bir getirici üzerinden geçer;
          yalnızca http/https ve herkese açık adresler.
        </div>
      </Section>

      <Section
        id="engelleme"
        eyebrow="Engelleme"
        title="İstemiyorsanız, engelleyin."
        intro="Bugün en kesin yol sunucu ya da WAF düzeyinde User-Agent engelidir: 403/503 aldığımızda taramayı bırakır ve aracı kullanan kişiye “bot koruması nedeniyle taranamadı” deriz. robots.txt’deki YanitBot kuralına uyum yakında; kuralı şimdiden ekleyebilirsiniz, uyum devreye girdiğinde taramayı başlamadan durduracağız."
        className="py-12 lg:py-16"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="chip !text-[10.5px]">robots.txt uyumu · yakında</span>
          <span className="text-[12.5px] text-ink-faint">UA engeli bugün, robots.txt kuralı yakında tanınır.</span>
        </div>
        <pre className="card p-5 font-mono text-[13px] leading-relaxed overflow-x-auto whitespace-pre">{ROBOTS}</pre>
        <p className="text-[13.5px] text-ink-muted mt-5 leading-relaxed max-w-2xl">
          Not: Bu sayfa YanitBot’u anlatır; ChatGPT, Claude ve Gemini’nin kendi tarayıcıları (GPTBot, ClaudeBot,
          Google-Extended…) ayrı user-agent’lardır ve ayrı kurallarla yönetilir. Onları engellerseniz yapay zekâ
          cevaplarında görünürlüğünüz etkilenebilir; ücretsiz robots.txt kontrol aracımız bunu ayrıca gösterir.
        </p>
      </Section>

      <Section eyebrow="İletişim" title="Sorunuz mu var?" className="py-12 lg:py-16 bg-paper-2/40">
        <p className="text-[15px] text-ink-muted leading-relaxed max-w-2xl">
          Beklenmedik trafik, yanlış tarama ya da kaldırma talebi için bize yazın; bir iş günü içinde döneriz. Taramaya
          konu alan adını ve tarihi eklerseniz kaydı hemen buluruz.
        </p>
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <Link href="/contact#form" className="btn-primary inline-flex items-center gap-2">
            Bize yazın <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
          <Link href="/how-it-works" className="btn-secondary">
            Nasıl çalışır
          </Link>
        </div>
      </Section>
    </>
  );
}
