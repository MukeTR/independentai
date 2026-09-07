'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Store, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';
import type { PreanalysisItem } from '@/lib/preanalysis-types';

/**
 * Ajans ön-analizi: 3 alan adı → GEO skoru + platform + ilk 3 bulgu. E-posta duvarı yok;
 * IP başına 3/saat (sunucu). Sonuç kaydedilmez.
 */
export function AgencyPreanalysis() {
  const hydrated = useHydrated();
  const ids = [useId(), useId(), useId()];
  const [domains, setDomains] = useState(['', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PreanalysisItem[] | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const list = domains.map((d) => d.trim()).filter(Boolean);
    if (!list.length || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const r = await apiFetch<{ results: PreanalysisItem[] }>('/api/tools/agency-preanalysis', {
        method: 'POST',
        json: { domains: list },
        timeoutMs: 90_000,
      });
      setResults(r.results);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-6 lg:p-8">
      <form onSubmit={run} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {domains.map((d, i) => (
            <div key={ids[i]}>
              <label htmlFor={ids[i]} className="sr-only">
                Alan adı {i + 1}
              </label>
              <input
                id={ids[i]}
                className="input"
                placeholder={i === 0 ? 'musteri1.com' : `musteri${i + 1}.com (opsiyonel)`}
                value={d}
                onChange={(e) => setDomains(domains.map((x, j) => (j === i ? e.target.value : x)))}
                maxLength={253}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={!hydrated || loading || !domains.some((d) => d.trim())}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
          aria-busy={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Search className="w-4 h-4" aria-hidden />
          )}
          {loading ? 'Analiz ediliyor (20-40 sn)…' : 'Ön-analizi başlat'}
        </button>
        <p className="text-[11.5px] text-ink-faint">
          Saatte 3 analiz · e-posta istenmez · sonuçlar kaydedilmez · yalnızca herkese açık sayfa sinyalleri.
        </p>
      </form>

      {error && <InlineAlert className="mt-4">{error}</InlineAlert>}

      {results && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4" aria-live="polite">
          {results.map((r) => (
            <article key={r.domain} className="rounded-xl border border-hairline p-4 bg-paper-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-[12.5px] truncate">{r.domain}</div>
                  <div className="text-[11px] text-ink-faint mt-0.5 inline-flex items-center gap-1">
                    <Store className="w-3 h-3" aria-hidden /> {r.platform.label}
                    {r.platform.platform !== 'UNKNOWN' && (
                      <span>· güven {Math.round(r.platform.confidence * 100)}%</span>
                    )}
                    {r.platform.connectorAvailable && (
                      <span className="chip own !text-[9.5px] !py-0 !px-1.5 ml-1">bağlayıcı var</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="eyebrow">GEO skoru</div>
                  <div
                    className={`font-display text-[28px] tabular leading-none ${r.score >= 70 ? 'text-positive' : r.score >= 40 ? 'text-warning' : 'text-danger'}`}
                  >
                    {r.score}
                  </div>
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {r.findings.map((f) => (
                  <li key={f.title} className="text-[12px] flex gap-2">
                    {f.status === 'fail' ? (
                      <XCircle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" aria-hidden />
                    ) : f.status === 'warn' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" aria-hidden />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-positive shrink-0 mt-0.5" aria-hidden />
                    )}
                    <span>
                      <span className="text-ink">{f.title}</span>
                      <span className="text-ink-faint"> — {f.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {!r.fetched && (
                <p className="text-[11px] text-warning mt-2">
                  Sayfa çekilemedi; platform tespiti yalnızca alan adına dayanıyor.
                </p>
              )}
            </article>
          ))}
        </div>
      )}

      {results && (
        <div className="mt-6 flex items-center justify-between gap-3 flex-wrap text-[13px]">
          <span className="text-ink-muted">
            Tam rapor, günlük izleme ve müşteri başına panel için ajans hesabı açın — lansman döneminde ücretsiz.
          </span>
          <Link href="/register" className="btn-primary !py-2 text-[13px] inline-flex items-center gap-1.5">
            Ajans hesabı aç <ArrowRight className="w-4 h-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
