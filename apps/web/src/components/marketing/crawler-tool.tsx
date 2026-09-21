'use client';

/** AI Crawler Testi — istemci aracı: bot matrisi + kullanıcı seçimiyle robots.txt snippet'i. */
import { useMemo, useState } from 'react';
import { Check, CheckCircle2, Copy, XCircle } from 'lucide-react';
import { buildRobotsSnippet } from '@/lib/robots-snippet';
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

export type BotRow = {
  bot: string;
  owner: string;
  purpose: string;
  kind: 'ai' | 'search';
  allowed: boolean;
  explicit: boolean;
  rule: string | null;
  matchedAgent: string | null;
};

export type CrawlerResult = {
  url: string;
  finalUrl: string;
  hostname: string;
  platform: Platform;
  score: number;
  breakdown: Record<string, number>;
  axes: Axis[];
  findings: Finding[];
  recommendations: Recommendation[];
  matrix: BotRow[];
  robotsFound: boolean;
  declaredSitemaps: string[];
  redirects: { from: string; to: string; status: number }[];
  headers: { xRobotsTag: string | null; contentType: string | null; cacheControl: string | null };
  fetchedAt: string;
  partial: boolean;
  cached?: boolean;
  stats: {
    status: number;
    latencyMs: number;
    htmlBytes: number;
    textRatio: number;
    wordCount: number;
    hreflang: number;
    aiBotsAllowed: number;
    aiBotsTotal: number;
  };
};

export function CrawlerTool({ variant = 'public' }: { variant?: 'public' | 'dashboard' }) {
  return (
    <UrlScanTool<CrawlerResult>
      endpoint="/api/tools/ai-crawler"
      path="/arac/ai-crawler-testi"
      inputLabel="Sayfa adresi"
      placeholder="https://siteniz.com/"
      submitLabel="Crawler testini başlat"
      loadingLabel="Bot erişimi kontrol ediliyor…"
      loadingHint="Sayfa, robots.txt, sitemap.xml, llms.txt ve HTTP→HTTPS yönlendirmesi çekiliyor."
      renderResult={(r) => <CrawlerResultView result={r} variant={variant} />}
    />
  );
}

export function CrawlerResultView({ result: r, variant }: { result: CrawlerResult; variant: 'public' | 'dashboard' }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card p-6 flex flex-col items-center justify-center text-center">
          <ScoreRing score={r.score} caption="Crawler erişim skoru" />
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

      <BotMatrix
        rows={r.matrix}
        robotsFound={r.robotsFound}
        sitemap={r.declaredSitemaps[0] ?? `https://${r.hostname}/sitemap.xml`}
      />

      <div className="card p-5 space-y-3">
        <StatChips
          items={[
            { label: 'HTTP', value: r.stats.status || '—' },
            { label: 'Yanıt', value: `${r.stats.latencyMs} ms` },
            { label: 'HTML', value: `${Math.round(r.stats.htmlBytes / 1024)} KB` },
            { label: 'Metin oranı', value: `%${Math.round(r.stats.textRatio * 100)}` },
            { label: 'Kelime', value: r.stats.wordCount },
            { label: 'hreflang', value: r.stats.hreflang },
            { label: 'Yönlendirme', value: r.redirects.length },
            { label: 'AI bot izni', value: `${r.stats.aiBotsAllowed}/${r.stats.aiBotsTotal}` },
          ]}
        />
        {r.redirects.length > 0 && (
          <ol className="text-[12px] text-ink-muted font-mono space-y-0.5">
            {r.redirects.map((x, i) => (
              <li key={i} className="break-all">
                {x.status} {x.from} → {x.to}
              </li>
            ))}
          </ol>
        )}
        <div className="text-[12px] text-ink-faint font-mono break-all">
          X-Robots-Tag: {r.headers.xRobotsTag ?? '—'} · Content-Type: {r.headers.contentType ?? '—'}
        </div>
        <ScanMeta
          fetchedAt={r.fetchedAt}
          cached={r.cached}
          partial={r.partial}
          finalUrl={r.finalUrl !== r.url ? r.finalUrl : undefined}
        />
      </div>

      <RecommendationCards items={r.recommendations} />

      <section aria-labelledby="cr-findings-title">
        <h3 id="cr-findings-title" className="eyebrow mb-3">
          Tüm bulgular
        </h3>
        <FindingsList findings={r.findings} axes={r.axes} />
      </section>
    </div>
  );
}

