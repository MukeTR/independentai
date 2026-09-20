'use client';

/**
 * Site aracı istemcisi — 11 gece programı aracının ortak kabuğu (mikro-kopya sözleşmesi, spec §1):
 *  - endpoint/etiketler `TOOL_REGISTRY`'den (slug), form `UrlScanTool`; sektör seçici (`SECTORS`) ve rakip URL alanı
 *    opsiyonel (`?sektor=` / `?rakip=` ile ön-seçim); gövdeye `sector` / `competitorUrl` eklenir.
 *  - Sonuç: hüküm satırı ("3 kritik, 4 uyarı, 9 tamam — 41/100"), skor + eksenler, öneriler (rehber), bulgular,
 *    araca özel `renderExtra`, kalıcı rapor bağlantısı (W6 paylaşım butonlarını ekler — burada yalnız link),
 *    CTA çifti ("Bunları biz düzeltelim" → /contact, "Kendim düzelteceğim" → #oneriler), KVKK cümlesi.
 *  - WAF: skor yerine "bot koruması nedeniyle taranamadı"; partial / legacyCharset görünür etiket.
 *  - `sectorSelect='required'`: form native `required` ile, `?url=` otomatik başlatması `autoRun` ile engellenir;
 *    sunucu tarafı (W3 satin-alma-sorusu-kapsama) `sector` yoksa yine ClientError (400) vermelidir.
 */
import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, FileText, Wrench } from 'lucide-react';
import { SECTORS } from '@/data/sectors';
import { isSectorSlug, toolBySlug, toolPath, type ToolEntry } from '@/lib/tool-registry';
import { verdictLine, verdictTotal, type Verdict } from '@/lib/verdict';
import { InlineAlert } from '@/components/ui/inline-alert';
import {
  AxisBars,
  FindingsList,
  PlatformBadge,
  RecommendationCards,
  ScoreRing,
  StatChips,
  scoreLabel,
  type Axis,
  type Finding,
  type Platform,
  type Recommendation,
} from './audit-result-view';
import { UrlScanTool } from './url-scan-tool';

export type SiteToolResult = {
  kind: string;
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
  waf: boolean;
  legacyCharset: boolean;
  stats: { requests: number; bytes: number; ms: number };
  verdict: Verdict;
  extra?: unknown;
  input?: { sector?: string; competitorUrl?: string };
  cached?: boolean;
  scanId?: string;
  reportToken?: string;
  reportUrl?: string;
};

export const KVKK_SENTENCE =
  'Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.';

export type SiteToolVariant = 'public' | 'dashboard';

export type SiteToolProps<T extends SiteToolResult> = {
  slug: string;
  variant?: SiteToolVariant;
  /** Sektör seçici (SECTORS); `required` ise seçilmeden gönderilemez */
  sectorSelect?: boolean | 'required';
  /** Rakip URL alanı (rakip-kiyas) */
  competitorInput?: boolean;
  /** Araca özel ek görünüm (bot matrisi, mockup, kıyas tablosu …) — öneri kartlarının üstünde */
  renderExtra?: (result: T, ctx: { url: string; shareUrl: string }) => ReactNode;
  /** Tüm sonuç görünümünü değiştirmek isteyen araç (nadir) */
  renderResult?: (result: T, ctx: { url: string; shareUrl: string }) => ReactNode;
  inputLabel?: string;
  placeholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  loadingHint?: string;
};

/** Sunucuya giden sektör/rakip alanları — saf, test edilebilir. */
export function buildScanBody(input: { sector?: string; competitorUrl?: string }): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.sector && isSectorSlug(input.sector)) out.sector = input.sector;
  const c = input.competitorUrl?.trim();
  if (c) out.competitorUrl = c;
  return out;
}

/** "Bunları biz düzeltelim" hedefi: /contact?src=<slug>&site=<host>&token=<reportToken> */
export function contactHref(slug: string, hostname?: string, reportToken?: string): string {
  const p = new URLSearchParams({ src: slug });
  if (hostname) p.set('site', hostname);
  if (reportToken) p.set('token', reportToken);
  return `/contact?${p.toString()}`;
}

