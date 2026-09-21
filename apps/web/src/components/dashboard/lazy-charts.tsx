'use client';

/**
 * Recharts tabanlı ağır widget'lar istemcide tembel yüklenir (route chunk'ından çıkar).
 * Sunucu render'ında iskelet gösterilir; grafik yalnızca tarayıcıda çizilir.
 */
import dynamic from 'next/dynamic';

function Skeleton({ h = 280 }: { h?: number }) {
  return (
    <div
      className="card p-6 h-full animate-pulse bg-paper-2"
      style={{ minHeight: h }}
      aria-busy="true"
      aria-label="Grafik yükleniyor"
    />
  );
}

export const DualTrend = dynamic(() => import('./widgets/dual-trend').then((m) => m.DualTrend), {
  ssr: false,
  loading: () => <Skeleton />,
});
export const SovDonut = dynamic(() => import('./widgets/sov-donut').then((m) => m.SovDonut), {
  ssr: false,
  loading: () => <Skeleton />,
});
export const SentimentPanel = dynamic(() => import('./widgets/sentiment-panel').then((m) => m.SentimentPanel), {
  ssr: false,
  loading: () => <Skeleton />,
});
export const PositionHistogram = dynamic(
  () => import('./widgets/position-histogram').then((m) => m.PositionHistogram),
  { ssr: false, loading: () => <Skeleton h={220} /> },
);
export const CompetitorRadar = dynamic(() => import('./competitor-radar').then((m) => m.CompetitorRadar), {
  ssr: false,
  loading: () => <Skeleton h={240} />,
});
