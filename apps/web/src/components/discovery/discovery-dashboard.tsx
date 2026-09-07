'use client';

/**
 * AI Trafiği paneli — üç ölçümün kesin ayrımı üzerine kurulu.
 *
 *  1) AI kaynaklı ziyaret  → gerçek insan, tarayıcı SDK'sı, referrer kanıtlı
 *  2) AI crawler isteği    → sunucu/edge kaydı; ziyaret, öneri veya satış DEĞİL
 *  3) Sentetik ölçüm       → bizim çalıştırdığımız görünürlük testleri; gerçek trafik değil
 *
 * Bu üç sayı hiçbir yerde toplanmaz. Bilinmeyen değer uydurulmaz: veri yoksa "—" veya boş durum
 * gösterilir. Sepet/ürün/ciro kartları yalnızca e-ticaret bağlamında görünür.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  ExternalLink,
  Flag,
  Loader2,
  Radar,
  RefreshCw,
  ShoppingCart,
  Target,
  Users,
} from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { formatRelative } from '@/lib/format-relative';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useRealtimeEvent, useRealtimeStatus } from '@/components/realtime-provider';
import { SiteManager } from './site-manager';
import { GoalManager } from './goal-manager';
import { PromptAttributionPanel } from './prompt-attribution-panel';
import {
  BOT_PURPOSE_LABELS,
  EVENT_TYPE_LABELS,
  GOAL_TYPE_LABELS,
  RANGE_DAYS,
  SITE_KIND_LABELS,
  SOURCE_CLASS_LABELS,
  labelOf,
  money,
  num,
  ratio,
  showCommerceCards,
  type DiscoveryOverview,
  type OverviewResponse,
  type RangeDays,
  type SessionsPage,
} from './types';

const POLL_MS = 30_000;
const REFRESH_DEBOUNCE_MS = 3_000;
const SESSION_PAGE = 15;

type Tab = 'measure' | 'install' | 'goals';
const TABS: { key: Tab; label: string }[] = [
  { key: 'measure', label: 'Ölçüm' },
  { key: 'install', label: 'Kurulum' },
  { key: 'goals', label: 'Hedefler' },
];

export function DiscoveryDashboard({ initial, canWrite }: { initial: DiscoveryOverview; canWrite: boolean }) {
  const hydrated = useHydrated();
  const { status } = useRealtimeStatus();
  const live = status === 'live';

  const [overview, setOverview] = useState<DiscoveryOverview>(initial);
  const [siteId, setSiteId] = useState<string | null>(initial.siteId);
  const [days, setDays] = useState<RangeDays>(30);
  // Hiçbir site veri göndermiyorsa kurulum sekmesiyle aç: boş grafik göstermek yerine eksiği anlat.
  const [tab, setTab] = useState<Tab>(initial.sites.some((s) => s.health.browser === 'ok') ? 'measure' : 'install');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessions, setSessions] = useState<SessionsPage | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ days: String(days) });
      if (siteId) qs.set('siteId', siteId);
      const r = await apiFetch<OverviewResponse>(`/api/discovery/overview?${qs.toString()}`);
      setOverview(r.overview);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Veriler yüklenemedi'));
    } finally {
      setLoading(false);
    }
  }, [days, siteId]);

  const loadSessions = useCallback(async () => {
    setSessionsError(null);
    try {
      const qs = new URLSearchParams({ limit: String(SESSION_PAGE) });
      if (siteId) qs.set('siteId', siteId);
      setSessions(await apiFetch<SessionsPage>(`/api/discovery/sessions?${qs.toString()}`));
    } catch (err) {
      setSessionsError(errorMessage(err, 'Oturumlar yüklenemedi'));
    }
  }, [siteId]);

  /**
   * İlk özet sunucudan geldi (`initial`): aynı site/aralık için tekrar istek atma.
   * Seçim değişince özet + oturumlar yeniden yüklenir.
   */
  const loadedKey = useRef(`${initial.siteId ?? ''}|30`);
  useEffect(() => {
    const key = `${siteId ?? ''}|${days}`;
    if (key !== loadedKey.current) {
      loadedKey.current = key;
      void load();
    }
    void loadSessions();
  }, [load, loadSessions, days, siteId]);

  // Tek site varsa otomatik seç: hedefler ve kurulum siteye özeldir, kullanıcıyı seçim yapmaya zorlama.
  useEffect(() => {
    if (!siteId && overview.sites.length === 1) setSiteId(overview.sites[0]?.id ?? null);
  }, [overview.sites, siteId]);

  /** Realtime olayları kısa aralıkta yığılabilir → tek tazelemeye indir. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) return;
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      void load();
      void loadSessions();
    }, REFRESH_DEBOUNCE_MS);
  }, [load, loadSessions]);

  useRealtimeEvent('discovery.updated', scheduleRefresh);
  useRealtimeEvent('discovery.goal', scheduleRefresh);
  useRealtimeEvent('sensor.health', scheduleRefresh);
  useEffect(() => () => (refreshTimer.current ? clearTimeout(refreshTimer.current) : undefined), []);

  // Canlı bağlantı yoksa 30 sn'de bir tazele (polling fallback ZORUNLU).
  useEffect(() => {
    if (live) return;
    const id = setInterval(() => {
      void load();
      void loadSessions();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [live, load, loadSessions]);

  async function loadMoreSessions() {
    if (!sessions?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({ limit: String(SESSION_PAGE), cursor: sessions.nextCursor });
      if (siteId) qs.set('siteId', siteId);
      const page = await apiFetch<SessionsPage>(`/api/discovery/sessions?${qs.toString()}`);
      setSessions((prev) => {
        const known = new Set((prev?.items ?? []).map((i) => i.id));
        return {
          items: [...(prev?.items ?? []), ...page.items.filter((i) => !known.has(i.id))],
          nextCursor: page.nextCursor,
        };
      });
    } catch (err) {
      setSessionsError(errorMessage(err, 'Daha fazla oturum yüklenemedi'));
    } finally {
      setLoadingMore(false);
    }
  }

  const site = useMemo(() => overview.sites.find((s) => s.id === siteId) ?? null, [overview.sites, siteId]);
  const commerce = showCommerceCards(site?.siteKind ?? null, overview.goals, overview.events);

  if (overview.sites.length === 0) {
    return (
      <div className="space-y-5">
        <InlineAlert tone="info">
          AI Trafiği ölçümü için önce bir site ekleyin. Snippet yayına girdikten sonra AI ürünlerinden gelen ziyaretler
          ve AI crawler istekleri <b>ayrı ayrı</b> raporlanır.
        </InlineAlert>
        <SiteManager canWrite={canWrite} onChanged={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Kontroller */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="min-w-0">
          <label htmlFor="discovery-site" className="text-[12px] text-ink-muted block mb-1.5">
            İzlenen site
          </label>
          <select
            id="discovery-site"
            className="input sm:w-[280px]"
            value={siteId ?? ''}
            onChange={(e) => setSiteId(e.target.value || null)}
          >
            <option value="">Tüm siteler</option>
            {overview.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.domain}
              </option>
            ))}
          </select>
          {site && (
            <p className="text-[11px] text-ink-faint mt-1">
              {labelOf(SITE_KIND_LABELS, site.siteKind, 'Tür seçilmedi')} · gösterilen kartlar site türüne göre seçilir
            </p>
          )}
        </div>
        <div>
          <span id="discovery-range-label" className="text-[12px] text-ink-muted block mb-1.5">
            Zaman aralığı
          </span>
          <div className="flex gap-1" role="group" aria-labelledby="discovery-range-label">
            {RANGE_DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={`rounded-lg border px-3 py-2 text-[12.5px] transition ${
                  days === d ? 'bg-brand text-white border-brand' : 'border-hairline hover:bg-paper-2'
                }`}
              >
                {d} gün
              </button>
            ))}
          </div>
        </div>
        <span className="flex-1" />
        <div className="flex items-center gap-2 text-[12px] text-ink-faint" aria-live="polite">
          {loading && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> yenileniyor
            </span>
          )}
          {!live && !loading && <span title="Canlı bağlantı yok; 30 saniyede bir yenileniyor">30 sn’de yenilenir</span>}
          <button
            type="button"
            onClick={() => {
              void load();
              void loadSessions();
            }}
            disabled={!hydrated || loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-[12.5px] hover:bg-paper-2 transition disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden /> Yenile
          </button>
        </div>
      </div>

      {error && (
        <div className="space-y-2">
          <InlineAlert>{error}</InlineAlert>
          <button type="button" className="btn-secondary !py-1.5 !px-3 text-[12.5px]" onClick={() => void load()}>
            Tekrar dene
          </button>
        </div>
      )}

      {/* Sekmeler */}
      <div className="border-b border-hairline">
        <div role="tablist" aria-label="AI trafiği bölümleri" className="flex gap-1 overflow-x-auto">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`discovery-tab-${t.key}`}
              aria-selected={tab === t.key}
              aria-controls={`discovery-panel-${t.key}`}
              tabIndex={tab === t.key ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                e.preventDefault();
                const next = TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]!;
                setTab(next.key);
                document.getElementById(`discovery-tab-${next.key}`)?.focus();
              }}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[13.5px] border-b-2 -mb-px whitespace-nowrap transition ${
                tab === t.key ? 'border-brand text-ink' : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        role="tabpanel"
        id="discovery-panel-measure"
        aria-labelledby="discovery-tab-measure"
        hidden={tab !== 'measure'}
      >
        {tab === 'measure' && (
          <MeasurePanel
            overview={overview}
            commerce={commerce}
            siteId={siteId}
            days={days}
            canWrite={canWrite}
            sessions={sessions}
            sessionsError={sessionsError}
            loadingMore={loadingMore}
            hydrated={hydrated}
            onLoadMore={() => void loadMoreSessions()}
            onRetrySessions={() => void loadSessions()}
          />
        )}
      </div>

      <div
        role="tabpanel"
        id="discovery-panel-install"
        aria-labelledby="discovery-tab-install"
        hidden={tab !== 'install'}
      >
        {tab === 'install' && <SiteManager canWrite={canWrite} onChanged={() => void load()} />}
      </div>

      <div role="tabpanel" id="discovery-panel-goals" aria-labelledby="discovery-tab-goals" hidden={tab !== 'goals'}>
        {tab === 'goals' &&
          (siteId ? (
            <GoalManager siteId={siteId} canWrite={canWrite} onChanged={() => void load()} />
          ) : (
            <InlineAlert tone="info">
              Hedefler siteye özeldir. Yukarıdan tek bir site seçin, sonra hedeflerini tanımlayın.
            </InlineAlert>
          ))}
      </div>
    </div>
  );
}

