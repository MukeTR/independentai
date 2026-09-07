'use client';

/** Ürün Sayfası Testi — istemci aracı. */
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  AxisBars,
  FindingsList,
  PlatformBadge,
  RecommendationCards,
  ScanMeta,
  ScoreRing,
  StatChips,
  type Axis,
  type Finding,
  type Platform,
  type Recommendation,
} from './audit-result-view';
import { UrlScanTool } from './url-scan-tool';

export type ProductPageResult = {
  url: string;
  finalUrl: string;
  hostname: string;
  platform: Platform;
  score: number;
  breakdown: Record<string, number>;
  axes: Axis[];
  findings: Finding[];
  recommendations: Recommendation[];
  fetchedAt: string;
  partial: boolean;
  cached?: boolean;
  product: {
    name: string | null;
    price: string | null;
    currency: string | null;
    availability: string | null;
    brand: string | null;
    schemaFields: Record<string, boolean>;
  };
  stats: {
    status: number;
    latencyMs: number;
    descriptionWords: number;
    boilerplateRatio: number;
    duplicateRatio: number;
    images: number;
    imagesWithAlt: number;
    listItems: number;
    tableRows: number;
    questionHeadings: number;
    avgSentenceWords: number;
  };
};

const FIELD_LABELS: [string, string][] = [
  ['name', 'name'],
  ['description', 'description'],
  ['image', 'image'],
  ['brand', 'brand'],
  ['sku', 'sku'],
  ['gtin', 'gtin / mpn'],
  ['price', 'offers.price'],
  ['priceCurrency', 'offers.priceCurrency'],
  ['availability', 'offers.availability'],
  ['offerUrl', 'offers.url'],
  ['aggregateRating', 'aggregateRating'],
  ['review', 'review'],
];

export function ProductPageTool({ variant = 'public' }: { variant?: 'public' | 'dashboard' }) {
  return (
    <UrlScanTool<ProductPageResult>
      endpoint="/api/tools/product-page"
      path="/arac/urun-sayfasi-testi"
      inputLabel="Ürün sayfası adresi"
      placeholder="https://magazaniz.com/products/ornek-urun"
      submitLabel="Ürün sayfasını test et"
      loadingLabel="Ürün sayfası inceleniyor…"
      loadingHint="Sayfa HTML'i ve robots.txt çekiliyor; Product şeması, içerik ve yapı kontrol ediliyor."
      renderResult={(r) => <ProductPageResultView result={r} variant={variant} />}
    />
  );
}

export function ProductPageResultView({
  result: r,
  variant,
}: {
  result: ProductPageResult;
  variant: 'public' | 'dashboard';
}) {
  const p = r.product;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <ScoreRing score={r.score} caption="Ürün sayfası skoru" />
          <div className="text-[12px] text-ink-faint mt-2 break-all">{r.hostname}</div>
        </div>
        <div className="card p-6 lg:col-span-2 space-y-5">
          <div>
            <div className="eyebrow mb-4">Eksen kırılımı</div>
            <AxisBars axes={r.axes} breakdown={r.breakdown} />
          </div>
          <PlatformBadge platform={r.platform} variant={variant} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="eyebrow mb-3">AI'ın okuduğu ürün</div>
          {p.schemaFields.present ? (
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[13px]">
              <dt className="text-ink-faint">Ad</dt>
              <dd>{p.name ?? '—'}</dd>
              <dt className="text-ink-faint">Marka</dt>
              <dd>{p.brand ?? <span className="text-danger">şemada yok</span>}</dd>
              <dt className="text-ink-faint">Fiyat</dt>
              <dd>
                {p.price ? `${p.price} ${p.currency ?? ''}`.trim() : <span className="text-danger">şemada yok</span>}
              </dd>
              <dt className="text-ink-faint">Stok</dt>
              <dd>{p.availability ?? <span className="text-danger">şemada yok</span>}</dd>
            </dl>
          ) : (
            <p className="text-[13px] text-ink-muted">
              Product JSON-LD bulunamadı. AI motorları bu sayfayı yalnızca serbest metinden anlamaya çalışır; fiyat ve
              stok gibi alanlar güvenilir okunmaz.
              {p.name && (
                <>
                  {' '}
                  H1: <span className="text-ink">{p.name}</span>
                </>
              )}
            </p>
          )}
        </div>
        <div className="card p-5">
          <div className="eyebrow mb-3">Product şeması alanları</div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] font-mono">
            {FIELD_LABELS.map(([key, label]) => {
              const ok = !!p.schemaFields[key];
              return (
                <li key={key} className="flex items-center gap-1.5">
                  {ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0" aria-label="var" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-danger/70 shrink-0" aria-label="yok" />
                  )}
                  <span className={ok ? '' : 'text-ink-faint'}>{label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <StatChips
          items={[
            { label: 'HTTP', value: r.stats.status || '—' },
            { label: 'Yanıt', value: `${r.stats.latencyMs} ms` },
            { label: 'Açıklama', value: `${r.stats.descriptionWords} kelime` },
            { label: 'Boilerplate', value: `%${Math.round(r.stats.boilerplateRatio * 100)}` },
            { label: 'Tekrar', value: `%${Math.round(r.stats.duplicateRatio * 100)}` },
            { label: 'Görsel/alt', value: `${r.stats.imagesWithAlt}/${r.stats.images}` },
            { label: 'Madde', value: r.stats.listItems },
            { label: 'Tablo satırı', value: r.stats.tableRows },
            { label: 'Cümle', value: `${r.stats.avgSentenceWords} kelime` },
          ]}
        />
        <ScanMeta
          fetchedAt={r.fetchedAt}
          cached={r.cached}
          partial={r.partial}
          finalUrl={r.finalUrl !== r.url ? r.finalUrl : undefined}
        />
      </div>

      <RecommendationCards items={r.recommendations} />

      <section aria-labelledby="pp-findings-title">
        <h3 id="pp-findings-title" className="eyebrow mb-3">
          Tüm bulgular
        </h3>
        <FindingsList findings={r.findings} axes={r.axes} />
      </section>
    </div>
  );
}
