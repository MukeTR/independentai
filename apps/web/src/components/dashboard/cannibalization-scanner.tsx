'use client';

import { useState } from 'react';
import { Search, Loader2, GitFork, AlertTriangle, CheckCircle2 } from 'lucide-react';

type Pair = { a: string; b: string; similarity: number };
type Result = { pagesAnalyzed: number; pairs: Pair[] };

export function CannibalizationScanner() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/tools/cannibalization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
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

  return (
    <div>
      <form onSubmit={scan} className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="sitemap.xml URL'i (örn. https://siteniz.com/sitemap.xml) — VEYA her satıra bir sayfa URL'i yapıştırın"
          className="input w-full resize-y"
        />
        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Analiz ediliyor…' : 'Kanibalizasyon analizi'}
        </button>
        <p className="text-[11.5px] text-ink-faint">
          En fazla 15 sayfa analiz edilir. OpenAI anahtarı varsa gerçek embedding, yoksa yapısal benzerlik kullanılır.
        </p>
      </form>

      {error && (
        <div className="mt-4 text-[13px] text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</div>
      )}

      {result && (
        <div className="mt-8">
          <div className="text-[13px] text-ink-muted mb-4">{result.pagesAnalyzed} sayfa analiz edildi.</div>
          {result.pairs.length === 0 ? (
            <div className="card p-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-positive shrink-0" />
              <div>
                <div className="font-display text-[15px]">Kanibalizasyon riski bulunamadı</div>
                <p className="text-[13px] text-ink-muted mt-1">
                  Analiz edilen sayfalar yeterince farklı konulara odaklı. Sayfalarınız aynı sorgu için birbiriyle
                  yarışmıyor.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {result.pairs.map((p, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <span className="font-display text-[15px]">Çakışma — %{p.similarity} benzer</span>
                    </div>
                    <GitFork className="w-4 h-4 text-ink-faint" />
                  </div>
                  <div className="space-y-1.5">
                    <a
                      href={p.a}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[12.5px] text-ink hover:text-brand-deep truncate"
                    >
                      {p.a}
                    </a>
                    <a
                      href={p.b}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-[12.5px] text-ink hover:text-brand-deep truncate"
                    >
                      {p.b}
                    </a>
                  </div>
                  <p className="text-[12px] text-ink-muted mt-3 leading-relaxed">
                    Bu iki sayfa aynı konuya çok yakın. AI hangisini alıntılayacağına karar veremeyip ikisini de
                    zayıflatabilir. Birini kanonik yapın, diğerini farklılaştırın veya birleştirin.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
