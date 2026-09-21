import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, Check, Compass, ScanSearch, Wrench } from 'lucide-react';
import { OFFER, formatTry } from '@independentai/shared';
import { getOffer } from '@/server/offer';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { SiteTool, KVKK_SENTENCE } from '@/components/marketing/site-tool';
import { SectorQuestionsList } from '@/components/marketing/sector-questions-list';
import { SectorChecks } from '@/components/marketing/sector-checks';
import { BreadcrumbJsonLd, FaqJsonLd, ServiceJsonLd, WebPageJsonLd } from '@/components/json-ld';
import { statSentence } from '@/data/stats';
import { SECTORS, sectorPath, type Sector } from '@/data/sectors';
import { toolBySlug, toolPath } from '@/lib/tool-registry';

/**
 * Sektör landing şablonu (spec §7.2). Sıra: hero (görsel sağda, `priority`) → "Müşteriniz bunu soruyor" (5 kart,
 * FaqJsonLd DEĞİL) → gömülü `satin-alma-sorusu-kapsama` (Suspense, sektör ön-seçili) → 3 kontrol → "Neden yoksunuz →
 * ne yapmalı" → "Nasıl ilerlersiniz" (SaaS / Agency) → SSS 5 (FaqJsonLd) → CTA. JSON-LD: Breadcrumb + FAQ + WebPage +
 * Service; `aggregateRating` yok. `regulated` sektörlerde "bilgilendirme ve görünürlük ölçümü" dili (veri sectors.ts'te).
 */

export const SECTOR_CONTACT_SRC = 'sektor';

/** "Yanıt Agency ile konuş" hedefi: /contact?src=sektor&sektor=<slug> */
export function sectorContactHref(slug: string): string {
  return `/contact?src=${SECTOR_CONTACT_SRC}&sektor=${encodeURIComponent(slug)}`;
}

/** Sektör kontrol aracı → "neden yoksunuz / ne yapmalı" çifti (araç slug'ına göre; sektör metni checks[].why'dan gelir). */
const REASONS: Record<string, { reason: string; action: string }> = {
  'seo-karnesi': {
    reason: 'Başlık ve açıklama sizi tarif etmiyor',
    action: 'Title ve meta açıklamayı “ne yaparız, kime, nerede” cümlesine çevirin; H1 sayfa başına tek olsun.',
  },
  'schema-denetimi': {
    reason: 'Kimliğiniz makine için yazılmamış',
    action: 'Organization ve sektör tipinizde JSON-LD ekleyin: ad, adres, telefon, hizmet bölgesi, sameAs.',
  },
  'guven-sinyalleri': {
    reason: 'Asistan sizi doğrulayamıyor',
    action: 'Telefon, adres, hakkımızda ve KVKK aydınlatma sayfasını metin olarak ve tutarlı yazın.',
  },
  'rakip-kiyas': {
    reason: 'Rakibiniz aynı soruda daha okunaklı',
    action: '14 maddelik kıyasta eksik olduğunuz kalemleri listeleyin; önce kimlik ve erişim maddelerini kapatın.',
  },
  'whatsapp-onizleme': {
    reason: 'Paylaşılan linkiniz boş kart olarak gidiyor',
    action: 'og:title, og:description ve mutlak adresli, 1200×630 og:image ekleyin; görsel 300 KB altında kalsın.',
  },
  'guvenlik-basliklari': {
    reason: 'Site güven başlıklarını vermiyor',
    action: 'HTTPS’i zorunlu kılın; HSTS, X-Content-Type-Options ve Referrer-Policy başlıklarını sunucudan gönderin.',
  },
  'yonlendirme-zinciri': {
    reason: 'Adresiniz birden fazla adımda açılıyor',
    action: 'http/https ve www/çıplak varyantları tek adımda tek kanonik adrese 301 ile yönlendirin.',
  },
  'kirik-link-bulucu': {
    reason: 'Botlar ve müşteriler 404’e düşüyor',
    action: 'Kaldırılan sayfaları güncel karşılığına 301 ile bağlayın; menü ve sitemap’ten eski linkleri çıkarın.',
  },
  'robots-sitemap-kontrol': {
    reason: 'Botlar sitenize giremiyor ya da güncel sayfayı bulamıyor',
    action: 'robots.txt’te felaket kurallarını kaldırın; sitemap’i güncel ve erişilebilir tutun, robots’ta bildirin.',
  },
  'hreflang-kontrol': {
    reason: 'Yabancı dilde soran müşteri sizi görmüyor',
    action: 'Her dil sürümü ayrı URL’de; karşılıklı hreflang ve x-default ile bağlayın.',
  },
  'e-ticaret-ai-gorunurluk-testi': {
    reason: 'Katalog yapısı asistan için okunaksız',
    action: 'Product/Offer şeması, kategori sayfaları ve AI bot erişimini 6 eksende düzeltin.',
  },
  'satin-alma-sorusu-kapsama': {
    reason: 'Müşterinin sorduğu soruların cevabı sitenizde yok',
    action: 'Fiyat, konum ve güven sorularına SSS ve soru başlıklı bölümlerle açık cevap verin.',
  },
};

