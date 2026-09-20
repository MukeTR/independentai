'use client';

import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ModelShare } from '@/server/openrouter-rankings';

/**
 * Model kullanım tablosu — istemcide sıralanabilir.
 *
 * Neden istemci bileşeni: teknik okur aynı veriye farklı sorular sorar ("hangi model istek
 * başına en çok token yakıyor", "hangisi en çok istek alıyor"). Sunucuda tek bir sıraya
 * mahkûm etmek yerine sütun başlığına tıklayarak yeniden sıralatıyoruz. Veri zaten sayfayla
 * birlikte geliyor; ağ isteği yok.
 *
 * Erişilebilirlik: başlıklar gerçek <button>, sıralama durumu th üzerinde `aria-sort`,
 * değişiklik `aria-live` ile duyurulur. Klavyeyle sekme + Enter/Space çalışır.
 *
 * Eksik alan (eski anlık görüntü ya da kaynağın bildirmediği metrik) 0 DEĞİL, "—" gösterilir
 * ve sıralamada her zaman sona düşer.
 *
 * NOT: `import type` derleme sırasında silinir; sunucu modülü istemci paketine girmez.
 */

type SortKey =
  | 'tokens'
  | 'sharePct'
  | 'requests'
  | 'requestSharePct'
  | 'tokensPerRequest'
  | 'promptPerCompletion'
  | 'reasoningPct'
  | 'cachedPct'
  | 'changeRatio'
  | 'model'
  | 'author'
  | 'variant';

type Dir = 'asc' | 'desc';

const nfTam = new Intl.NumberFormat('tr-TR');
const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Trilyon mertebesindeki sayılar hücreye sığmaz; kısaltılır, tam değer `title`'da durur. */
function kisa(n: number): string {
  if (n >= 1e12) return `${nf2.format(n / 1e12)} T`;
  if (n >= 1e9) return `${nf2.format(n / 1e9)} Mr`;
  if (n >= 1e6) return `${nf2.format(n / 1e6)} Mn`;
  return nfTam.format(n);
}

function Yok() {
  return (
    <span className="text-ink-faint" title="Kaynak bu alanı bildirmedi">
      —
    </span>
  );
}

type Col = {
  key: SortKey | null;
  label: string;
  /** Sütunun ne olduğu — başlık `title`'ında ve tablo altındaki tanım listesinde kullanılır. */
  tanim?: string;
  align?: 'left' | 'right';
  mono?: boolean;
  render: (m: ModelShare, i: number) => React.ReactNode;
  /** Sıralama için sayısal/metinsel anahtar. */
  value?: (m: ModelShare) => number | string | undefined;
};

