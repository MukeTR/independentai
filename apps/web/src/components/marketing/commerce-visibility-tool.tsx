'use client';

/** E-ticaret AI Görünürlük Testi — istemci aracı (public sayfa ve panel kopyası aynı bileşeni kullanır). */
import Link from 'next/link';
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

export type CommerceResult = {
  url: string;
  finalUrl: string;
  hostname: string;
  platform: Platform;
  score: number;
  breakdown: Record<string, number>;
  axes: Axis[];
  findings: Finding[];
  sampledProductUrl?: string;
  recommendations: Recommendation[];
  fetchedAt: string;
  partial: boolean;
  cached?: boolean;
  stats: {
    status: number;
    latencyMs: number;
    productLinks: number;
    collectionLinks: number;
    wordCount: number;
    textRatio: number;
    aiBotsAllowed: number;
    aiBotsTotal: number;
    sampledProducts: number;
  };
};

export function CommerceVisibilityTool({ variant = 'public' }: { variant?: 'public' | 'dashboard' }) {
  return (
    <UrlScanTool<CommerceResult>
      endpoint="/api/tools/ecommerce-visibility"
      path="/arac/e-ticaret-ai-gorunurluk-testi"
      inputLabel="Mağaza adresi"
      placeholder="magazaniz.com"
      submitLabel="Mağazayı test et"
      loadingLabel="Mağaza taranıyor…"
      loadingHint="Ana sayfa, robots.txt, sitemap, llms.txt ve bir örnek ürün sayfası çekiliyor (en fazla ~25 sn)."
      renderResult={(r) => <CommerceResultView result={r} variant={variant} />}
    />
  );
}

export function CommerceResultView({
  result: r,
  variant,
}: {
  result: CommerceResult;
  variant: 'public' | 'dashboard';
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <ScoreRing score={r.score} caption="AI görünürlük skoru" />
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

      <div className="card p-5 space-y-3">
        <StatChips
          items={[
            { label: 'HTTP', value: r.stats.status || '—' },
            { label: 'Yanıt', value: `${r.stats.latencyMs} ms` },
            { label: 'Ürün linki', value: r.stats.productLinks },
            { label: 'Kategori linki', value: r.stats.collectionLinks },
            { label: 'Kelime', value: r.stats.wordCount },
            { label: 'Metin oranı', value: `%${Math.round(r.stats.textRatio * 100)}` },
            { label: 'AI bot izni', value: `${r.stats.aiBotsAllowed}/${r.stats.aiBotsTotal}` },
          ]}
        />
        {r.sampledProductUrl && (
          <p className="text-[12px] text-ink-muted">
            Örneklenen ürün sayfası:{' '}
            <a
              href={r.sampledProductUrl}
              target="_blank"
              rel="noreferrer nofollow"
              className="underline break-all hover:text-ink"
            >
              {r.sampledProductUrl}
            </a>{' '}
            ·{' '}
            <Link
              href={`/arac/urun-sayfasi-testi?url=${encodeURIComponent(r.sampledProductUrl)}`}
              className="text-brand-deep hover:text-brand"
            >
              Ürün sayfası testini çalıştır
            </Link>
          </p>
        )}
        <ScanMeta
          fetchedAt={r.fetchedAt}
          cached={r.cached}
          partial={r.partial}
          finalUrl={r.finalUrl !== r.url ? r.finalUrl : undefined}
        />
      </div>

      <RecommendationCards items={r.recommendations} />

      <section aria-labelledby="findings-title">
        <h3 id="findings-title" className="eyebrow mb-3">
          Tüm bulgular
        </h3>
        <FindingsList findings={r.findings} axes={r.axes} />
      </section>
    </div>
  );
}