const FALLBACK_REASON = {
  reason: 'Sitenizde bu kontrolün karşılığı yok',
  action: 'Aracı çalıştırın; bulgunun altındaki “nasıl düzelir” adımını uygulayın.',
};

function SectorHero({ sector }: { sector: Sector }) {
  return (
    <section className="pt-20 pb-12 lg:pt-24 lg:pb-16">
      <Container>
        <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="col-span-12 lg:col-span-6">
            <div className="eyebrow">{sector.name} · yapay zekâ görünürlüğü</div>
            <h1 className="font-display text-[40px] sm:text-[48px] lg:text-[60px] tracking-tight mt-4 leading-[1.04]">
              {sector.headline}
            </h1>
            <p className="text-[16px] lg:text-[18px] text-ink-muted mt-6 leading-relaxed max-w-xl">{sector.intro}</p>
            <p className="text-[13.5px] mt-5 max-w-xl leading-relaxed border-l-2 border-brand/40 pl-4 text-ink">
              {statSentence(sector.stat)}
            </p>
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <a href="#arac" className="btn-primary inline-flex items-center gap-2">
                <ScanSearch className="w-4 h-4" aria-hidden />
                Sitemi tara
              </a>
              <Link href={sectorContactHref(sector.slug)} className="btn-secondary inline-flex items-center gap-2">
                Yanıt Agency ile konuş <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
            <p className="text-[12px] text-ink-faint font-mono mt-4">hesap yok · e-posta yok · 20 saniye</p>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="card overflow-hidden p-0 bg-paper-3">
              <Image
                src={sector.image}
                alt={sector.imageAlt}
                width={1600}
                height={896}
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function ReasonCards({ sector }: { sector: Sector }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {sector.checks.map((c, i) => {
        const r = REASONS[c.tool] ?? FALLBACK_REASON;
        const tool = toolBySlug(c.tool);
        return (
          <article key={c.tool} className={`card p-6 rise-${i + 1}`}>
            <div className="eyebrow">Neden yoksunuz</div>
            <h3 className="font-display text-[19px] tracking-tight mt-2 leading-tight">{r.reason}</h3>
            <div className="mt-5 pt-4 border-t border-hairline">
              <div className="eyebrow inline-flex items-center gap-1.5">
                <ArrowRight className="w-3 h-3" aria-hidden /> Ne yapmalı
              </div>
              <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{r.action}</p>
              {tool && (
                <Link
                  href={toolPath(tool.slug)}
                  className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep hover:text-brand mt-3 font-medium"
                >
                  {tool.shortTitle} ile ölç <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </Link>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

async function HowToProceed({ sector }: { sector: Sector }) {
  const offer = await getOffer();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <article className="card p-7 flex flex-col rise-1">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-brand" aria-hidden />
          <span className="eyebrow">Siz takip edin</span>
        </div>
        <h3 className="font-display text-[24px] tracking-tight mt-3 leading-tight">Yanıt paneli</h3>
        <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
          Sektörünüzün sorularını her sabah ChatGPT, Gemini ve Claude’da ölçün; rakiplerle karşılaştırın, yapılacakları
          ekibinizle paylaşın.
        </p>
        <ul className="mt-5 space-y-2 text-[14px]">
          {['Günlük ölçüm, tarih damgalı', 'Rakip karşılaştırması', 'Neden analizi ve yapılacaklar'].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-brand mt-0.5 shrink-0" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6 flex items-center justify-between gap-3 flex-wrap">
          <span className="font-display text-[22px] tabular">
            {formatTry(offer.saasMonthlyTry)}
            <span className="text-[13px] text-ink-faint font-normal">/ay</span>
          </span>
          <Link href="/pricing" className="btn-secondary inline-flex items-center gap-2">
            {offer.trialDays} gün dene <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </article>
      <article className="card p-7 flex flex-col bg-paper-2/60 rise-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-brand" aria-hidden />
          <span className="eyebrow">Biz uygulayalım · beta</span>
        </div>
        <h3 className="font-display text-[24px] tracking-tight mt-3 leading-tight">Yanıt Agency</h3>
        <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
          {sector.regulated
            ? 'Bulguları teknik düzeltme, şema ve bilgilendirme içeriği olarak biz uygularız; meslek kurallarınıza uygun, tanıtım iddiasız.'
            : 'Bulguları teknik düzeltme, şema/entity ve içerik olarak biz uygularız; ilerleme aynı panelden izlenir.'}
        </p>
        <ul className="mt-5 space-y-2 text-[14px]">
          {['Aylık sprint, teklifle', 'Aynı panelden ölçüm', 'Kişisel veri yapay zekâya gitmez'].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check className="w-4 h-4 text-brand mt-0.5 shrink-0" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6 flex items-center justify-between gap-3 flex-wrap">
          <span className="font-display text-[22px] tabular">
            {formatTry(offer.agencyFromMonthlyTry)}
            <span className="text-[13px] text-ink-faint font-normal">/ay’dan</span>
          </span>
          <Link href={sectorContactHref(sector.slug)} className="btn-primary inline-flex items-center gap-2">
            Teklif isteyin <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      </article>
    </div>
  );
}

function OtherSectors({ current }: { current: Sector }) {
  const others = SECTORS.filter((s) => s.slug !== current.slug);
  return (
    <nav aria-label="Diğer sektörler" className="flex flex-wrap gap-2">
      {others.map((s) => (
        <Link key={s.slug} href={sectorPath(s.slug)} className="chip hover:border-ink transition">
          {s.name}
        </Link>
      ))}
      <Link href="/sektor" className="chip own">
        Tüm sektörler
      </Link>
    </nav>
  );
}

export function SectorLanding({ sector }: { sector: Sector }) {
  const path = sectorPath(sector.slug);
  const featured = toolBySlug(sector.featuredTool);
  const faqItems = sector.faq.map((f) => ({ question: f.q, answer: f.a }));
  const description = `${sector.headline}: müşterinizin yapay zekâya sorduğu ${sector.showcaseQuestions.length} soru, ${sector.checks.length} sektör kontrolü ve ücretsiz satın alma sorusu kapsama testi.`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Sektörler', href: '/sektor' },
          { name: sector.name, href: path },
        ]}
      />
      <FaqJsonLd items={faqItems} />
      <WebPageJsonLd path={path} name={sector.headline} description={description} image={sector.image} />
      <ServiceJsonLd
        path={path}
        name={`${sector.name} siteleri için yapay zekâ görünürlük ölçümü`}
        description={description}
        serviceType={sector.regulated ? 'Bilgilendirme ve görünürlük ölçümü' : 'Yapay zekâ görünürlük ölçümü'}
        audience={`${sector.name} web siteleri`}
        free
      />

      <SectorHero sector={sector} />

      <Section
        id="sorular"
        eyebrow="Müşteriniz bunu soruyor"
        title={
          <>
            Satın almadan önce <span className="text-brand">asistana</span> sorulan {sector.showcaseQuestions.length} soru
          </>
        }
        intro="Konum, fiyat ve güven işareti aynı cümlede. Cevapta siz mi çıkıyorsunuz, rakibiniz mi — ölçmeden bilinmez."
        className="bg-paper-2/40"
      >
        <SectorQuestionsList sector={sector} id="soru-listesi" />
      </Section>

      <Section
        id="arac"
        eyebrow={featured?.shortTitle ?? 'Ücretsiz araç'}
        title={featured?.question ?? 'Müşterinizin sorduğu sorulara sitenizde cevap var mı?'}
        intro={
          featured
            ? `${featured.description} Sektör ön-seçili; adresinizi yazın, 20 saniyede sonuç alın.`
            : 'Adresinizi yazın, 20 saniyede sonuç alın.'
        }
        containerClassName="max-w-4xl"
      >
        <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
          <SiteTool slug={sector.featuredTool} sectorSelect="required" defaultSector={sector.slug} />
        </Suspense>
        <p className="text-[11.5px] text-ink-faint mt-4">{KVKK_SENTENCE}</p>
      </Section>

      <Section
        id="kontroller"
        eyebrow="Bu sektörde 3 kontrol"
        title="Önce bu üçüne bakın."
        intro={`${sector.name} sitelerinde yapay zekâ görünürlüğünü en çok etkileyen üç teknik kontrol; her biri ayrı ücretsiz araç.`}
        className="bg-paper-2/40"
      >
        <SectorChecks sector={sector} />
      </Section>

      <Section
        id="neden"
        eyebrow="Neden yoksunuz → ne yapmalı"
        title="Görünmemenin üç tipik nedeni."
        intro="Her neden için tek bir düzeltme adımı ve ölçen araç. Skorun altında ne kadar kontrol yapıldığını ve tarihi görürsünüz; hazırlık ölçülür, yapay zekânın davranışı değil."
      >
        <ReasonCards sector={sector} />
      </Section>

      <Section
        id="nasil"
        eyebrow="Nasıl ilerlersiniz"
        title="İki yol: siz takip edin ya da biz uygulayalım."
        intro={`Ölçüm her iki yolda aynı panelden. Fiyatlar aylık; deneme ${OFFER.trialDays} gün, kart gerekmez.`}
        className="bg-paper-2/40"
      >
        <HowToProceed sector={sector} />
      </Section>

      <Section id="sss" eyebrow="Sık sorulan sorular" title={`${sector.name} için sık sorulanlar`} containerClassName="max-w-4xl">
        <Faq items={faqItems} />
        <div className="mt-10">
          <div className="eyebrow mb-3">Diğer sektörler</div>
          <OtherSectors current={sector} />
        </div>
      </Section>

      <CtaBlock
        eyebrow={`${sector.name} · ücretsiz test`}
        title={
          <>
            Önce ölçün, <span className="text-brand">sonra karar verin.</span>
          </>
        }
        body="Sektör ön-seçili testi çalıştırın; rapor bağlantısı kalıcıdır, ekibinizle paylaşın. Düzeltmeleri siz yapın ya da Yanıt Agency ile konuşun."
        primaryHref="#arac"
        primaryLabel="Sitemi tara"
        secondaryHref={sectorContactHref(sector.slug)}
        secondaryLabel="Yanıt Agency ile konuş"
      />
    </>
  );
}