const COLS: Col[] = [
  {
    key: null,
    label: '#',
    render: (_m, i) => <span className="text-ink-faint tabular">{i + 1}</span>,
  },
  {
    key: 'model',
    label: 'Model',
    tanim: 'Kaynaktaki permaslug’ın model kısmı; tarih soneki modelin yayın sürümüdür.',
    mono: true,
    render: (m) => <span className="text-ink whitespace-nowrap">{m.model}</span>,
    value: (m) => m.model,
  },
  {
    key: 'author',
    label: 'Sağlayıcı',
    tanim: 'Permaslug’ın eğik çizgiden önceki kısmı.',
    mono: true,
    render: (m) => <span className="text-ink-muted whitespace-nowrap">{m.author}</span>,
    value: (m) => m.author,
  },
  {
    key: 'variant',
    label: 'Variant',
    tanim: 'Kaynaktaki variant alanı: standard, free vb. Aynı model iki variant’la geldiyse ikisi de yazılır.',
    mono: true,
    render: (m) => (m.variant ? <span className="text-ink-muted">{m.variant}</span> : <Yok />),
    value: (m) => m.variant,
  },
  {
    key: 'tokens',
    label: 'Token',
    tanim: 'total_prompt_tokens + total_completion_tokens',
    align: 'right',
    render: (m) => (
      <span className="tabular whitespace-nowrap" title={`${nfTam.format(m.tokens)} token`}>
        {kisa(m.tokens)}
      </span>
    ),
    value: (m) => m.tokens,
  },
  {
    key: 'sharePct',
    label: 'Token payı',
    tanim: 'tokens ÷ listedeki tüm modellerin toplam token’ı × 100',
    align: 'right',
    render: (m) => <span className="tabular text-ink whitespace-nowrap">%{nf2.format(m.sharePct)}</span>,
    value: (m) => m.sharePct,
  },
  {
    key: 'requests',
    label: 'İstek',
    tanim: 'Kaynaktaki count alanı: penceredeki istek sayısı.',
    align: 'right',
    render: (m) =>
      m.requests === undefined ? (
        <Yok />
      ) : (
        <span className="tabular whitespace-nowrap" title={`${nfTam.format(m.requests)} istek`}>
          {kisa(m.requests)}
        </span>
      ),
    value: (m) => m.requests,
  },
  {
    key: 'requestSharePct',
    label: 'İstek payı',
    tanim: 'requests ÷ listedeki toplam istek × 100. Token payından farklıysa modelin bağlam boyu farklıdır.',
    align: 'right',
    render: (m) =>
      m.requestSharePct === undefined ? <Yok /> : <span className="tabular whitespace-nowrap">%{nf2.format(m.requestSharePct)}</span>,
    value: (m) => m.requestSharePct,
  },
  {
    key: 'tokensPerRequest',
    label: 'Token/istek',
    tanim: 'tokens ÷ requests. Uzun bağlam mı, kısa soru mu olduğunu gösterir.',
    align: 'right',
    render: (m) =>
      m.tokensPerRequest === undefined ? <Yok /> : <span className="tabular whitespace-nowrap">{nfTam.format(m.tokensPerRequest)}</span>,
    value: (m) => m.tokensPerRequest,
  },
  {
    key: 'promptPerCompletion',
    label: 'İstem : cevap',
    tanim: 'promptTokens ÷ completionTokens. Yüksek değer “çok okuyup az yazan” iş yükü demektir.',
    align: 'right',
    render: (m) =>
      m.promptPerCompletion === undefined ? (
        <Yok />
      ) : (
        <span className="tabular whitespace-nowrap">{nf2.format(m.promptPerCompletion)} : 1</span>
      ),
    value: (m) => m.promptPerCompletion,
  },
  {
    key: 'reasoningPct',
    label: 'Akıl yürütme',
    tanim: 'total_native_tokens_reasoning ÷ completionTokens × 100',
    align: 'right',
    render: (m) =>
      m.reasoningPct === undefined ? <Yok /> : <span className="tabular whitespace-nowrap">%{nf2.format(m.reasoningPct)}</span>,
    value: (m) => m.reasoningPct,
  },
  {
    key: 'cachedPct',
    label: 'Önbellek',
    tanim: 'total_native_tokens_cached ÷ promptTokens × 100',
    align: 'right',
    render: (m) =>
      m.cachedPct === undefined ? <Yok /> : <span className="tabular whitespace-nowrap">%{nf2.format(m.cachedPct)}</span>,
    value: (m) => m.cachedPct,
  },
  {
    key: 'changeRatio',
    label: '7 günlük değişim',
    tanim:
      'Kaynağın change alanı: son 7 günün token toplamının, ondan önceki 7 güne göre oransal değişimi. Bu sayıyı biz hesaplamıyoruz.',
    align: 'right',
    render: (m) => {
      if (m.changeRatio === undefined) return <Yok />;
      const pct = m.changeRatio * 100;
      const renk = pct > 0 ? 'text-positive' : pct < 0 ? 'text-danger' : 'text-ink-muted';
      const isaret = pct > 0 ? '+' : pct < 0 ? '−' : '';
      return (
        <span className={`tabular whitespace-nowrap ${renk}`}>
          {isaret}%{nf2.format(Math.abs(pct))}
        </span>
      );
    },
    value: (m) => m.changeRatio,
  },
];

