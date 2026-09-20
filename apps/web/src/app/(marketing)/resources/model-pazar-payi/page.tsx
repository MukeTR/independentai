import Link from 'next/link';
import { ArrowUpRight, Database, RefreshCw, TriangleAlert } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { Faq } from '@/components/marketing/faq';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { latestRankings, OPENROUTER_RANKINGS_URL, type AuthorShare } from '@/server/openrouter-rankings';

/**
 * Model kullanım sıralaması — OpenRouter verisiyle, günlük cron'un tazelediği anlık görüntüden.
 *
 * DÜRÜSTLÜK NOTU (sayfanın omurgası): OpenRouter bir API yönlendiricisidir. Buradaki paylar
 * GELİŞTİRİCİ trafiğini ölçer, tüketicinin ChatGPT/Gemini/Claude uygulamasında ne sorduğunu DEĞİL.
 * Sayfa bu farkı üstte, büyük harflerle değil ama net biçimde söyler; aksi hâlde okur bunu
 * "müşterim hangi asistanı kullanıyor" sanır ve yanlış karar verir.
 */

const PATH = '/resources/model-pazar-payi';

export const metadata = buildMetadata({
  title: 'Model pazar payı — hangi model ne kadar çalışıyor?',
  description:
    'OpenRouter üzerinden akan token trafiğine göre model ve sağlayıcı payları. Günlük güncellenir, kaynağı açıktır. Geliştirici trafiğini ölçer, tüketici asistan kullanımını değil.',
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

/** Trilyon token gibi büyük sayıları okunur kısaltır. */
function kisaToken(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} trilyon`;
  if (n >= 1e9) return `${(n / 1e9).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} milyar`;
  if (n >= 1e6) return `${(n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} milyon`;
  return TR(n);
}

function AuthorBar({ a, max }: { a: AuthorShare; max: number }) {
  const w = Math.max(2, Math.round((a.tokens / max) * 100));
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-4 py-2.5 border-b border-hairline last:border-0">
      <span className="text-[14.5px] text-ink truncate font-mono">{a.author}</span>
      <span className="h-2 rounded-full bg-paper-4/60 overflow-hidden" aria-hidden>
        <span className="block h-full rounded-full bg-brand" style={{ width: `${w}%` }} />
      </span>
      <span className="text-[14px] tabular text-ink-muted whitespace-nowrap">%{PCT(a.sharePct)}</span>
    </li>
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
      'Günlük ölçüm turumuzun sonunda otomatik olarak yeniden okunuyor. Sayfada verinin ait olduğu gün ve ölçümün alındığı an yazar. Kaynak sayfa erişilemezse eski kayıt yerinde kalır ve tarih eskir; bunu gizlemeyiz, tarih olduğu gibi görünür.',
  },
  {
    question: 'Paylar neye göre hesaplanıyor?',
    answer:
      'OpenRouter’ın yayımladığı günlük token toplamları kullanılır: her model için istem ve cevap token’ları toplanır, listedeki tüm modellerin toplamına bölünür. Bu bir istek sayısı değil token hacmidir; uzun bağlamlı modeller aynı istek sayısıyla daha yüksek pay alabilir.',
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

      <section className="pt-20 pb-12">
        <Container>
          <div className="max-w-3xl">
            <div className="eyebrow">Kaynaklar · rutin ölçüm</div>
            <h1 className="font-display text-[38px] lg:text-[52px] tracking-tight mt-3 leading-[1.05]">
              Hangi model, ne kadar <span className="text-brand">çalışıyor?</span>
            </h1>
            <p className="text-[17px] lg:text-[18px] text-ink-muted mt-6 leading-relaxed">
              Kısa cevap: aşağıdaki tablo, OpenRouter adlı API yönlendiricisinden geçen token trafiğinin model ve
              sağlayıcı dağılımını gösterir. Her gün yeniden okunur, kaynağı açıktır.
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
          {/* Ölçüm künyesi */}
          <section className="pb-4">
            <Container>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
                <div className="card p-5">
                  <div className="eyebrow">Verinin günü</div>
                  <div className="font-display text-[22px] mt-1.5">{trTarih(snap.dataDate)}</div>
                </div>
                <div className="card p-5">
                  <div className="eyebrow">Listedeki model</div>
                  <div className="font-display text-[22px] mt-1.5 tabular">{snap.models.length}</div>
                </div>
                <div className="card p-5">
                  <div className="eyebrow">Toplam token</div>
                  <div className="font-display text-[22px] mt-1.5">{kisaToken(snap.totalTokens)}</div>
                </div>
              </div>
              {snap.ageDays >= 3 && (
                <p className="text-[13px] text-warning mt-4 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5" aria-hidden />
                  Bu ölçüm {snap.ageDays} gün önce alındı; kaynak sayfa o tarihten beri tazelenemedi.
                </p>
              )}
            </Container>
          </section>

          {/* Sağlayıcı payı */}
          <Section
            eyebrow="Sağlayıcıya göre"
            title="Token hacminin sağlayıcılara dağılımı."
            intro={`${trTarih(snap.dataDate)} günü, listedeki ${snap.models.length} modelin toplam token hacmi üzerinden hesaplandı.`}
          >
            <ul className="card p-6 lg:p-8 max-w-3xl">
              {snap.authors.map((a) => (
                <AuthorBar key={a.author} a={a} max={snap.authors[0]?.tokens ?? 1} />
              ))}
            </ul>
          </Section>

          {/* Model tablosu */}
          <Section
            className="band border-t border-hairline"
            eyebrow="Modele göre"
            title="En çok token işleyen modeller."
            intro="Sıralama token hacmine göredir, istek sayısına göre değil. Uzun bağlamlı modeller aynı istek sayısıyla daha yüksek pay alabilir."
          >
            <div className="card overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[560px]">
                <caption className="sr-only">
                  {trTarih(snap.dataDate)} günü OpenRouter üzerinden en çok token işleyen modeller
                </caption>
                <thead>
                  <tr className="border-b border-hairline">
                    <th scope="col" className="eyebrow px-5 py-4 w-12">
                      #
                    </th>
                    <th scope="col" className="eyebrow px-5 py-4">
                      Model
                    </th>
                    <th scope="col" className="eyebrow px-5 py-4">
                      Sağlayıcı
                    </th>
                    <th scope="col" className="eyebrow px-5 py-4 text-right">
                      Token
                    </th>
                    <th scope="col" className="eyebrow px-5 py-4 text-right">
                      Pay
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {snap.models.map((m, i) => (
                    <tr key={m.slug} className="border-b border-hairline last:border-0">
                      <td className="px-5 py-3.5 text-[13px] text-ink-faint tabular">{i + 1}</td>
                      <td className="px-5 py-3.5 text-[14px] text-ink font-mono">{m.model}</td>
                      <td className="px-5 py-3.5 text-[14px] text-ink-muted font-mono">{m.author}</td>
                      <td className="px-5 py-3.5 text-[14px] text-ink-muted text-right whitespace-nowrap">
                        {kisaToken(m.tokens)}
                      </td>
                      <td className="px-5 py-3.5 text-[14px] text-ink text-right tabular whitespace-nowrap">
                        %{PCT(m.sharePct)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* Yöntem ve kaynak */}
      <Section eyebrow="Yöntem" title="Bu veriyi nasıl alıyoruz?">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Kaynak</h3>
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
              okunur. Sayfanın kendi yayımladığı günlük toplamlar kullanılır; sayıları biz üretmiyoruz, yalnızca
              derleyip Türkçe biçimde gösteriyoruz.
            </p>
          </div>
          <div className="card p-7">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center shrink-0">
                <RefreshCw className="w-4 h-4 text-brand" aria-hidden />
              </span>
              <h3 className="font-display text-[18px]">Tazeleme</h3>
            </div>
            <p className="text-[14.5px] text-ink-muted mt-4 leading-relaxed">
              Günlük ölçüm turumuzun sonunda otomatik olarak yeniden okunur ve kaydedilir. Okuma başarısız olursa
              önceki kayıt korunur; sayfadaki tarih eskimeye başlar ve üç günü geçerse uyarı çıkar.
            </p>
          </div>
        </div>

        <div className="card p-7 mt-5">
          <h3 className="font-display text-[18px]">Bunun sizin için anlamı ne?</h3>
          <ul className="mt-4 space-y-3">
            {[
              'Model tarafı hızlı değişiyor. Bugün trafiğin başında olan model üç ay sonra listede olmayabilir; tek bir modele göre yazılmış içerik bu yüzden kırılgandır.',
              'Sizin görünürlüğünüz bu tablodan çıkmaz. Görünürlük, asistanlara gerçek sorular sorularak ölçülür; bu sayfa yalnızca model tarafındaki hareketi gösterir.',
              'Bot erişimini tek bir sağlayıcıya göre açmayın. Sıralama değiştikçe hangi tarayıcının sitenizi okuduğu da değişir.',
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

      <Section className="band border-t border-hairline" eyebrow="Sıkça sorulanlar" title="Bu veriye dair sorular.">
        <Faq items={FAQ} defaultOpen={0} />
      </Section>

      <CtaBlock />
    </>
  );
}
