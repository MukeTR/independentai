import { ArrowUpRight, Ban, CircleHelp, Link2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AiModelProfile, SourcedStat } from '@/data/ai-models';

/**
 * Yapay zekâ asistanları atlasının görsel parçaları.
 *
 * KURAL: Bu dosyada tek bir sayı YAZILI DEĞİLDİR. Bütün değerler `data/ai-models.ts`ten
 * gelir; bileşenler yalnızca gösterir. Çubuk grafikler bile sayıyı üretmez, `deger`
 * alanındaki metni ayrıştırıp genişliğe çevirir — ayrıştırma başarısız olursa metin
 * olduğu gibi gösterilir, uydurma bir değer üretilmez.
 */

/* ------------------------------------------------------------------ */
/* Rozetler ve kaynak bağlantısı                                       */
/* ------------------------------------------------------------------ */

/** 'yüksek' = birincil kaynak (kurumun kendi yayını), 'orta' = ikincil (haber, ölçüm şirketi). */
export function GuvenRozeti({ guven }: { guven: SourcedStat['guven'] }) {
  const birincil = guven === 'yüksek';
  return (
    <span className={cn('chip whitespace-nowrap', birincil ? 'text-positive' : 'text-warning')}>
      {birincil ? 'birincil kaynak' : 'ikincil kaynak'}
    </span>
  );
}

/** Türkiye verisi ile küresel veri asla aynı kutuda karışmasın diye her kalemde görünür. */
export function KapsamRozeti({ kapsam }: { kapsam: SourcedStat['kapsam'] }) {
  return (
    <span className="chip whitespace-nowrap">{kapsam === 'türkiye' ? 'Türkiye verisi' : 'Küresel veri'}</span>
  );
}