function MeasurePanel({
  overview,
  commerce,
  siteId,
  days,
  canWrite,
  sessions,
  sessionsError,
  loadingMore,
  hydrated,
  onLoadMore,
  onRetrySessions,
}: {
  overview: DiscoveryOverview;
  commerce: boolean;
  siteId: string | null;
  days: number;
  canWrite: boolean;
  sessions: SessionsPage | null;
  sessionsError: string | null;
  loadingMore: boolean;
  hydrated: boolean;
  onLoadMore: () => void;
  onRetrySessions: () => void;
}) {
  const ai = overview.channels.aiReferralSessions;
  const commerceEvents = overview.events.filter((e) => ['PRODUCT_VIEW', 'ADD_TO_CART', 'PURCHASE'].includes(e.type));
  const purchaseGoals = overview.goals.filter((g) => g.type === 'PURCHASE');
  const revenue = purchaseGoals.reduce((acc, g) => acc + (g.value ?? 0), 0);
  const currency = purchaseGoals.find((g) => g.currency)?.currency ?? null;

  return (
    <div className="space-y-5">
      {/* Üç kanalın kesin ayrımı */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChannelCard
          icon={Users}
          title="AI kaynaklı ziyaret"
          badge="gerçek insan"
          value={ai}
          unit="oturum"
          tone="brand"
          description="AI ürününden (ChatGPT, Claude, Perplexity…) gelen referrer ile ölçülen gerçek tarayıcı oturumları. Çerezsiz, kısa ömürlü gruplamadır: benzersiz kişi sayısı değildir."
        />
        <ChannelCard
          icon={Bot}
          title="AI crawler isteği"
          badge="ziyaret değil"
          value={overview.channels.crawlerHits}
          unit="istek"
          tone="neutral"
          description="AI botlarının sunucunuza yaptığı HTTP istekleri. İnsan ziyareti, öneri veya satış anlamına gelmez; yalnızca içeriğinizin alındığını gösterir."
        />
        <ChannelCard
          icon={Radar}
          title="Sentetik görünürlük ölçümü"
          badge="bizim testimiz"
          value={overview.channels.syntheticRuns}
          unit="çalıştırma"
          tone="neutral"
          description="Independent AI’ın sizin adınıza çalıştırdığı prompt ölçümleri. Gerçek kullanıcı trafiği değildir; markanızın yanıtlarda görünürlüğünü test eder."
        />
      </div>

      {/* Huni */}
      <section className="card p-5" aria-labelledby="discovery-funnel">
        <h2 id="discovery-funnel" className="font-display text-[17px]">
          AI ziyaretinden hedefe
        </h2>
        <p className="text-[12.5px] text-ink-muted mt-1">
          Yalnızca AI kaynaklı oturumlar sayılır. “Etkileşim” birden fazla olay üreten oturumdur.
        </p>
        <ol className="mt-4 space-y-2">
          {overview.funnel.map((f) => (
            <li key={f.stage}>
              <div className="flex items-center justify-between text-[13px]">
                <span>{f.label}</span>
                <span className="tabular text-ink-muted">
                  {num(f.count)}{' '}
                  {f.stage !== 'ai_visit' && <span className="text-ink-faint">· {ratio(f.count, ai)}</span>}
                </span>
              </div>
              <div className="h-2 rounded-full bg-paper-4 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-brand transition-all"
                  style={{ width: ai > 0 ? `${Math.max(2, Math.round((f.count / ai) * 100))}%` : '0%' }}
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sağlayıcı dağılımı */}
        <Panel
          title="AI sağlayıcı dağılımı"
          icon={Activity}
          empty={overview.byProvider.length === 0}
          emptyText="Henüz AI kaynaklı ziyaret ölçülmedi."
        >
          <table className="w-full text-[13px]">
            <caption className="sr-only">AI sağlayıcısına göre oturum ve dönüşüm</caption>
            <thead>
              <tr className="text-[11.5px] text-ink-faint uppercase tracking-wide">
                <th scope="col" className="text-left font-normal py-1.5">
                  Sağlayıcı
                </th>
                <th scope="col" className="text-right font-normal py-1.5">
                  Oturum
                </th>
                <th scope="col" className="text-right font-normal py-1.5">
                  Dönüşüm
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {overview.byProvider.map((p) => (
                <tr key={p.provider}>
                  <td className="py-2">{p.label}</td>
                  <td className="py-2 text-right tabular">{num(p.sessions)}</td>
                  <td className="py-2 text-right tabular">{num(p.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Giriş sayfaları */}
        <Panel
          title="En çok giriş alan sayfalar"
          icon={ExternalLink}
          empty={overview.topLandingPages.length === 0}
          emptyText="Henüz AI kaynaklı giriş sayfası yok."
        >
          <table className="w-full text-[13px]">
            <caption className="sr-only">AI kaynaklı ziyaretlerin giriş sayfaları</caption>
            <thead>
              <tr className="text-[11.5px] text-ink-faint uppercase tracking-wide">
                <th scope="col" className="text-left font-normal py-1.5">
                  Yol
                </th>
                <th scope="col" className="text-right font-normal py-1.5">
                  Oturum
                </th>
                <th scope="col" className="text-right font-normal py-1.5">
                  Dönüşüm
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {overview.topLandingPages.map((l) => (
                <tr key={l.path}>
                  <td className="py-2 font-mono text-[12px] break-all">{l.path}</td>
                  <td className="py-2 text-right tabular">{num(l.sessions)}</td>
                  <td className="py-2 text-right tabular">{num(l.conversions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Prompt atfı (kullanıcı beyanı / çıkarım / sentetik ayrımı) */}
      <PromptAttributionPanel siteId={siteId} days={days} canWrite={canWrite} />

      {/* Kaynak kırılımı: AI dışı trafik ayrı gösterilir, AI sayılmaz */}
      <section className="card p-5" aria-labelledby="discovery-sources">
        <h2 id="discovery-sources" className="font-display text-[17px]">
          Tüm oturumların kaynağı
        </h2>
        <p className="text-[12.5px] text-ink-muted mt-1">
          Referrer yoksa trafik “doğrudan” sayılır; AI olduğu <b>tahmin edilmez</b>.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {(['AI_REFERRAL', 'ORGANIC', 'DIRECT', 'OTHER'] as const).map((k) => {
            const value =
              k === 'AI_REFERRAL'
                ? overview.sessions.aiReferral
                : k === 'ORGANIC'
                  ? overview.sessions.organic
                  : k === 'DIRECT'
                    ? overview.sessions.direct
                    : overview.sessions.other;
            return (
              <div key={k} className="rounded-xl border border-hairline p-3">
                <div className="text-[11.5px] text-ink-faint">{SOURCE_CLASS_LABELS[k]}</div>
                <div className="font-display text-[20px] tabular mt-0.5">{num(value)}</div>
                <div className="text-[11px] text-ink-faint">{ratio(value, overview.sessions.total)}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Hedefler */}
      <Panel
        title="Hedefler ve dönüşümler"
        icon={Target}
        empty={overview.goals.length === 0}
        emptyText="Henüz hedef tanımlanmadı. “Hedefler” sekmesinden ekleyin."
      >
        <table className="w-full text-[13px]">
          <caption className="sr-only">Tanımlı hedefler ve dönüşüm sayıları</caption>
          <thead>
            <tr className="text-[11.5px] text-ink-faint uppercase tracking-wide">
              <th scope="col" className="text-left font-normal py-1.5">
                Hedef
              </th>
              <th scope="col" className="text-left font-normal py-1.5">
                Tür
              </th>
              <th scope="col" className="text-right font-normal py-1.5">
                Dönüşüm
              </th>
              {commerce && (
                <th scope="col" className="text-right font-normal py-1.5">
                  Değer
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {overview.goals.map((g) => (
              <tr key={g.id}>
                <td className="py-2">{g.name}</td>
                <td className="py-2 text-ink-muted">{labelOf(GOAL_TYPE_LABELS, g.type)}</td>
                <td className="py-2 text-right tabular">{num(g.conversions)}</td>
                {commerce && <td className="py-2 text-right tabular">{money(g.value, g.currency)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      {/* E-ticaret kartı — yalnızca e-ticaret bağlamında */}
      {commerce && (
        <section className="card p-5" aria-labelledby="discovery-commerce">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-brand" aria-hidden />
            <h2 id="discovery-commerce" className="font-display text-[17px]">
              E-ticaret sinyalleri
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {['PRODUCT_VIEW', 'ADD_TO_CART', 'PURCHASE'].map((t) => (
              <div key={t} className="rounded-xl border border-hairline p-3">
                <div className="text-[11.5px] text-ink-faint">{EVENT_TYPE_LABELS[t]}</div>
                <div className="font-display text-[20px] tabular mt-0.5">
                  {num(commerceEvents.find((e) => e.type === t)?.count ?? 0)}
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-hairline p-3">
              <div className="text-[11.5px] text-ink-faint">Hedef değeri</div>
              <div className="font-display text-[20px] tabular mt-0.5">
                {purchaseGoals.length ? money(revenue, currency) : '—'}
              </div>
              <div className="text-[11px] text-ink-faint">yalnızca satın alma hedefleri</div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Olay tipleri */}
        <Panel
          title="Olay tipleri"
          icon={Activity}
          empty={overview.events.length === 0}
          emptyText="Henüz olay alınmadı."
        >
          <ul className="divide-y divide-hairline">
            {overview.events.map((e) => (
              <li key={e.type} className="py-2 flex items-center justify-between text-[13px]">
                <span>{labelOf(EVENT_TYPE_LABELS, e.type)}</span>
                <span className="tabular text-ink-muted">{num(e.count)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Varlıklar */}
        <Panel
          title="En çok görüntülenen içerik"
          icon={Flag}
          empty={overview.topEntities.length === 0}
          emptyText="İçerik etiketi gönderilmemiş (SDK’da entity alanı isteğe bağlıdır)."
        >
          <ul className="divide-y divide-hairline">
            {overview.topEntities.map((e) => (
              <li
                key={`${e.entityType}-${e.entityId}`}
                className="py-2 flex items-center justify-between gap-3 text-[13px]"
              >
                <span className="min-w-0 truncate">
                  {e.label ?? e.entityId ?? '—'}
                  {e.entityType && <span className="text-ink-faint"> · {e.entityType}</span>}
                </span>
                <span className="tabular text-ink-muted shrink-0">{num(e.views)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Crawler */}
      <section className="card p-5" aria-labelledby="discovery-crawler">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand" aria-hidden />
          <h2 id="discovery-crawler" className="font-display text-[17px]">
            AI crawler istekleri
          </h2>
        </div>
        <p className="text-[12.5px] text-ink-muted mt-1 max-w-3xl leading-relaxed">
          Bunlar <b>ziyaret değildir</b>. “Doğrulanmış” yalnızca operatörün IP aralığı, ters DNS veya imza ile
          kanıtlanan isteklerdir; kalanı <b>yalnızca user-agent iddiasıdır</b> ve taklit edilebilir.
          <code className="font-mono"> Google-Extended</code> / <code className="font-mono">Applebot-Extended</code>{' '}
          ayrı bir crawler değil, robots.txt izin token’ıdır: istek üretmez.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl border border-hairline p-3">
            <div className="text-[11.5px] text-ink-faint">Toplam istek</div>
            <div className="font-display text-[20px] tabular mt-0.5">{num(overview.crawler.total)}</div>
          </div>
          <div className="rounded-xl border border-hairline p-3">
            <div className="text-[11.5px] text-ink-faint">Doğrulanmış</div>
            <div className="font-display text-[20px] tabular mt-0.5">{num(overview.crawler.verified)}</div>
          </div>
          <div className="rounded-xl border border-hairline p-3">
            <div className="text-[11.5px] text-ink-faint">Doğrulanmamış</div>
            <div className="font-display text-[20px] tabular mt-0.5">{num(overview.crawler.unverified)}</div>
          </div>
        </div>
        {overview.crawler.total === 0 ? (
          <p className="text-[13px] text-ink-muted mt-4">
            Henüz crawler isteği kaydedilmedi. JavaScript çalıştırmayan botlar snippet ile görülemez: “Kurulum”
            sekmesinden sunucu/edge bağlantısını kurun.
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <caption className="sr-only">Bot bazında istek sayıları</caption>
                <thead>
                  <tr className="text-[11.5px] text-ink-faint uppercase tracking-wide">
                    <th scope="col" className="text-left font-normal py-1.5">
                      Bot
                    </th>
                    <th scope="col" className="text-left font-normal py-1.5">
                      Operatör
                    </th>
                    <th scope="col" className="text-left font-normal py-1.5">
                      Amaç
                    </th>
                    <th scope="col" className="text-right font-normal py-1.5">
                      İstek
                    </th>
                    <th scope="col" className="text-right font-normal py-1.5">
                      Doğrulanmış
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {overview.crawler.byBot.map((b) => (
                    <tr key={b.bot}>
                      <td className="py-2">
                        <span className="break-all">{b.bot}</span>
                        {b.verified === 0 && (
                          <span className="chip !text-[10px] !text-warning !border-warning/40 ml-1.5">
                            yalnızca user-agent iddiası
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-ink-muted">{b.operator ?? '—'}</td>
                      <td className="py-2 text-ink-muted">{labelOf(BOT_PURPOSE_LABELS, b.purpose)}</td>
                      <td className="py-2 text-right tabular">{num(b.hits)}</td>
                      <td className="py-2 text-right tabular">{num(b.verified)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <caption className="sr-only">Crawler’ların en çok istediği yollar</caption>
                <thead>
                  <tr className="text-[11.5px] text-ink-faint uppercase tracking-wide">
                    <th scope="col" className="text-left font-normal py-1.5">
                      En çok istenen yol
                    </th>
                    <th scope="col" className="text-right font-normal py-1.5">
                      İstek
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {overview.crawler.topPaths.map((p) => (
                    <tr key={p.path}>
                      <td className="py-2 font-mono text-[12px] break-all">{p.path}</td>
                      <td className="py-2 text-right tabular">{num(p.hits)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {overview.crawler.lastSeenAt && (
          <p className="text-[11.5px] text-ink-faint mt-3">
            Son crawler isteği: {formatRelative(overview.crawler.lastSeenAt)}
          </p>
        )}
      </section>

      {/* Son oturumlar */}
      <section className="card p-5" aria-labelledby="discovery-sessions">
        <h2 id="discovery-sessions" className="font-display text-[17px]">
          Son oturumlar
        </h2>
        <p className="text-[12.5px] text-ink-muted mt-1">
          Kişisel veri yoktur: yalnızca yol, içerik etiketi ve hedef bilgisi saklanır.
        </p>
        {sessionsError && (
          <div className="mt-3 space-y-2">
            <InlineAlert>{sessionsError}</InlineAlert>
            <button type="button" className="btn-secondary !py-1.5 !px-3 text-[12.5px]" onClick={onRetrySessions}>
              Tekrar dene
            </button>
          </div>
        )}
        {!sessions && !sessionsError && (
          <div className="py-6 flex justify-center" aria-busy="true">
            <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Oturumlar yükleniyor" />
          </div>
        )}
        {sessions && sessions.items.length === 0 && (
          <p className="text-[13px] text-ink-muted mt-4">Bu aralıkta kayıtlı oturum yok.</p>
        )}
        {sessions && sessions.items.length > 0 && (
          <>
            <ol className="divide-y divide-hairline mt-3" aria-live="polite" aria-relevant="additions">
              {sessions.items.map((s) => (
                <li key={s.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="chip !text-[10.5px]">
                        {s.sourceClass === 'AI_REFERRAL'
                          ? s.providerLabel
                          : labelOf(SOURCE_CLASS_LABELS, s.sourceClass)}
                      </span>
                      <span className="font-mono text-[12px] text-ink break-all">{s.landingPath}</span>
                      {s.convertedAt && (
                        <span className="chip !text-[10px] !text-positive !border-positive/30">
                          hedef: {s.goalName ?? 'dönüşüm'}
                        </span>
                      )}
                    </div>
                    <time dateTime={s.firstSeenAt} className="text-[11.5px] text-ink-faint tabular shrink-0">
                      {formatRelative(s.firstSeenAt)}
                    </time>
                  </div>
                  <div className="text-[11.5px] text-ink-faint mt-1">
                    {num(s.eventCount)} olay
                    {s.steps.length > 0 && (
                      <span> · {s.steps.map((st) => labelOf(EVENT_TYPE_LABELS, st.type)).join(' → ')}</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {sessions.nextCursor && (
              <div className="pt-3 flex justify-center">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={!hydrated || loadingMore}
                  aria-busy={loadingMore}
                  className="btn-secondary !py-1.5 !px-4 text-[12.5px] disabled:opacity-50"
                >
                  {loadingMore ? 'Yükleniyor…' : 'Daha fazla'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function ChannelCard({
  icon: Icon,
  title,
  badge,
  value,
  unit,
  description,
  tone,
}: {
  icon: typeof Users;
  title: string;
  badge: string;
  value: number;
  unit: string;
  description: string;
  tone: 'brand' | 'neutral';
}) {
  return (
    <section className="card p-5" aria-label={`${title} (${badge})`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${tone === 'brand' ? 'text-brand' : 'text-ink-muted'}`} aria-hidden />
        <h2 className="font-display text-[15px]">{title}</h2>
      </div>
      <span className="chip !text-[10px] mt-2">{badge}</span>
      <div className="font-display text-[30px] tabular mt-2">
        {num(value)} <span className="text-[13px] text-ink-faint font-sans">{unit}</span>
      </div>
      <p className="text-[12px] text-ink-muted mt-2 leading-relaxed">{description}</p>
    </section>
  );
}

function Panel({
  title,
  icon: Icon,
  empty,
  emptyText,
  children,
}: {
  title: string;
  icon: typeof Users;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand" aria-hidden />
        <h2 className="font-display text-[17px]">{title}</h2>
      </div>
      {empty ? (
        <p className="text-[13px] text-ink-muted mt-3">{emptyText}</p>
      ) : (
        <div className="mt-3 overflow-x-auto">{children}</div>
      )}
    </section>
  );
}
