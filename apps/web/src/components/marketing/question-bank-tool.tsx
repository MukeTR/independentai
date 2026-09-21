'use client';

/**
 * "Müşteriniz sizi nasıl soruyor?" — istemci aracı.
 *
 *  - Tek ekranda dört girdi: sektör (zorunlu), site adresi, şehir, hizmet adı (üçü de isteğe bağlı).
 *  - Site YOKSA: `GET /api/tools/musteriniz-nasil-soruyor?sektor=` → sektörün soru bankası aşamalara göre listelenir.
 *  - Site VARSA: `POST` → aynı liste, her sorunun girilen sayfadaki karşılığıyla (var / kısmen / yok) birlikte.
 *  - Şehir ve hizmet adı sunucuya GİTMEZ: yalnız soru cümlelerindeki yer tutucuları doldurur ve aşağıdaki
 *    "kendi sözlerinizle" kalıplarını kurar. Böylece tarama sonucu ile önbellek anahtarı birebir örtüşür.
 *  - Ölçüm yapılamayan hiçbir yerde oran/skor gösterilmez (adrese ulaşılamadıysa yalnız banka görünür).
 *
 * Tip kaynağı tek: uç noktanın kendi tipleri `import type` ile okunur (derlemede silinir, istemciye sunucu
 * kodu taşımaz).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleSlash,
  Link2,
  Loader2,
  MinusCircle,
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { SECTORS } from '@/data/sectors';
import { isSectorSlug } from '@/lib/tool-registry';
import { STAGE_LABELS, STAGE_ORDER } from '@/data/question-bank/types';
import { InlineAlert } from '@/components/ui/inline-alert';
import { BLOCKED_REJECTED_MESSAGE, handleBlockedResponse } from '@/lib/blocked-redirect';
import { useHydrated } from '@/lib/use-hydrated';
import type {
  CoverageQuestion,
  CoverageStatus,
  QuestionBankPayload,
  QuestionCoverageResult,
} from '@/app/api/tools/musteriniz-nasil-soruyor/route';
import { ScanError, scanFetch } from './url-scan-tool';
import { ShareReportButtons } from './share-report-buttons';

const ENDPOINT = '/api/tools/musteriniz-nasil-soruyor';
const PATH = '/arac/musteriniz-nasil-soruyor';

type Payload = QuestionBankPayload | QuestionCoverageResult;

type ToolState =
  | { status: 'idle' }
  | { status: 'loading'; withSite: boolean }
  | { status: 'done'; data: Payload }
  | { status: 'error'; message: string; code: string };

function isCoverage(data: Payload): data is QuestionCoverageResult {
  return data.mode === 'kapsama';
}

/** GET ucu — `scanFetch` ile aynı hata sözleşmesi (429'da Retry-After okunur). */
async function requestBank(sector: string): Promise<QuestionBankPayload> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?sektor=${encodeURIComponent(sector)}`, {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new ScanError(0, 'network', 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.');
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const d = (data ?? {}) as { message?: string; code?: string; requestId?: string };
    const ra = Number(res.headers.get('retry-after'));
    throw new ScanError(
      res.status,
      d.code ?? 'error',
      d.message ??
        (res.status === 429 ? 'Çok fazla istek, biraz sonra tekrar deneyin.' : `İstek başarısız (${res.status})`),
      d.requestId,
      Number.isFinite(ra) && ra > 0 ? ra : undefined,
    );
  }
  return data as QuestionBankPayload;
}

/** Soru cümlesindeki yer tutucular: doluysa değerle, boşsa sessizce silinir. */
export function fillPlaceholders(text: string, city: string, service: string): string {
  const c = city.trim();
  const s = service.trim();
  return text
    .replace(/\{şehir\}/g, c)
    .replace(/\{hizmet\}/g, s)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:?!])/g, '$1')
    .trim();
}

/** Şehir/hizmet adıyla kurulan soru kalıpları — bankadan DEĞİL, girdiğiniz bilgilerden üretilir. */
export function localPrompts(city: string, service: string): string[] {
  const c = city.trim();
  const s = service.trim();
  const where = c ? `${c} içinde` : 'bulunduğum şehirde';
  const what = s || 'bu hizmet';
  return [
    `${where} ${what} için kime başvurmalıyım, nasıl karar vermeliyim?`,
    `${what} ücretleri neye göre değişiyor; ${where} ortalama bir aralık söyleyebilir misin?`,
    `${where} ${what} konusunda bir yerle görüşmeden önce nelere bakmalıyım?`,
    `${what} için hangi belgeler, yetkiler ve referanslar sorulmalı?`,
    `Şehir dışından biri ${what} için geliyorsa süreç nasıl işliyor, önce ne yapmalı?`,
  ];
}

const STATUS_META: Record<CoverageStatus, { label: string; className: string; icon: LucideIcon }> = {
  var: { label: 'karşılığı var', className: 'text-positive border-positive/30 bg-positive/5', icon: CheckCircle2 },
  kismen: { label: 'kısmen', className: 'text-warning border-warning/30 bg-warning/5', icon: MinusCircle },
  yok: { label: 'karşılığı yok', className: 'text-danger border-danger/30 bg-danger/5', icon: CircleSlash },
};

export function QuestionBankTool() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const [sector, setSector] = useState(() => {
    const q = params.get('sektor');
    return q && isSectorSlug(q) ? q : '';
  });
  const [url, setUrl] = useState(() => params.get('url') ?? '');
  const [city, setCity] = useState(() => params.get('sehir') ?? '');
  const [service, setService] = useState(() => params.get('hizmet') ?? '');
  const [state, setState] = useState<ToolState>({ status: 'idle' });
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const run = useCallback(async (selected: string, site: string) => {
    if (!isSectorSlug(selected)) {
      setState({ status: 'error', message: 'Önce sektörünüzü seçin.', code: 'bad_request' });
      return;
    }
    const target = site.trim();
    if (target.length > 0 && target.length < 3) {
      setState({
        status: 'error',
        message: 'Site adresi çok kısa görünüyor. Tam adresi yazın ya da alanı boş bırakıp yalnızca soruları görün.',
        code: 'bad_request',
      });
      return;
    }
    setState({ status: 'loading', withSite: target.length >= 3 });
    setCountdown(null);
    try {
      if (target.length >= 3) {
        const data = await scanFetch<QuestionCoverageResult>(ENDPOINT, { url: target, sector: selected });
        const blocked = handleBlockedResponse(data);
        if (blocked === 'redirected') return;
        if (blocked === 'rejected') {
          setState({ status: 'error', message: BLOCKED_REJECTED_MESSAGE, code: 'blocked' });
          return;
        }
        setState({ status: 'done', data });
        return;
      }
      setState({ status: 'done', data: await requestBank(selected) });
    } catch (err) {
      const e = err instanceof ScanError ? err : null;
      setState({
        status: 'error',
        message: e?.message ?? 'Bir hata oluştu, tekrar deneyin.',
        code: e?.code ?? 'error',
      });
      if (e?.status === 429) setCountdown(e.retryAfter ?? 60);
    }
  }, []);

  // Paylaşılan bağlantı (?sektor=…) tek sefer otomatik çalışır.
  useEffect(() => {
    if (started.current) return;
    const q = params.get('sektor');
    if (q && isSectorSlug(q)) {
      started.current = true;
      void run(q, params.get('url') ?? '');
    }
  }, [params, run]);

  useEffect(() => {
    if (countdown == null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c == null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const busy = state.status === 'loading';
  const waiting = countdown != null && countdown > 0;

  const shareUrl = (() => {
    if (typeof window === 'undefined' || !sector) return '';
    const p = new URLSearchParams({ sektor: sector });
    if (url.trim()) p.set('url', url.trim());
    if (city.trim()) p.set('sehir', city.trim());
    if (service.trim()) p.set('hizmet', service.trim());
    return `${window.location.origin}${PATH}?${p.toString()}`;
  })();

  async function copyShare() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi yok — bağlantı yanında yazılı kalır */
    }
  }

  const prompts = city.trim() || service.trim() ? localPrompts(city, service) : [];

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(sector, url);
        }}
        className="card p-4 sm:p-6"
        aria-busy={busy}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label htmlFor="qb-sektor" className="text-[13px] text-ink-muted">
              Sektörünüz <span className="text-ink-faint">(zorunlu)</span>
            </label>
            <select
              id="qb-sektor"
              name="sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              required
              className="input mt-1.5 w-full"
            >
              <option value="">Sektör seçin…</option>
              {SECTORS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="qb-url" className="text-[13px] text-ink-muted">
              Web siteniz <span className="text-ink-faint">(isteğe bağlı)</span>
            </label>
            <input
              id="qb-url"
              name="url"
              type="text"
              inputMode="url"
              autoComplete="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://siteniz.com/hizmetler"
              className="input mt-1.5 w-full"
              maxLength={300}
            />
          </div>
          <div>
            <label htmlFor="qb-sehir" className="text-[13px] text-ink-muted">
              Şehir <span className="text-ink-faint">(isteğe bağlı)</span>
            </label>
            <input
              id="qb-sehir"
              name="city"
              type="text"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Bursa"
              className="input mt-1.5 w-full"
              maxLength={60}
            />
          </div>
          <div>
            <label htmlFor="qb-hizmet" className="text-[13px] text-ink-muted">
              Ne satıyorsunuz / hizmet adı <span className="text-ink-faint">(isteğe bağlı)</span>
            </label>
            <input
              id="qb-hizmet"
              name="service"
              type="text"
              autoComplete="off"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="ısı yalıtımı uygulaması"
              className="input mt-1.5 w-full"
              maxLength={80}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            type="submit"
            disabled={!hydrated || busy || waiting || !sector}
            className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <Search className="w-4 h-4" aria-hidden />
            )}
            {busy
              ? 'Hazırlanıyor…'
              : waiting
                ? `Bekleyin (${countdown} sn)`
                : url.trim()
                  ? 'Soruları getir ve sayfamı kontrol et'
                  : 'Soruları getir'}
          </button>
          <p className="text-[11.5px] text-ink-faint leading-relaxed">
            Site adresi vermeden de çalışır: sektörünüzü seçin, müşterinizin yazdığı cümleleri görün. Adres verirseniz
            yalnızca <strong className="font-medium text-ink-muted">girdiğiniz o sayfa</strong> okunur.
          </p>
        </div>

        <p className="text-[11.5px] text-ink-faint mt-3 leading-relaxed">
          Şehir ve hizmet adı sunucuya gönderilmez; yalnızca soru cümlelerini sizin dilinize yaklaştırmak ve aşağıdaki
          kalıpları kurmak için tarayıcınızda kullanılır. Kayıt, e-posta veya kart gerekmez.
        </p>
      </form>

      <div aria-live="polite" className="mt-4">
        {state.status === 'loading' && (
          <div className="card p-5 flex items-center gap-3" role="status">
            <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-hidden />
            <div>
              <div className="text-[13.5px]">{state.withSite ? 'Sayfanız okunuyor…' : 'Sorular hazırlanıyor…'}</div>
              <div className="text-[12px] text-ink-faint mt-0.5">
                {state.withSite
                  ? 'Girdiğiniz sayfanın metni indiriliyor ve her sorunun ipuçları orada aranıyor.'
                  : 'Sektörünüzün soru bankası aşamalara göre diziliyor.'}
              </div>
            </div>
          </div>
        )}
        {state.status === 'error' && (
          <InlineAlert tone={state.code === 'rate_limited' ? 'warning' : 'error'}>
            {state.message}
            {state.code === 'rate_limited' && waiting && <> Yeniden deneme: {countdown} sn.</>}
          </InlineAlert>
        )}
      </div>

      {state.status === 'done' && (
        <div className="mt-6 space-y-6">
          <Results data={state.data} city={city} service={service} />

          {prompts.length > 0 && <LocalPrompts prompts={prompts} />}

          {isCoverage(state.data) && state.data.reportUrl && (
            <div className="card p-4 sm:p-5">
              <div className="eyebrow mb-2">Kalıcı rapor bağlantısı</div>
              <p className="text-[12.5px] text-ink-muted mb-3">
                Bu sonuç 30 gün boyunca aynı bağlantıdan açılır; yeniden kontrol gerektirmez.
              </p>
              <ShareReportButtons
                url={state.data.reportUrl}
                text={`${state.data.hostname} — müşteri sorularının sayfadaki karşılığı`}
              />
            </div>
          )}

          <div className="card p-4 sm:p-5 bg-paper-2/60">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-display text-[17px] tracking-tight">Bu cevapları sitenize kim yazacak?</div>
                <p className="text-[13px] text-ink-muted mt-1 max-w-xl">
                  Listeyi alıp kendiniz yazabilirsiniz. İsterseniz Yanıt Agency soruları sayfa planına çevirir,
                  metinleri yazar ve sonucu aynı ölçümle takip eder.
                </p>
              </div>
              <Link href="/yanit-agency" className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap">
                Yanıt Agency <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </div>

          {shareUrl && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={copyShare}
                className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]"
              >
                {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Link2 className="w-3.5 h-3.5" aria-hidden />}
                {copied ? 'Bağlantı kopyalandı' : 'Bu listenin bağlantısını kopyala'}
              </button>
              <span className="text-[11.5px] text-ink-faint break-all">{shareUrl}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── sonuç ────────────────────────── */

function Results({ data, city, service }: { data: Payload; city: string; service: string }) {
  const coverage = isCoverage(data) ? data : null;
  const measured = !!coverage && !coverage.unreachable;
  const sectorName = SECTORS.find((s) => s.slug === data.sector)?.name ?? data.sector;

  return (
    <div className="space-y-6">
      {coverage?.unreachable && (
        <InlineAlert tone="warning">
          <strong className="font-medium">{coverage.findings[0]?.title ?? 'Adrese ulaşılamadı'}</strong>{' '}
          {coverage.findings[0]?.detail} Oran ya da skor üretmiyoruz; aşağıda yalnızca {sectorName} sektörünün soru
          bankası var. {coverage.findings[0]?.fix}
        </InlineAlert>
      )}

      {measured && coverage ? (
        <CoverageSummary result={coverage} sectorName={sectorName} />
      ) : (
        <div className="card p-5 sm:p-6">
          <div className="eyebrow mb-2">
            {sectorName} · {data.total} soru
          </div>
          <h2 className="font-display text-[22px] sm:text-[26px] tracking-tight leading-tight">
            Müşteriniz satın almadan önce bunları soruyor.
          </h2>
          <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{data.note}</p>
          {!coverage && (
            <p className="text-[12.5px] text-ink-faint mt-4">
              Site adresi girip tekrar çalıştırırsanız, aynı listeyi girdiğiniz sayfadaki karşılıklarıyla birlikte
              görürsünüz.
            </p>
          )}
        </div>
      )}

      {STAGE_ORDER.map((stage) => {
        const items = data.questions.filter((q) => q.stage === stage);
        if (!items.length) return null;
        const summary = data.stages.find((s) => s.stage === stage);
        return (
          <section key={stage} aria-labelledby={`qb-${stage}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h3 id={`qb-${stage}`} className="font-display text-[18px] tracking-tight">
                {STAGE_LABELS[stage]}
                <span className="text-ink-faint font-sans text-[13px] ml-2">{items.length} soru</span>
              </h3>
              {measured && summary && (
                <span className="text-[12px] text-ink-muted">
                  {summary.covered} var · {summary.partial} kısmen · {summary.missing} yok
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {items.map((q) => (
                <QuestionCard key={q.index} q={q} city={city} service={service} measured={measured} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CoverageSummary({ result, sectorName }: { result: QuestionCoverageResult; sectorName: string }) {
  const s = result.summary;
  if (!s) return null;
  const weakest = result.stages.find((x) => x.stage === s.weakestStage);
  const first = s.firstThree
    .map((i) => result.questions.find((q) => q.index === i))
    .filter((q): q is CoverageQuestion => !!q);
  const when = (() => {
    const d = new Date(result.fetchedAt);
    return Number.isNaN(d.getTime())
      ? result.fetchedAt
      : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
  })();

  return (
    <div className="card p-5 sm:p-6 space-y-5">
      <div>
        <div className="eyebrow mb-2">{sectorName} · girdiğiniz sayfa</div>
        <h2 className="font-display text-[22px] sm:text-[26px] tracking-tight leading-tight">
          {result.total} sorudan <span className="text-brand tabular">{s.covered}</span> tanesinde bu sayfada tam
          karşılık var.
        </h2>
        <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
          {s.partial} soruda kısmen karşılık bulundu, {s.missing} soruda sayfada hiçbir ipucu geçmiyor.
          {weakest && (
            <>
              {' '}
              En zayıf aşama: <strong className="font-medium text-ink">{weakest.label}</strong> (%{weakest.ratio}).
            </>
          )}
        </p>
        <p className="text-[11.5px] text-ink-faint mt-3 break-all">
          {result.hostname} · {when} · tek sayfa okundu, site geneli taranmadı
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {result.stages.map((st) => (
          <div key={st.stage} className="border border-hairline rounded-lg p-3">
            <div className="text-[12px] text-ink-muted">{st.label}</div>
            <div className="font-display text-[20px] tracking-tight mt-1 tabular">
              {st.covered}/{st.total}
            </div>
            <div className="text-[11.5px] text-ink-faint mt-0.5">
              kısmen {st.partial} · yok {st.missing}
            </div>
          </div>
        ))}
      </div>

      {first.length > 0 && (
        <div className="band rounded-lg p-4">
          <div className="eyebrow mb-3">Önce şu {first.length} soruya cevap yazın</div>
          <ol className="space-y-2.5">
            {first.map((q, i) => (
              <li key={q.index} className="flex gap-3 text-[13.5px] leading-relaxed">
                <span className="shrink-0 font-mono text-[12px] text-brand mt-0.5">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  {q.q}
                  <span className="block text-[12px] text-ink-faint mt-0.5">
                    Cevabı vermesi gereken sayfa: {q.answeredBy}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="text-[12px] text-ink-faint leading-relaxed">
        Bu sonuç “bu sorularda çıkarsınız” demez; yalnızca girdiğiniz sayfada bu soruların karşılığının olup olmadığını
        gösterir. Kural: bir sorunun ipuçlarının hepsi sayfada geçiyorsa “var”, en az biri geçiyorsa “kısmen”, hiçbiri
        geçmiyorsa “yok”.
      </p>
    </div>
  );
}

function QuestionCard({
  q,
  city,
  service,
  measured,
}: {
  q: CoverageQuestion;
  city: string;
  service: string;
  measured: boolean;
}) {
  const meta = measured && q.status ? STATUS_META[q.status] : null;
  const Icon = meta?.icon;
  return (
    <article className="card p-4 sm:p-5 h-full flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14.5px] leading-relaxed break-words">{fillPlaceholders(q.q, city, service)}</p>
        {meta && Icon && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${meta.className}`}
            title={`İpuçları: ${q.signals.join(', ')}`}
          >
            <Icon className="w-3 h-3" aria-hidden />
            {meta.label}
          </span>
        )}
      </div>
      <div className="text-[12.5px] text-ink-muted leading-relaxed">
        <span className="text-ink-faint">Cevabı hangi sayfa vermeli:</span> {q.answeredBy}
      </div>
      <div className="text-[12.5px] text-ink-muted leading-relaxed">
        <span className="text-ink-faint">Neden önemli:</span> {q.why}
      </div>
      <div className="mt-auto pt-1 flex flex-wrap gap-1.5">
        {(measured ? q.missing : q.signals).map((sig) => (
          <span key={sig} className="chip !text-[10.5px]">
            {sig}
          </span>
        ))}
      </div>
      <div className="text-[11px] text-ink-faint">
        {measured
          ? q.missing.length === 0
            ? 'Bütün ipuçları sayfada geçiyor.'
            : `Sayfada geçmeyen sözler (${q.missing.length}/${q.signals.length}).`
          : 'Sayfanızda geçmesi beklenen sözler.'}
      </div>
    </article>
  );
}

function LocalPrompts({ prompts }: { prompts: string[] }) {
  return (
    <section aria-labelledby="qb-yerel" className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-3.5 h-3.5 text-brand" aria-hidden />
        <h3 id="qb-yerel" className="font-display text-[18px] tracking-tight">
          Kendi sözlerinizle kurulmuş kalıplar
        </h3>
      </div>
      <p className="text-[12.5px] text-ink-muted leading-relaxed">
        Bu cümleler soru bankasından değil, girdiğiniz şehir ve hizmet adından üretildi. Ölçüme girmezler; sayfa
        başlıklarınızı ve SSS maddelerinizi yazarken kullanabilirsiniz.
      </p>
      <ul className="mt-4 space-y-2">
        {prompts.map((p) => (
          <li key={p} className="text-[13.5px] leading-relaxed flex gap-2.5">
            <span className="text-brand mt-0.5 shrink-0" aria-hidden>
              —
            </span>
            <span className="break-words">{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
