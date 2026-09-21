'use client';

import { useState } from 'react';
import { Search, Loader2, FileSearch, Zap } from 'lucide-react';

type Card = {
  title: string;
  detail: string;
  difficulty: 'Kolay' | 'Orta' | 'Zor';
  impact: 'Yüksek' | 'Orta' | 'Düşük';
};
type Result = {
  url: string;
  contentScore: number;
  summary: string;
  stats: { wordCount: number; headings: number; lists: number; hasFaq: boolean };
  recommendations: Card[];
};

const IMPACT_RANK = { Yüksek: 0, Orta: 1, Düşük: 2 };

export function ContentAuditScanner() {
  const [url, setUrl] = useState('');
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
      const res = await fetch('/api/tools/content-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Hata');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  const sorted = result
    ? [...result.recommendations].sort((a, b) => IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact])
    : [];

  return (
    <div>
      <form onSubmit={scan} className="flex gap-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://siteniz.com/blog/yazi"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary inline-flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Analiz ediliyor…' : 'Analiz et'}
        </button>
      </form>

      {error && (
        <div className="mt-4 text-[13px] text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</div>
      )}

      {result && (
        <div className="mt-8 space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-16 h-16 rounded-xl bg-brand-glow flex flex-col items-center justify-center">
                <span className="font-display text-[24px] text-brand-deep tabular">{result.contentScore}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileSearch className="w-4 h-4 text-brand" />
                  <h3 className="font-display text-[16px]">İçerik Değerlendirmesi</h3>
                </div>
                <p className="text-[13.5px] text-ink-muted mt-1.5">{result.summary}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Stat label="Kelime" value={result.stats.wordCount} />
                  <Stat label="Başlık" value={result.stats.headings} />
                  <Stat label="Liste" value={result.stats.lists} />
                  <Stat label="FAQ" value={result.stats.hasFaq ? 'Var' : 'Yok'} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-warning" />
              <h3 className="font-display text-[16px]">Aksiyon Kartları</h3>
              <span className="text-[12px] text-ink-faint">({sorted.length} öneri, etkiye göre sıralı)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sorted.map((c, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge tone={c.impact === 'Yüksek' ? 'positive' : c.impact === 'Orta' ? 'warning' : 'muted'}>
                      {c.impact} etki
                    </Badge>
                    <Badge tone="muted">{c.difficulty}</Badge>
                  </div>
                  <div className="font-display text-[14.5px] leading-tight">{c.title}</div>
                  <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">{c.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="text-[11.5px] text-ink-muted bg-paper-3 rounded-md px-2 py-1">
      {label}: <span className="text-ink font-mono">{value}</span>
    </span>
  );
}

function Badge({ tone, children }: { tone: 'positive' | 'warning' | 'muted'; children: React.ReactNode }) {
  const cls =
    tone === 'positive'
      ? 'bg-positive/10 text-positive'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning'
        : 'bg-paper-3 text-ink-muted';
  return <span className={`text-[10.5px] rounded px-1.5 py-0.5 ${cls}`}>{children}</span>;
}
