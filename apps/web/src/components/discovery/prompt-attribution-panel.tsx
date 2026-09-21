'use client';

/**
 * Prompt attribution paneli — ÜÇ KAYNAK GÖRSEL OLARAK AYRI.
 *
 * Ürün sözü: AI platformları gerçek kullanıcı promptunu siteye göndermez. Bu yüzden burada
 * "ziyaretçi şunu sordu" iddiası yalnızca ziyaretçinin kendi bildirimi (USER_REPORTED) için
 * yapılır. Tahmin (INFERRED) her zaman güven yüzdesi ve kanıt listesiyle birlikte gösterilir;
 * eşiğin altındaki tahminler hiç kaydedilmediği için burada da HİÇ satır çıkmaz. Kendi
 * ölçümümüz (SYNTHETIC) ziyaretçi verisi gibi sunulmaz.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Bot, Gauge, Info, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import type { AttributionGroup, AttributionListResult } from '@/server/discovery/attribution';
import type { AttributionSource } from '@independentai/db';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useRealtimeEvent } from '@/components/realtime-provider';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';

const POLL_MS = 60_000;

const SOURCE_STYLE: Record<
  AttributionSource,
  { icon: typeof UserRound; ring: string; chip: string; bar: string; empty: string }
> = {
  USER_REPORTED: {
    icon: UserRound,
    ring: 'border-positive/25 bg-positive/[0.04]',
    chip: 'bg-positive/10 text-positive border-positive/20',
    bar: 'bg-positive',
    empty:
      'Henüz gönüllü bildirim yok. Bu satırlar yalnızca ziyaretçi mini formu sitenizde açıkken ve ziyaretçi kendisi yazdığında dolar — tahminle doldurulmaz.',
  },
  INFERRED: {
    icon: Gauge,
    ring: 'border-brand/25 bg-brand-glow/40',
    chip: 'bg-brand-glow text-brand-deep border-brand/20',
    bar: 'bg-brand',
    empty:
      'Eşiği geçen tahmin yok. Sinyaller (atıf eşleşmesi, metin örtüşmesi, hedef uyumu, sağlayıcı görünürlüğü) yeterli puana ulaşmadı; düşük güvenli tahmin göstermek yerine hiçbir şey göstermiyoruz.',
  },
  SYNTHETIC: {
    icon: Bot,
    ring: 'border-hairline bg-paper-3',
    chip: 'bg-paper-4 text-ink-muted border-hairline',
    empty: 'Bu dönemde başarılı ölçüm (ModelRun) yok. Sorularınız çalıştıkça bu liste dolar.',
    bar: 'bg-ink-faint',
  },
};

function ConfidenceBar({ value, tone }: { value: number; tone: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-2 shrink-0" title={`Güven: %${pct}`}>
      <div className="w-14 h-1.5 rounded-full bg-hairline overflow-hidden" aria-hidden>
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11.5px] tabular-nums text-ink-muted w-9 text-right">%{pct}</span>
    </div>
  );
}

function GroupBlock({ group }: { group: AttributionGroup }) {
  const style = SOURCE_STYLE[group.source];
  const Icon = style.icon;
  const isSynthetic = group.source === 'SYNTHETIC';

  return (
    <section className={`rounded-xl border ${style.ring} p-4`} aria-label={group.label}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 shrink-0" aria-hidden />
            <h4 className="text-[14px] font-medium">{group.label}</h4>
            <span className={`text-[11px] px-1.5 py-0.5 rounded border ${style.chip}`}>{group.total}</span>
          </div>
          <p className="text-[12px] text-ink-muted mt-1 leading-relaxed">{group.description}</p>
        </div>
        {group.avgConfidence !== null && group.total > 0 && (
          <div className="text-right shrink-0">
            <div className="text-[11px] text-ink-faint">{isSynthetic ? 'Ort. görünürlük' : 'Ort. güven'}</div>
            <div className="text-[15px] tabular-nums">%{group.avgConfidence}</div>
          </div>
        )}
      </div>

      {group.intents.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {group.intents.map((i) => (
            <span key={i.intent} className={`text-[11px] px-1.5 py-0.5 rounded border ${style.chip}`}>
              {i.label} · {i.count}
            </span>
          ))}
        </div>
      )}

      {group.total === 0 ? (
        <p className="mt-3 text-[12.5px] text-ink-muted leading-relaxed border-t border-hairline pt-3">{style.empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {group.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-hairline bg-paper p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] text-ink break-words">
                    {item.reportedText ?? item.promptText ?? 'Soru metni eşleştirilemedi'}
                  </div>
                  <div className="text-[11.5px] text-ink-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{item.intentLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{item.providerLabel}</span>
                    {item.reportedText && item.promptText && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-ink-faint">eşleşen soru: {item.promptText}</span>
                      </>
                    )}
                  </div>
                </div>
                <ConfidenceBar value={item.confidence} tone={style.bar} />
              </div>

              {item.evidence.length > 0 && (
                <details className="mt-2 group">
                  <summary className="text-[11.5px] text-brand cursor-pointer list-none inline-flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" aria-hidden />
                    Neden böyle düşünüyoruz?
                  </summary>
                  <ul className="mt-2 space-y-1 border-l-2 border-hairline pl-3">
                    {item.evidence.map((s, idx) => (
                      <li key={`${item.id}-${idx}`} className="text-[11.5px] text-ink-muted flex gap-2">
                        <span className="tabular-nums text-ink-faint w-8 shrink-0">
                          {s.points > 0 ? `+${s.points}` : '+0'}
                        </span>
                        <span className="min-w-0">
                          {s.label}
                          {s.detail ? <span className="text-ink-faint"> — {s.detail}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {group.source === 'USER_REPORTED' && !item.reportedText && (
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  Ziyaretçi metin yazmadı; yalnızca AI ürünü ve niyet seçildi.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PromptAttributionPanel({
  siteId,
  days = 30,
  canWrite = false,
  className = '',
}: {
  siteId?: string | null;
  days?: number;
  canWrite?: boolean;
  className?: string;
}) {
  const hydrated = useHydrated();
  const [data, setData] = useState<AttributionListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lastLoad = useRef(0);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ days: String(days) });
    if (siteId) q.set('siteId', siteId);
    try {
      lastLoad.current = Date.now();
      const res = await apiFetch<AttributionListResult>(`/api/discovery/attribution?${q.toString()}`);
      setData(res);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Attribution verisi alınamadı'));
    } finally {
      setLoading(false);
    }
  }, [days, siteId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  // Polling yedeği ZORUNLU: canlı bağlantı yoksa da panel tazelenir.
  useEffect(() => {
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Canlı olay geldiğinde en fazla 10 saniyede bir yenile (olay başına istek atma).
  useRealtimeEvent('discovery.updated', () => {
    if (Date.now() - lastLoad.current < 10_000) return;
    void load();
  });

  async function runInference() {
    if (!siteId || running) return;
    setRunning(true);
    setNotice(null);
    try {
      const res = await apiFetch<{ scanned: number; created: number; updated: number; belowThreshold: number }>(
        `/api/discovery/attribution?siteId=${encodeURIComponent(siteId)}`,
        { method: 'POST' },
      );
      setNotice(
        `${res.scanned} oturum tarandı · ${res.created} yeni, ${res.updated} güncellenen tahmin · ${res.belowThreshold} oturum eşiğin altında kaldığı için kaydedilmedi.`,
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Tahmin çalıştırılamadı'));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={`card p-5 sm:p-6 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" aria-hidden />
            <h3 className="font-display text-[16px]">Ziyaretçi hangi soruyla geldi?</h3>
          </div>
          <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">
            AI ürünleri kullanıcının gerçek sorusunu sitenize göndermez. Bu yüzden üç kaynağı ayrı gösteriyoruz:
            ziyaretçinin kendi bildirimi, açıklanabilir tahmin ve bizim kendi ölçümümüz.
          </p>
        </div>
        {siteId && canWrite && (
          <button
            type="button"
            onClick={runInference}
            disabled={!hydrated || running}
            className="btn-secondary text-[12.5px] shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} aria-hidden />
            {running ? 'Hesaplanıyor…' : 'Tahminleri yenile'}
          </button>
        )}
      </div>

      {error && (
        <InlineAlert tone="error" className="mt-4">
          {error}
        </InlineAlert>
      )}
      {notice && (
        <InlineAlert tone="info" className="mt-4">
          {notice}
        </InlineAlert>
      )}

      {loading && !data ? (
        <p className="mt-4 text-[13px] text-ink-muted">Yükleniyor…</p>
      ) : !data ? null : (
        <>
          <div className="mt-4 flex items-center gap-2 text-[11.5px] text-ink-faint">
            <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
            Tahmin eşiği: %{data.minConfidence} — altındaki hiçbir tahmin kaydedilmez ve gösterilmez.
          </div>
          <div className="mt-3 space-y-3">
            {data.groups.map((g) => (
              <GroupBlock key={g.source} group={g} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
