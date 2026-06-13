'use client';

import { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type Finding = { category: string; status: 'pass' | 'warn' | 'fail'; title: string; detail: string; fix?: string };
type Result = {
  url: string;
  overallScore: number;
  breakdown: Record<string, number>;
  findings: Finding[];
};

const AXIS_LABELS: Record<string, string> = {
  answerFirst: 'Cevap-Öncelikli',
  citationAuthority: 'Kaynak Otoritesi',
  aiComprehension: 'AI Anlaşılabilirliği',
  technical: 'Teknik',
  freshness: 'Tazelik',
};

export function GeoAuditScanner({ defaultUrl = '' }: { defaultUrl?: string }) {
  const [url, setUrl] = useState(defaultUrl);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/tools/geo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Denetim başarısız');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  const grouped = result
    ? result.findings.reduce<Record<string, Finding[]>>((acc, f) => {
        (acc[f.category] ??= []).push(f);
        return acc;
      }, {})
    : {};

  return (
    <div>
      <form onSubmit={scan} className="flex gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://siteniz.com/sayfa"
          className="input flex-1"
        />
        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Taranıyor…' : 'Denetle'}
        </button>
      </form>

      {error && <div className="mt-4 text-[13px] text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</div>}

      {result && (
        <div className="mt-8">
          {/* Skor + breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-6 flex flex-col items-center justify-center text-center">
              <ScoreRing score={result.overallScore} />
              <div className="text-[13px] text-ink-muted mt-3">GEO Skoru</div>
              <div className="text-[11px] text-ink-faint mt-1 break-all">{result.url}</div>
            </div>
            <div className="card p-6 lg:col-span-2">
              <div className="eyebrow mb-4">Eksen Kırılımı</div>
              <div className="space-y-3.5">
                {Object.entries(result.breakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3">
                    <div className="w-[150px] shrink-0 text-[13px]">{AXIS_LABELS[k] ?? k}</div>
                    <div className="flex-1 h-2 rounded-full bg-paper-3 overflow-hidden">
                      <div className={barColor(v)} style={{ width: `${v}%` }} />
                    </div>
                    <div className="w-10 text-right font-mono text-[12.5px] tabular">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bulgular */}
          <div className="mt-6 space-y-5">
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="card p-6">
                <div className="eyebrow mb-3">{cat}</div>
                <div className="space-y-3">
                  {items.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <StatusIcon status={f.status} />
                      <div className="min-w-0">
                        <div className="text-[13.5px] text-ink">{f.title}</div>
                        <div className="text-[12px] text-ink-muted mt-0.5">{f.detail}</div>
                        {f.fix && f.status !== 'pass' && (
                          <div className="text-[12px] text-brand-deep mt-1">→ {f.fix}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 70 ? '#10B981' : score >= 45 ? '#F59E0B' : '#E11D48';
  return (
    <div className="relative w-[140px] h-[140px]">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#E5E1D8" strokeWidth="10" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[34px] tabular" style={{ color }}>{score}</span>
        <span className="text-[10px] text-ink-faint">/100</span>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: 'pass' | 'warn' | 'fail' }) {
  if (status === 'pass') return <CheckCircle2 className="w-4 h-4 text-positive shrink-0 mt-0.5" />;
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />;
  return <XCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />;
}

function barColor(v: number): string {
  const base = 'h-full rounded-full transition-all duration-500 ';
  if (v >= 70) return base + 'bg-positive';
  if (v >= 45) return base + 'bg-warning';
  return base + 'bg-danger';
}