export function KaynakLinki({ stat }: { stat: SourcedStat }) {
  return (
    <a
      href={stat.kaynakUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="text-brand-deep hover:text-brand underline inline-flex items-start gap-1 leading-snug"
    >
      <span>
        {stat.kaynakAdi}, {stat.yil}
      </span>
      <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-[3px]" aria-hidden />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Tablo                                                               */
/* ------------------------------------------------------------------ */

/**
 * Kaynaklı veri tablosu. Sarmalayıcı `overflow-x-auto`: tablo dar ekranda kendi içinde
 * kayar, sayfa yatay taşmaz.
 */
export function VeriTablosu({ veriler, caption }: { veriler: SourcedStat[]; caption: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-hairline">
            <th scope="col" className="eyebrow px-5 py-4">
              Veri
            </th>
            <th scope="col" className="eyebrow px-5 py-4">
              Ölçülen değer
            </th>
            <th scope="col" className="eyebrow px-5 py-4">
              Verinin yılı
            </th>
            <th scope="col" className="eyebrow px-5 py-4">
              Kapsam
            </th>
            <th scope="col" className="eyebrow px-5 py-4">
              Kaynak
            </th>
          </tr>
        </thead>
        <tbody>
          {veriler.map((s) => (
            <tr key={s.baslik} className="border-b border-hairline last:border-0 align-top">
              <th scope="row" className="px-5 py-4 text-[14px] text-ink font-normal text-left max-w-[260px]">
                {s.baslik}
              </th>
              <td className="px-5 py-4 text-[14px] text-ink-muted max-w-[320px]">{s.deger}</td>
              <td className="px-5 py-4 text-[14px] text-ink-faint tabular">{s.yil}</td>
              <td className="px-5 py-4">
                <KapsamRozeti kapsam={s.kapsam} />
              </td>
              <td className="px-5 py-4 text-[13.5px] max-w-[280px]">
                <KaynakLinki stat={s} />
                <div className="mt-2">
                  <GuvenRozeti guven={s.guven} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sıralı çubuklar                                                     */
/* ------------------------------------------------------------------ */

type Cubuk = { etiket: string; oran: number; gosterim: string };

/**
 * "ChatGPT %79,4 · Gemini %10,9" biçimindeki `deger` metnini çubuklara çevirir.
 * Tek bir parça bile ayrıştırılamazsa boş döner; bileşen o zaman metne düşer.
 * Böylece ekranda hiçbir zaman tahmin edilmiş bir oran çizilmez.
 */
function cubuklariAyikla(deger: string): Cubuk[] {
  const parcalar = deger
    .split('·')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parcalar.length < 2) return [];

  const cikti: Cubuk[] = [];
  for (const parca of parcalar) {
    const eslesme = /%(\d+(?:[.,]\d+)?)/.exec(parca);
    const ham = eslesme?.[1];
    if (!eslesme || !ham) return [];
    const sayi = Number(ham.replace(',', '.'));
    if (!Number.isFinite(sayi) || sayi <= 0) return [];
    const etiket = parca.replace(eslesme[0], ' ').replace(/\s+/g, ' ').trim();
    if (!etiket) return [];
    cikti.push({ etiket, oran: sayi, gosterim: `%${ham}` });
  }
  return cikti;
}

/**
 * Bir veri kaleminin dağılımını sıralı çubuk olarak gösterir. Sayı paragrafa gömülmez;
 * başlık, çubuklar ve altında kaynak satırı olarak durur.
 */
export function SiraliCubuklar({ stat }: { stat: SourcedStat }) {
  const cubuklar = cubuklariAyikla(stat.deger).sort((a, b) => b.oran - a.oran);
  const enBuyuk = cubuklar[0]?.oran ?? 1;

  return (
    <figure className="card p-6 lg:p-8 m-0 h-full">
      <figcaption>
        <h3 className="font-display text-[18px] leading-snug">{stat.baslik}</h3>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <KapsamRozeti kapsam={stat.kapsam} />
          <GuvenRozeti guven={stat.guven} />
          <span className="chip whitespace-nowrap tabular">{stat.yil}</span>
        </div>
      </figcaption>

      {cubuklar.length > 0 ? (
        <ul className="mt-6">
          {cubuklar.map((c) => (
            <li
              key={c.etiket}
              className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 sm:gap-4 py-2.5 border-b border-hairline last:border-0"
            >
              <span className="text-[13.5px] sm:text-[14.5px] text-ink leading-snug">{c.etiket}</span>
              <span className="h-2 rounded-full bg-paper-4/60 overflow-hidden" aria-hidden>
                <span
                  className="block h-full rounded-full bg-brand"
                  style={{ width: `${Math.max(2, Math.round((c.oran / enBuyuk) * 100))}%` }}
                />
              </span>
              <span className="text-[14px] tabular text-ink-muted whitespace-nowrap">{c.gosterim}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14.5px] text-ink mt-6 leading-relaxed">{stat.deger}</p>
      )}

      <p className="text-[13px] text-ink-faint mt-5 leading-relaxed">
        Kaynak: <KaynakLinki stat={stat} />
      </p>
      {stat.not && <p className="text-[13px] text-ink-faint mt-3 leading-relaxed">{stat.not}</p>}
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Tek veri kalemi kartı                                               */
/* ------------------------------------------------------------------ */

/** Sektör bloklarında kullanılan kompakt kalem: değer büyük, kaynak hemen altında. */
export function VeriKalemi({ stat }: { stat: SourcedStat }) {
  return (
    <div className="border-b border-hairline last:border-0 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-display text-[19px] leading-snug text-ink">{stat.deger}</span>
        <span className="text-[13.5px] text-ink-muted leading-snug">{stat.baslik}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <KapsamRozeti kapsam={stat.kapsam} />
        <GuvenRozeti guven={stat.guven} />
        <span className="chip whitespace-nowrap tabular">{stat.yil}</span>
      </div>
      <p className="text-[13px] text-ink-faint mt-3 leading-relaxed">
        Kaynak: <KaynakLinki stat={stat} />
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Model profili kartı                                                 */
/* ------------------------------------------------------------------ */

const WEB_ERISIMI_METNI: Record<AiModelProfile['webErisimi'], string> = {
  var: 'Yanıt verirken web’e çıkıyor',
  yok: 'Web’e çıkmıyor',
  kısmi: 'Web’e kısmen çıkıyor',
};

function Satir({ etiket, children }: { etiket: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,8.5rem)_1fr] gap-1 sm:gap-4 py-3 border-b border-hairline last:border-0">
      <dt className="eyebrow pt-0.5">{etiket}</dt>
      <dd className="text-[14.5px] text-ink-muted leading-relaxed m-0">{children}</dd>
    </div>
  );
}

/**
 * Bir asistanın künyesi. `botAdi` null ise "doğrulanmadı" yazar — sağlayıcının resmî
 * dokümanında bulunamayan bir jeton uydurulmaz.
 */
export function ModelKarti({ model }: { model: AiModelProfile }) {
  return (
    <article className="card p-7 lg:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h3 className="font-display text-[24px] tracking-tight leading-snug">{model.ad}</h3>
        <span className="chip whitespace-nowrap">{model.saglayici}</span>
      </div>

      <dl className="mt-6">
        <Satir etiket="Nerede karşınıza çıkıyor">
          <ul className="flex flex-wrap gap-2">
            {model.nerede.map((y) => (
              <li key={y} className="chip whitespace-nowrap">
                {y}
              </li>
            ))}
          </ul>
        </Satir>

        <Satir etiket="Kim kullanıyor">{model.kimKullaniyor}</Satir>
        <Satir etiket="Öne çıkan yanı">{model.gucluYani}</Satir>

        <Satir etiket="Web erişimi">
          <span className="inline-flex items-center gap-2">
            <Link2 className="w-4 h-4 text-ink-faint shrink-0" aria-hidden />
            {WEB_ERISIMI_METNI[model.webErisimi]}
          </span>
        </Satir>

        <Satir etiket="Kaynak gösterir mi">
          <span className="inline-flex items-center gap-2">
            {model.kaynakGosterir ? (
              <ShieldCheck className="w-4 h-4 text-positive shrink-0" aria-hidden />
            ) : (
              <Ban className="w-4 h-4 text-warning shrink-0" aria-hidden />
            )}
            {model.kaynakGosterir
              ? 'Yanıtlarında kaynak bağlantısı veriyor'
              : 'Yanıtlarında kaynak bağlantısı vermiyor'}
          </span>
        </Satir>

        <Satir etiket="Tarayıcı bot adı">
          {model.botAdi ? (
            <code className="font-mono text-[13.5px] text-ink">{model.botAdi}</code>
          ) : (
            <span className="inline-flex items-center gap-2 text-warning">
              <CircleHelp className="w-4 h-4 shrink-0" aria-hidden />
              doğrulanmadı
            </span>
          )}
        </Satir>
      </dl>

      {model.not && <p className="text-[13px] text-ink-faint mt-5 leading-relaxed">{model.not}</p>}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Arama yardımcısı                                                    */
/* ------------------------------------------------------------------ */

/**
 * Bir veri kalemini başlığının ayırt edici parçasıyla bulur. Bulunamazsa `undefined`
 * döner ve çağıran taraf "doğrulanmış veri bulunamadı" yazar; boş kutu kalmaz.
 */
export function veriBul(liste: SourcedStat[], parca: string): SourcedStat | undefined {
  return liste.find((s) => s.baslik.includes(parca));
}

/** Verilen parçaların bulunabilenlerini sırayla döndürür. */
export function verileriBul(liste: SourcedStat[], parcalar: readonly string[]): SourcedStat[] {
  return parcalar.map((p) => veriBul(liste, p)).filter((s): s is SourcedStat => Boolean(s));
}
