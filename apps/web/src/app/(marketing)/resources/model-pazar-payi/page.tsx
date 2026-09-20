import Link from 'next/link';
import { ArrowUpRight, Database, RefreshCw, TerminalSquare, TriangleAlert } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { RankingsTable } from '@/components/marketing/rankings-table';
import { BreadcrumbJsonLd, FaqJsonLd, JsonLd } from '@/components/json-ld';
import { buildMetadata, SITE_URL } from '@/lib/seo';
import {
  latestRankings,
  MODELS_VIEW,
  OPENROUTER_RANKINGS_URL,
  type AppUsage,
  type AuthorShare,
} from '@/server/openrouter-rankings';

/**
 * Model kullanım sıralaması — OpenRouter verisiyle, günlük cron'un tazelediği anlık görüntüden.
 *
 * DÜRÜSTLÜK NOTU (sayfanın omurgası): OpenRouter bir API yönlendiricisidir. Buradaki paylar
 * GELİŞTİRİCİ trafiğini ölçer, tüketicinin ChatGPT/Gemini/Claude uygulamasında ne sorduğunu DEĞİL.
 * Sayfa bu farkı üstte, büyük harflerle değil ama net biçimde söyler; aksi hâlde okur bunu
 * "müşterim hangi asistanı kullanıyor" sanır ve yanlış karar verir.
 *
 * TEKNİK OKUR: Sayfadaki her sayının formülü yazılıdır ve ham veri aynı sayfadan JSON olarak
 * indirilebilir (API_PATH). "Teknik görünmek" için değil, iddiayı doğrulatabilmek için.
 */

const PATH = '/resources/model-pazar-payi';
const API_PATH = '/api/public/model-rankings';

export const metadata = buildMetadata({
  title: 'Model pazar payı — hangi model ne kadar çalışıyor?',
  description:
    'OpenRouter üzerinden akan token trafiğine göre model ve sağlayıcı payları: token, istek, istek başına token, istem/cevap oranı. Günlük güncellenir, ham verisi açık JSON ucundan indirilebilir. Geliştirici trafiğini ölçer, tüketici asistan kullanımını değil.',
  path: PATH,
});

/** Sayfa cron'un yazdığı kaydı okur; her istekte kazıma yapmaz. */
export const revalidate = 3600;

const TR = (n: number) => n.toLocaleString('tr-TR');
/** Yüzdeler hep iki ondalıkla: sütun sağa hizalı kalsın, %1,5 ile %1,50 karışmasın. */
const PCT = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** "2026-09-19" → "19 Eylül 2026". Kaynak tarihi ISO gelir, okur Türkçe görür. */
function trTarih(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const ay = AYLAR[Number(m[2]) - 1];
  return ay ? `${Number(m[3])} ${ay} ${m[1]}` : iso;
}

/** Pencerenin başlangıcı: bitiş günü DAHİL geriye doğru `days` gün. */
function pencereBaslangici(endIso: string, days: number): string {
  const t = Date.parse(`${endIso}T00:00:00Z`);
  if (!Number.isFinite(t) || days < 1) return endIso;
  return new Date(t - (days - 1) * 86_400_000).toISOString().slice(0, 10);
}

/** Ölçüm anı — saat dahil, Türkiye saatiyle. */
function trAnTam(d: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Istanbul',
  }).format(d);
}