export function RankingsTable({ models, windowLabel }: { models: ModelShare[]; windowLabel: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: Dir }>({ key: 'tokens', dir: 'desc' });
  const liveId = useId();

  const siralanmis = useMemo(() => {
    const col = COLS.find((c) => c.key === sort.key);
    const oku = col?.value;
    if (!oku) return models;
    const arr = [...models];
    arr.sort((a, b) => {
      const av = oku(a);
      const bv = oku(b);
      // Eksik değer yönden bağımsız olarak SONA düşer: "veri yok" bir sıralama değeri değildir.
      if (av === undefined && bv === undefined) return 0;
      if (av === undefined) return 1;
      if (bv === undefined) return -1;
      const c =
        typeof av === 'string' || typeof bv === 'string'
          ? String(av).localeCompare(String(bv), 'tr')
          : (av as number) - (bv as number);
      return sort.dir === 'asc' ? c : -c;
    });
    return arr;
  }, [models, sort]);

  const tikla = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' }
        : // Sayısal sütunlar önce büyükten küçüğe, metin sütunları A→Z açılır.
          { key, dir: key === 'model' || key === 'author' || key === 'variant' ? 'asc' : 'desc' },
    );
  };

  const aktifBaslik = COLS.find((c) => c.key === sort.key)?.label ?? '';

  return (
    <div>
      <p className="text-[13px] text-ink-faint mb-3">
        Sütun başlığına tıklayın; tablo o sütuna göre yeniden sıralanır. Veri sayfayla birlikte geldi, sıralama için
        yeni istek atılmaz.
      </p>

      <div className="card overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1180px]">
          <caption className="sr-only">
            {windowLabel} penceresinde OpenRouter üzerinden ölçülen model kullanımı. Sütun başlıkları sıralama
            düğmesidir.
          </caption>
          <thead>
            <tr className="border-b border-hairline">
              {COLS.map((c) => {
                const aktif = c.key !== null && c.key === sort.key;
                const ariaSort = aktif ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
                return (
                  <th
                    key={c.label}
                    scope="col"
                    aria-sort={c.key ? ariaSort : undefined}
                    className={`eyebrow px-4 py-3.5 align-bottom ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.key ? (
                      <button
                        type="button"
                        onClick={() => tikla(c.key as SortKey)}
                        title={c.tanim}
                        aria-label={`${c.label} sütununa göre sırala`}
                        className={`inline-flex items-center gap-1 hover:text-brand transition ${
                          aktif ? 'text-brand-deep' : ''
                        } ${c.align === 'right' ? 'flex-row-reverse' : ''}`}
                      >
                        <span>{c.label}</span>
                        {aktif ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="w-3 h-3 shrink-0" aria-hidden />
                          ) : (
                            <ArrowDown className="w-3 h-3 shrink-0" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 shrink-0 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {siralanmis.map((m, i) => (
              <tr key={m.slug} className="border-b border-hairline last:border-0 hover:bg-paper-2">
                {COLS.map((c) => (
                  <td
                    key={c.label}
                    className={`px-4 py-3 text-[13.5px] text-ink-muted ${c.align === 'right' ? 'text-right' : ''} ${
                      c.mono ? 'font-mono text-[13px]' : ''
                    }`}
                  >
                    {c.render(m, i)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p id={liveId} aria-live="polite" className="sr-only">
        Tablo {aktifBaslik} sütununa göre {sort.dir === 'asc' ? 'artan' : 'azalan'} sırada.
      </p>

      <dl className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
        {COLS.filter((c) => c.tanim).map((c) => (
          <div key={c.label} className="flex gap-2 text-[13px] leading-relaxed">
            <dt className="text-ink shrink-0 font-medium">{c.label}:</dt>
            <dd className="text-ink-muted">{c.tanim}</dd>
          </div>
        ))}
        <div className="flex gap-2 text-[13px] leading-relaxed">
          <dt className="text-ink shrink-0 font-medium">Kısaltmalar:</dt>
          <dd className="text-ink-muted">T = trilyon, Mr = milyar, Mn = milyon. Tam sayı için hücrenin üzerine gelin.</dd>
        </div>
        <div className="flex gap-2 text-[13px] leading-relaxed">
          <dt className="text-ink shrink-0 font-medium">—</dt>
          <dd className="text-ink-muted">Kaynak o alanı bu pencerede bildirmedi. Sıfır demek değildir.</dd>
        </div>
      </dl>
    </div>
  );
}