export function SiteTool<T extends SiteToolResult = SiteToolResult>({
  slug,
  variant = 'public',
  sectorSelect = false,
  competitorInput = false,
  renderExtra,
  renderResult,
  inputLabel = 'Site adresi',
  placeholder = 'https://siteniz.com/',
  submitLabel,
  loadingLabel = 'Site taranıyor…',
  loadingHint,
}: SiteToolProps<T>) {
  const entry = toolBySlug(slug);
  const params = useSearchParams();
  const [sector, setSector] = useState(() => {
    const q = params.get('sektor');
    return q && isSectorSlug(q) ? q : '';
  });
  const [competitor, setCompetitor] = useState(() => params.get('rakip') ?? '');
  const ids = useMemo(() => ({ input: `scan-url-${slug}`, sector: `sektor-${slug}`, rakip: `rakip-${slug}` }), [slug]);

  if (!entry) {
    return <InlineAlert tone="error">Araç bulunamadı: {slug}</InlineAlert>;
  }
  const requiresSector = sectorSelect === 'required';

  const extraFields =
    sectorSelect || competitorInput ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
        {sectorSelect && (
          <div>
            <label htmlFor={ids.sector} className="text-[13px] text-ink-muted">
              Sektörünüz{requiresSector ? '' : ' (isteğe bağlı)'}
            </label>
            <select
              id={ids.sector}
              name="sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              required={requiresSector}
              className="input mt-1.5 w-full"
            >
              <option value="">{requiresSector ? 'Sektör seçin…' : 'Seçilmedi'}</option>
              {SECTORS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {competitorInput && (
          <div>
            <label htmlFor={ids.rakip} className="text-[13px] text-ink-muted">
              Rakibinizin sitesi
            </label>
            <input
              id={ids.rakip}
              name="competitorUrl"
              type="text"
              inputMode="url"
              autoComplete="off"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder="https://rakip.com/"
              className="input mt-1.5 w-full"
              maxLength={300}
            />
          </div>
        )}
      </div>
    ) : null;

  return (
    <UrlScanTool<T>
      endpoint={entry.endpoint}
      path={toolPath(entry.slug)}
      inputId={ids.input}
      inputLabel={inputLabel}
      placeholder={placeholder}
      submitLabel={submitLabel ?? 'Sitemi tara'}
      loadingLabel={loadingLabel}
      loadingHint={loadingHint}
      extraFields={extraFields}
      // Sektör zorunluysa `?url=` otomatik başlatması formu (native `required`) atlayacağından sektörsüz istek gitmesin:
      // `?sektor=` yok → kullanıcı sektör seçince (URL alanı dolu) tarama başlar.
      autoRun={!requiresSector || !!sector}
      extraBody={() => buildScanBody({ sector, competitorUrl: competitorInput ? competitor : undefined })}
      renderResult={(r, ctx) =>
        renderResult ? (
          renderResult(r, ctx)
        ) : (
          <SiteToolResultView result={r} entry={entry} variant={variant} extra={renderExtra?.(r, ctx)} />
        )
      }
    />
  );
}

function VerdictHeadline({ result }: { result: SiteToolResult }) {
  const line = verdictLine(result);
  return (
    <h2 className="font-display text-[22px] sm:text-[26px] tracking-tight leading-tight">
      {line}
      {!result.waf && (
        <>
          {' '}
          — <span className="tabular">{result.score}/100</span>
        </>
      )}
    </h2>
  );
}

export function SiteToolResultView({
  result: r,
  entry,
  variant,
  extra,
}: {
  result: SiteToolResult;
  entry: ToolEntry;
  variant: SiteToolVariant;
  extra?: ReactNode;
}) {
  const total = verdictTotal(r.verdict);
  const when = (() => {
    const d = new Date(r.fetchedAt);
    return Number.isNaN(d.getTime())
      ? r.fetchedAt
      : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
  })();

  return (
    <div className="space-y-6">
      {r.waf && (
        <InlineAlert tone="warning">
          Bu site bot koruması (WAF) nedeniyle taranamadı; skor üretilmedi. Cloudflare veya benzeri koruma tarayıcımızı
          engelliyor. Aşağıdaki bulgular yalnızca erişilebilen kısımlara aittir.
        </InlineAlert>
      )}

      <div className="card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {!r.waf && <ScoreRing score={r.score} caption={entry.shortTitle} size={120} />}
          <div className="min-w-0 flex-1">
            <div className="eyebrow mb-2">{entry.shortTitle}</div>
            <VerdictHeadline result={r} />
            <p className="text-[12px] text-ink-faint mt-2">
              {total} kontrol · {when} · deterministik tarayıcı · hazırlık ölçer, AI davranışını değil
              {!r.waf && <> · {scoreLabel(r.score)}</>}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-[11px]">
              <span className="chip !text-[11px] break-all">{r.hostname}</span>
              {r.cached && <span className="chip !text-[11px]">önbellekten</span>}
              {r.partial && <span className="chip !text-[11px]">kısmi tarama · bütçe doldu</span>}
              {r.legacyCharset && <span className="chip !text-[11px]">eski kodlama (ISO-8859-9 / windows-1254)</span>}
              {r.input?.sector && <span className="chip !text-[11px]">sektör: {r.input.sector}</span>}
            </div>
          </div>
        </div>
        <div>
          <div className="eyebrow mb-4">Eksen kırılımı</div>
          <AxisBars axes={r.axes} breakdown={r.breakdown} />
        </div>
        <PlatformBadge platform={r.platform} variant={variant} />
      </div>

      {extra}

      <div id="oneriler" className="scroll-mt-24">
        <RecommendationCards items={r.recommendations} />
      </div>

      <FindingsList findings={r.findings} axes={r.axes} />

      <div className="card p-5 space-y-3">
        <StatChips
          items={[
            { label: 'İstek', value: r.stats.requests },
            { label: 'İndirilen', value: `${Math.round(r.stats.bytes / 1024)} KB` },
            { label: 'Süre', value: `${(r.stats.ms / 1000).toFixed(1)} sn` },
            { label: 'Son adres', value: r.finalUrl.length > 48 ? `${r.finalUrl.slice(0, 47)}…` : r.finalUrl },
          ]}
        />
        {r.reportUrl && (
          <p className="text-[12.5px] text-ink-muted flex items-start gap-2">
            <FileText className="w-4 h-4 shrink-0 mt-0.5 text-ink-faint" aria-hidden />
            <span>
              Kalıcı rapor bağlantısı:{' '}
              <a href={r.reportUrl} className="text-brand-deep hover:text-brand break-all underline-offset-2">
                {r.reportUrl}
              </a>{' '}
              <span className="text-ink-faint">(30 gün erişilebilir)</span>
            </span>
          </p>
        )}
      </div>

      <div className="card p-5 sm:p-6 bg-paper-2/60">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <div className="font-display text-[17px] tracking-tight">İki yol var</div>
            <p className="text-[13px] text-ink-muted mt-1">
              Bulguları kendiniz düzeltin ya da Yanıt Agency uygulasın; ölçüm her iki yolda aynı panelden takip edilir.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
            <Link
              href={contactHref(entry.slug, r.hostname, r.reportToken)}
              className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Wrench className="w-4 h-4" aria-hidden />
              Bunları biz düzeltelim
            </Link>
            <a
              href="#oneriler"
              className="btn-secondary inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Kendim düzelteceğim
              <ArrowRight className="w-4 h-4" aria-hidden />
            </a>
          </div>
        </div>
        <p className="text-[11.5px] text-ink-faint mt-4">{KVKK_SENTENCE}</p>
      </div>
    </div>
  );
}