/** Trilyon token gibi büyük sayıları okunur kısaltır. */
function kisaToken(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} trilyon`;
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} milyar`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} milyon`;
  return TR(n);
}

/** Künye kutusu — tek bir ölçüm gerçeği, üstte etiketi, altında kaynağı. */
function Kunye({ etiket, deger, alt }: { etiket: string; deger: string; alt?: string }) {
  return (
    <div className="card p-5">
      <div className="eyebrow">{etiket}</div>
      <div className="font-display text-[20px] lg:text-[22px] mt-1.5 leading-tight tabular">{deger}</div>
      {alt && <div className="text-[12.5px] text-ink-faint mt-1.5 leading-snug">{alt}</div>}
    </div>
  );
}

/**
 * Sağlayıcı satırı — İKİ çubuk: üstte token payı, altta istek payı.
 * İkisi ayrı bilgidir: token payı hacmi, istek payı çağrı sayısını gösterir. Aradaki fark
 * o sağlayıcının modellerinin ne kadar uzun bağlamla çalıştığını söyler.
 */
function AuthorBar({ a, maxTokens, maxRequests }: { a: AuthorShare; maxTokens: number; maxRequests: number }) {
  const wTok = Math.max(2, Math.round((a.tokens / maxTokens) * 100));
  const wReq = a.requests !== undefined && maxRequests > 0 ? Math.max(2, Math.round((a.requests / maxRequests) * 100)) : null;
  return (
    <li className="grid grid-cols-[minmax(0,9rem)_1fr] sm:grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-x-4 gap-y-2 py-3 border-b border-hairline last:border-0">
      <span className="text-[14px] text-ink truncate font-mono">{a.author}</span>
      <span className="flex flex-col gap-1.5 min-w-0" aria-hidden>
        <span className="h-2 rounded-full bg-paper-4/60 overflow-hidden">
          <span className="block h-full rounded-full bg-brand" style={{ width: `${wTok}%` }} />
        </span>
        <span className="h-2 rounded-full bg-paper-4/60 overflow-hidden">
          <span className="block h-full rounded-full bg-ink-faint/50" style={{ width: `${wReq ?? 2}%` }} />
        </span>
      </span>
      <span className="col-span-2 sm:col-span-1 text-[13px] tabular whitespace-nowrap flex sm:block gap-4">
        <span className="text-ink">%{PCT(a.sharePct)} token</span>
        <span className="text-ink-muted sm:block">
          {a.requestSharePct === undefined ? '— istek' : `%${PCT(a.requestSharePct)} istek`}
        </span>
      </span>
    </li>
  );
}

/** Uygulama satırı — trafiği üreten yazılım türü. Dış bağlantı vermiyoruz, host düz metin. */
function AppRow({ app, i }: { app: AppUsage; i: number }) {
  return (
    <tr className="border-b border-hairline last:border-0">
      <td className="px-4 py-3 text-[13px] text-ink-faint tabular">{i + 1}</td>
      <td className="px-4 py-3">
        <div className="text-[14px] text-ink">{app.title}</div>
        {app.host && <div className="text-[12px] text-ink-faint font-mono mt-0.5">{app.host}</div>}
      </td>
      <td className="px-4 py-3">
        <span className="flex flex-wrap gap-1.5">
          {app.categories.length === 0 ? (
            <span className="text-ink-faint text-[13px]">—</span>
          ) : (
            app.categories.map((c) => (
              <span key={c} className="chip text-[11.5px]">
                {c}
              </span>
            ))
          )}
        </span>
      </td>
      <td className="px-4 py-3 text-[13.5px] text-ink-muted text-right tabular whitespace-nowrap" title={`${TR(app.tokens)} token`}>
        {kisaToken(app.tokens)}
      </td>
      <td className="px-4 py-3 text-[13.5px] text-ink-muted text-right tabular whitespace-nowrap">
        {app.requests === undefined ? '—' : TR(app.requests)}
      </td>
      <td className="px-4 py-3 text-[13.5px] text-ink text-right tabular whitespace-nowrap">
        {app.tokensPerRequest === undefined ? '—' : TR(app.tokensPerRequest)}
      </td>
    </tr>
  );
}

const FAQ = [
  {
    question: 'Bu tablo müşterimin hangi asistanı kullandığını gösterir mi?',
    answer:
      'Hayır. Bu veri OpenRouter adlı API yönlendiricisinden geçen geliştirici trafiğini ölçer. ChatGPT, Gemini ve Claude’un kendi uygulamaları bu yönlendiriciden geçmez, dolayısıyla burada görünmez. Tablo “yazılımların içinde hangi model çalışıyor” sorusunun cevabıdır; “insanlar hangi asistana soruyor” sorusunun değil.',
  },
  {
    question: 'Veri ne sıklıkla güncelleniyor?',
    answer:
      'Günlük ölçüm turumuzun sonunda otomatik olarak yeniden okunuyor. Sayfada verinin penceresi ve ölçümün alındığı an yazar. Kaynak sayfa erişilemezse eski kayıt yerinde kalır ve tarih eskir; bunu gizlemeyiz, tarih olduğu gibi görünür.',
  },
  {
    question: 'Paylar neye göre hesaplanıyor?',
    answer:
      'OpenRouter’ın yayımladığı token toplamları kullanılır: her model için istem ve cevap token’ları toplanır, listedeki tüm modellerin toplamına bölünür. Payda listenin toplamıdır, platformun tamamı değil. Bu bir istek sayısı değil token hacmidir; uzun bağlamlı modeller aynı istek sayısıyla daha yüksek pay alabilir. Tabloda istek payı ayrı bir sütun olarak durur, iki sayıyı karşılaştırabilirsiniz.',
  },
  {
    question: 'İstek başına token neden önemli?',
    answer:
      'Çünkü “hangi model önde” sorusunun cevabını tek başına token hacmi çarpıtır. İstek başına 100 bin token yakan bir model, kod tabanı okuyan ya da uzun belge işleyen bir iş yükünde çalışıyordur; 10 bin token yakan bir model kısa, seri çağrılarla çalışıyordur. Aynı token hacmi birinde on kat daha az çağrı demektir. Kendi ürününüzde maliyet ve gecikme tahmini yapacaksanız bakmanız gereken sayı budur, toplam hacim değil.',
  },
  {
    question: '“7 günlük değişim” sütunundaki sayıyı siz mi hesaplıyorsunuz?',
    answer:
      'Hayır, kaynağın kendi alanı. OpenRouter aynı sayfada şöyle tanımlıyor: son yedi gün, ondan önceki yedi günle karşılaştırılır ve modeller token’daki yüzde değişime göre sıralanır; küçük bir tabanın büyük yüzde üretmemesi için pencerede en az bir milyon token’ı olmayan modeller listeye alınmaz. Biz bu oranı olduğu gibi gösteriyoruz, yeniden hesaplamıyoruz.',
  },
  {
    question: 'Akıl yürütme ve önbellek sütunları neden sıfır görünüyor?',
    answer:
      'Çünkü kaynak bu pencerede o alanları sıfır bildiriyor. Sıfırı gizlemiyoruz; alan hiç gelmediğinde “—”, sıfır geldiğinde “%0,00” yazıyoruz. İkisi farklı şeydir: biri “veri yok”, diğeri “veri var ve sıfır”. Alanlar dolmaya başlarsa tablo kendiliğinden dolu görünecek.',
  },
  {
    question: 'Ham veriye ulaşabilir miyim?',
    answer:
      'Evet. Sayfadaki her sayı tek bir JSON ucundan gelir: GET /api/public/model-rankings. Kimlik istemez, sayfadaki tabloyla aynı kaydı döndürür ve her türetilmiş alanın formülünü yanıtın içinde “fields” anahtarında yazar. IP başına dakikada 60 istek sınırı vardır; kayıt henüz alınmadıysa 404 ile standart hata gövdesi döner.',
  },
  {
    question: 'Neden açık ağırlıklı modeller listenin başında?',
    answer:
      'Yönlendirici üzerinden maliyet duyarlı iş yükleri akar; ucuz ve açık ağırlıklı modeller burada doğal olarak öne çıkar. Aynı dönemde tüketici tarafında sıralama tamamen farklı olabilir. İki ölçümü birbirinin yerine koymayın.',
  },
  {
    question: 'Yanıt bu veriyi ne için kullanıyor?',
    answer:
      'Ölçüm setimizi hangi modellerle çalıştıracağımıza karar verirken ve model tarafındaki kaymaları erken görmek için. Sizin görünürlüğünüz bu tablodan hesaplanmaz; o ölçüm ayrıca, asistanlara gerçek sorular sorularak yapılır.',
  },
];

export default async function ModelPazarPayiPage() {
  const snap = await latestRankings();
  const pencereEtiketi = snap
    ? `${trTarih(pencereBaslangici(snap.dataDate, snap.windowDays))} – ${trTarih(snap.dataDate)}`
    : '';
  const curl = `curl -s ${SITE_URL}${API_PATH} | jq '.models[0]'`;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Kaynaklar', href: '/resources' },
          { name: 'Model pazar payı', href: PATH },
        ]}
      />
      <FaqJsonLd items={FAQ.map((f) => ({ question: f.question, answer: f.answer }))} />
      {snap && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: 'OpenRouter model kullanım payları (Yanıt derlemesi)',
            description:
              'OpenRouter API yönlendiricisi üzerinden geçen token ve istek hacminin model ve sağlayıcı dağılımı. Yedi günlük pencere, günlük tazelenir.',
            url: `${SITE_URL}${PATH}`,
            isAccessibleForFree: true,
            creator: { '@type': 'Organization', name: 'Yanıt' },
            temporalCoverage: `${pencereBaslangici(snap.dataDate, snap.windowDays)}/${snap.dataDate}`,
            dateModified: snap.fetchedAt.toISOString(),
            isBasedOn: OPENROUTER_RANKINGS_URL,
            variableMeasured: ['token hacmi', 'istek sayısı', 'istek başına token', 'istem/cevap oranı'],
            distribution: [
              {
                '@type': 'DataDownload',
                encodingFormat: 'application/json',
                contentUrl: `${SITE_URL}${API_PATH}`,
              },
            ],
          }}
        />
      )}

      <section className="pt-20 pb-12">
        <Container>
          <div className="max-w-3xl">
            <div className="eyebrow">Kaynaklar · rutin ölçüm</div>
            <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-3 leading-[1.05]">
              Hangi model, ne kadar <span className="text-brand">çalışıyor?</span>
            </h1>
            <p className="text-[17px] lg:text-[18px] text-ink-muted mt-6 leading-relaxed">
              Kısa cevap: aşağıdaki tablo, OpenRouter adlı API yönlendiricisinden geçen token ve istek trafiğinin model
              ve sağlayıcı dağılımını gösterir. Her gün yeniden okunur, formülleri yazılıdır, ham verisi{' '}
              <a href={API_PATH} className="text-brand-deep hover:text-brand underline">
                tek bir JSON ucundan
              </a>{' '}
              indirilebilir.
            </p>
          </div>

          {/* Yanlış okumayı baştan kesen uyarı — sayfanın en önemli cümlesi burada. */}
          <div className="card mt-8 p-6 max-w-3xl flex gap-4">
            <TriangleAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" aria-hidden />
            <div>
              <h2 className="font-display text-[18px] leading-snug">Bu tablo neyi ölçmez?</h2>
              <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">
                Müşterinizin ChatGPT, Gemini ya da Claude uygulamasına ne sorduğunu ölçmez. O uygulamalar bu
                yönlendiriciden geçmez. Burada gördüğünüz, geliştiricilerin kendi yazılımlarının içinde hangi modeli
                çalıştırdığıdır. İki ölçümü birbirinin yerine koymak yanlış karar üretir.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {!snap ? (
        <Section className="band border-t border-hairline">
          <div className="card p-8 max-w-2xl">
            <div className="eyebrow">Veri yok</div>
            <p className="text-[15px] text-ink-muted mt-3 leading-relaxed">
              Bu ölçüm günlük tura bağlı çalışıyor ve henüz ilk anlık görüntü alınmadı. Tur tamamlandığında tablo
              burada görünecek. Kaynağı şimdi görmek isterseniz{' '}
              <a
                href={OPENROUTER_RANKINGS_URL}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-brand-deep hover:text-brand underline"
              >
                OpenRouter sıralamasına
              </a>{' '}
              bakabilirsiniz.
            </p>
          </div>
        </Section>
      ) : (
        <>
          {/* Ölçüm künyesi — teknik okurun ilk sorduğu altı şey. */}
          <section className="pb-4">
            <Container>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Kunye
                  etiket="Ölçüm penceresi"
                  deger={`${snap.windowDays} gün`}
                  alt={`${pencereEtiketi} (bitiş günü dahil)`}
                />
                <Kunye
                  etiket="Ölçümün alındığı an"
                  deger={trAnTam(snap.fetchedAt)}
                  alt={snap.ageDays === 0 ? 'Bugün okundu' : `${snap.ageDays} gün önce okundu`}
                />
                <Kunye
                  etiket="Listedeki model"
                  deger={TR(snap.models.length)}
                  alt={`${TR(snap.authors.length)} farklı sağlayıcı`}
                />
                <Kunye
                  etiket="Toplam token"
                  deger={kisaToken(snap.totalTokens)}
                  alt={`${TR(snap.totalTokens)} (istem + cevap)`}
                />
                <Kunye
                  etiket="Toplam istek"
                  deger={snap.totalRequests === undefined ? 'veri yok' : kisaToken(snap.totalRequests)}
                  alt={snap.totalRequests === undefined ? 'Bu kayıt istek sayısı içermiyor' : `${TR(snap.totalRequests)} çağrı`}
                />
                <Kunye
                  etiket="İstem / cevap dengesi"
                  deger={
                    snap.totalPromptTokens && snap.totalCompletionTokens
                      ? `${PCT(snap.totalPromptTokens / snap.totalCompletionTokens)} : 1`
                      : 'veri yok'
                  }
                  alt={
                    snap.totalPromptTokens && snap.totalCompletionTokens
                      ? `${kisaToken(snap.totalPromptTokens)} istem · ${kisaToken(snap.totalCompletionTokens)} cevap`
                      : 'Bu kayıt istem/cevap ayrımı içermiyor'
                  }
                />
              </div>
              {snap.ageDays >= 3 && (
                <p className="text-[13px] text-warning mt-4 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                  Bu ölçüm {snap.ageDays} gün önce alındı; kaynak sayfa o tarihten beri tazelenemedi.
                </p>
              )}
            </Container>
          </section>

          {/* Ham veri ucu — teknik okur tabloyu değil, kaydı görmek ister. */}
          <section className="py-6">
            <Container>
              <div className="card p-6 lg:p-7">
                <div className="flex items-start gap-3">
                  <TerminalSquare className="w-5 h-5 text-brand shrink-0 mt-0.5" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[18px]">Ham veri</h2>
                    <p className="text-[14px] text-ink-muted mt-2 leading-relaxed">
                      Sayfadaki her sayı tek bir salt-okunur uçtan gelir. Kimlik gerekmez, IP başına dakikada 60 istek
                      sınırı vardır ve kalan hak <code className="font-mono">X-RateLimit-Remaining</code> başlığında döner.
                      Yanıt önbelleklenmez; kayıt zaten günde bir tazelenir. Türetilmiş alanların formülü yanıtın{' '}
                      <code className="font-mono">fields</code> anahtarında yazılıdır.
                    </p>
                    <div className="mt-4 overflow-x-auto">
                      <pre className="text-[12.5px] font-mono text-ink bg-paper-3 border border-hairline rounded-lg px-4 py-3 w-max min-w-full">
                        <code>{curl}</code>
                      </pre>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <a
                        href={API_PATH}
                        className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand"
                      >
                        <span className="font-mono">GET {API_PATH}</span>
                        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
                      </a>
                      <span className="text-[12.5px] text-ink-faint">
                        Kayıt yoksa 404 + {'{ message, code, requestId }'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Container>
          </section>

          {/* Sağlayıcı payı — token payı İLE istek payı birlikte. */}
          <Section
            eyebrow="Sağlayıcıya göre"
            title="Token hacmi ve istek sayısı aynı şeyi söylemez."
            intro={`${pencereEtiketi} penceresinde, listedeki ${snap.models.length} modelin toplamı üzerinden hesaplandı. Üstteki mor çubuk token payı, alttaki gri çubuk istek payıdır; ikisi ayrıştığında o sağlayıcının modelleri farklı uzunlukta bağlamla çalışıyor demektir.`}
          >
            <ul className="card p-6 lg:p-8">
              {snap.authors.map((a) => (
                <AuthorBar
                  key={a.author}
                  a={a}
                  maxTokens={snap.authors[0]?.tokens ?? 1}
                  maxRequests={Math.max(1, ...snap.authors.map((x) => x.requests ?? 0))}
                />
              ))}
            </ul>
          </Section>

          {/* Model tablosu — istemcide sıralanabilir. */}
          <Section
            className="band border-t border-hairline"
            eyebrow="Modele göre"
            title="Modellerin ölçülen tüm metrikleri."
            intro="Varsayılan sıra token hacmine göredir. İstek sayısına, istek başına token'a ya da istem/cevap oranına göre sıralamak için sütun başlığına tıklayın — sıralama değiştikçe listenin anlamı da değişir."
          >
            <RankingsTable models={snap.models} windowLabel={pencereEtiketi} />
          </Section>

          {/* Trafiği üreten yazılımlar. */}
          {snap.apps && snap.apps.items.length > 0 && (
            <Section
              eyebrow="Bu trafiği ne üretiyor?"
              title="Token'ı gönderen yazılımlar."
              intro={`Kaynağın ${snap.apps.windowDays} günlük uygulama sıralaması. Bu liste model tablosundan bağımsızdır: buradaki token'lar tüm modellere dağılır. Sıra numaraları kaynağın kendi sırasıdır ve boşluklu gelir — herkese açık olmayan uygulamalar listede yer almaz.`}
            >
              <div className="card overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[720px]">
                  <caption className="sr-only">
                    OpenRouter üzerinden en çok token gönderen uygulamalar, {snap.apps.windowDays} günlük pencere
                  </caption>
                  <thead>
                    <tr className="border-b border-hairline">
                      <th scope="col" className="eyebrow px-4 py-3.5 w-12">#</th>
                      <th scope="col" className="eyebrow px-4 py-3.5">Uygulama</th>
                      <th scope="col" className="eyebrow px-4 py-3.5">Kategori</th>
                      <th scope="col" className="eyebrow px-4 py-3.5 text-right">Token</th>
                      <th scope="col" className="eyebrow px-4 py-3.5 text-right">İstek</th>
                      <th scope="col" className="eyebrow px-4 py-3.5 text-right">Token/istek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snap.apps.items.map((app, i) => (
                      <AppRow key={`${app.appId ?? app.slug ?? app.title}-${i}`} app={app} i={i} />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[13px] text-ink-faint mt-4 leading-relaxed max-w-3xl">
                Kategoriler kaynağın kendi etiketleridir. Listenin üst sıralarında kod asistanları ve ajan çerçeveleri
                varsa, bu yönlendiricideki token hacminin sohbetten değil otomasyondan geldiği anlamına gelir; sizin
                içeriğinizi okuyan tarayıcılar da o yazılımların içinde çalışır.
              </p>
            </Section>
          )}
        </>
      )}

      {/* Yöntem — formüller açıkça yazılı. */}
      <Section className={snap?.apps ? 'band border-t border-hairline' : ''} eyebrow="Yöntem" title="Bu veriyi nasıl alıyoruz, neyi hesaplıyoruz?">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Kaynak ve pencere</h3>
            </div>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              Veri{' '}
              <a
                href={OPENROUTER_RANKINGS_URL}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-brand-deep hover:text-brand underline inline-flex items-center gap-1"
              >
                OpenRouter sıralama sayfasından
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
              </a>{' '}
              okunur. Sayfanın React Query durumundaki{' '}
              <code className="font-mono text-[13px]">[&quot;rankings&quot;,&quot;models&quot;,{'{'}&quot;view&quot;:&quot;{MODELS_VIEW}&quot;{'}'}]</code>{' '}
              ve <code className="font-mono text-[13px]">[&quot;rankings&quot;,&quot;apps&quot;]</code> sorgularının verisi
              alınır; tarayıcı çalıştırılmaz. Kaynağın kendi tanımıyla bu görünüm, en son tamamlanmış günlük kovayla
              biten yedi günlük bir penceredir — yani satırdaki tarih tek bir günün değil, pencerenin bitiş günüdür.
            </p>
          </div>
          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Tazeleme ve hata hâli</h3>
            </div>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              Günlük ölçüm turumuzun sonunda otomatik olarak yeniden okunur ve kaydedilir. Bu bir sözleşmeli API değil,
              sayfa ayrıştırmasıdır: kaynak yapısını değiştirirse okuma sessizce boşa düşmez, hata fırlatır. O durumda
              önceki kayıt korunur, sayfadaki ölçüm anı eskimeye başlar ve üç günü geçerse künyenin altında uyarı
              çıkar. Uygulama listesi isteğe bağlıdır: yalnız o bölüm okunamazsa model tablosu etkilenmez.
            </p>
          </div>
        </div>

        <div className="card p-7 mt-5">
          <h3 className="font-display text-[18px]">Formüller</h3>
          <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
            Toplama giren alanlar kaynağın kendi alan adlarıyla yazıldı. Payda her zaman <em>listenin</em> toplamıdır,
            platformun tamamı değil.
          </p>
          <div className="mt-4 overflow-x-auto">
            <pre className="text-[12.5px] leading-[1.9] font-mono text-ink bg-paper-3 border border-hairline rounded-lg px-4 py-4 w-max min-w-full">
              <code>{`token            = total_prompt_tokens + total_completion_tokens
token payı       = token ÷ Σ(liste) token × 100
istek            = count
istek payı       = istek ÷ Σ(liste) istek × 100
token/istek      = token ÷ istek
istem : cevap    = total_prompt_tokens ÷ total_completion_tokens
akıl yürütme %   = total_native_tokens_reasoning ÷ total_completion_tokens × 100
önbellek %       = total_native_tokens_cached ÷ total_prompt_tokens × 100
7 günlük değişim = kaynağın change alanı (biz hesaplamıyoruz)`}</code>
            </pre>
          </div>
          <ul className="mt-5 space-y-3">
            {[
              'Payda sıfırsa bölme yapılmaz: sonuç “—” olur. Sıfır ile “veri yok” sayfada hiçbir yerde aynı görünmez.',
              'Araç çağrısı hata oranı HESAPLANMIYOR. Kaynak “araç çağrısı sayısı” ile “hata dönen istek sayısı” veriyor; bu ikisinin oranı anlamlı bir hata oranı değil ve doğru payda (araç çağrısı yapan istek sayısı) kaynakta yok. Ham sayılar JSON ucunda durur, sayfada türetilmiş oran gösterilmez.',
              'Aynı model birden çok variant ile geldiyse token ve istek toplanır, variant sütununda ikisi birden yazılır; o satırda “7 günlük değişim” gösterilmez çünkü hangi variant’a ait olduğu belirsizdir.',
              'Kaynağın döndürdüğü liste 7 günlük değişime göre azalan sırada gelir. Bu listeye hangi modellerin girdiğini kaynak seçer; sayfadaki hiçbir sayı o seçime dair bir varsayıma dayanmaz, her oran yalnızca listenin içindeki toplamdan çıkar.',
              'Sayılar Türkçe biçimlenir (binlik nokta, ondalık virgül). Ham JSON’da ise ondalık nokta ile, işlenmemiş hâlde durur.',
            ].map((x) => (
              <li key={x} className="text-[14px] text-ink-muted leading-relaxed flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-7 mt-5">
          <h3 className="font-display text-[18px]">Bunun sizin için anlamı ne?</h3>
          <ul className="mt-4 space-y-3">
            {[
              'Model tarafı hızlı değişiyor. Bugün trafiğin başında olan model üç ay sonra listede olmayabilir; tek bir modele göre yazılmış içerik bu yüzden kırılgandır.',
              'Sizin görünürlüğünüz bu tablodan çıkmaz. Görünürlük, asistanlara gerçek sorular sorularak ölçülür; bu sayfa yalnızca model tarafındaki hareketi gösterir.',
              'Bot erişimini tek bir sağlayıcıya göre açmayın. Sıralama değiştikçe hangi tarayıcının sitenizi okuduğu da değişir.',
              'İstek başına token yüksekse orada uzun bağlam vardır: o iş yükü sitenizin tamamını okuyan bir ajan olabilir. Sunucu tarafı hız sınırlarınızı bu ihtimale göre ayarlayın.',
            ].map((x) => (
              <li key={x} className="text-[14.5px] text-ink-muted leading-relaxed flex gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0 mt-2" aria-hidden />
                {x}
              </li>
            ))}
          </ul>
          <Link
            href="/arac"
            className="inline-flex items-center gap-1.5 text-[13.5px] text-brand-deep hover:text-brand mt-6"
          >
            Kendi sitenizi ücretsiz ölçün
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </Section>

      <Section className={snap?.apps ? '' : 'band border-t border-hairline'} eyebrow="Sıkça sorulanlar" title="Bu veriye dair sorular.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock />
    </>
  );
}