function BotMatrix({ rows, robotsFound, sitemap }: { rows: BotRow[]; robotsFound: boolean; sitemap: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const snippet = useMemo(() => buildRobotsSnippet(selected, sitemap), [selected, sitemap]);

  function toggle(bot: string) {
    setSelected((s) => (s.includes(bot) ? s.filter((b) => b !== bot) : [...s, bot]));
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano yok */
    }
  }

  return (
    <section className="card overflow-hidden" aria-labelledby="matrix-title">
      <div className="px-5 py-4 border-b border-hairline flex items-center justify-between gap-3 flex-wrap">
        <h3 id="matrix-title" className="font-display text-[15px]">
          robots.txt bot matrisi
        </h3>
        <span className="text-[11.5px] text-ink-faint">
          {robotsFound
            ? 'Kurallar robots.txt dosyanızdan çözümlendi (RFC 9309).'
            : 'robots.txt bulunamadı — tüm botlar varsayılan olarak izinli.'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] font-mono uppercase tracking-wider text-ink-faint border-b border-hairline">
              <th className="px-4 py-2.5 font-normal">Bot</th>
              <th className="px-4 py-2.5 font-normal">Sahip / amaç</th>
              <th className="px-4 py-2.5 font-normal">Erişim</th>
              <th className="px-4 py-2.5 font-normal">Eşleşen kural</th>
              <th className="px-4 py-2.5 font-normal">
                <span className="sr-only">Snippet'e ekle</span>İzin ver
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.bot} className="border-b border-hairline last:border-0">
                <td className="px-4 py-2.5 font-mono whitespace-nowrap">
                  {b.bot}
                  {b.kind === 'search' && <span className="ml-1.5 text-[10px] text-ink-faint">arama</span>}
                </td>
                <td className="px-4 py-2.5 text-ink-muted">
                  <span className="text-ink">{b.owner}</span> · {b.purpose}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  {b.allowed ? (
                    <span className="inline-flex items-center gap-1 text-positive">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden /> izinli
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <XCircle className="w-3.5 h-3.5" aria-hidden /> engelli
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-[11.5px] text-ink-faint">
                  {b.rule ?? 'varsayılan (izin)'}
                  {b.matchedAgent && <span className="ml-1">[{b.matchedAgent}]</span>}
                </td>
                <td className="px-4 py-2.5">
                  <label className="inline-flex items-center gap-1.5 text-[12px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(b.bot)}
                      onChange={() => toggle(b.bot)}
                      aria-label={`${b.bot} için Allow satırı ekle`}
                    />
                    <span className="sr-only sm:not-sr-only">ekle</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-4 border-t border-hairline bg-paper-2/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[12.5px] text-ink-muted">
            İzin vermek istediğiniz botları seçin; yalnızca standart <code className="font-mono">User-agent</code> /{' '}
            <code className="font-mono">Allow: /</code> satırları üretilir. Mevcut robots.txt dosyanızın sonuna ekleyin.
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!snippet}
            className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px] disabled:opacity-50"
          >
            {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
            {copied ? 'Kopyalandı' : 'Snippet kopyala'}
          </button>
        </div>
        {snippet ? (
          <pre
            className="mt-3 text-[11.5px] font-mono leading-[1.55] bg-paper-3 border border-hairline rounded-lg p-4 overflow-x-auto whitespace-pre"
            aria-label="robots.txt snippet"
          >
            {snippet}
          </pre>
        ) : (
          <p className="mt-3 text-[12px] text-ink-faint">Henüz bot seçilmedi.</p>
        )}
      </div>
    </section>
  );
}
