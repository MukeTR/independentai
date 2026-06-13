'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Loader2, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';

type Provider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE';
type Result = {
  found: boolean;
  position: number | null;
  sentiment: string | null;
  snippet: string | null;
  otherBrands: string[];
  answer: string;
  modelName: string;
  isMocked: boolean;
};

export function RankChecker({
  provider,
  label,
  accent,
  examplePrompt,
}: {
  provider: Provider;
  label: string;
  accent: string;
  examplePrompt: string;
}) {
  const [brand, setBrand] = useState('');
  const [prompt, setPrompt] = useState(examplePrompt);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  async function check(e: React.FormEvent) {
    e.preventDefault();
    if (!brand.trim() || !prompt.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/tools/rank-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, prompt, provider }),
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
    <div className="card p-6 lg:p-8">
      <form onSubmit={check} className="space-y-4">
        <div>
          <label className="text-[13px] text-ink-muted">Markanız</label>
          <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Örn. Acme" className="input mt-1.5" />
        </div>
        <div>
          <label className="text-[13px] text-ink-muted">Soru / Prompt</label>
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={examplePrompt} className="input mt-1.5" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? `${label}'e soruluyor…` : `${label}'de kontrol et`}
        </button>
      </form>

      {error && <div className="mt-4 text-[13px] text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</div>}

      {result && (
        <div className="mt-6">
          <div
            className="rounded-xl p-5 border"
            style={{
              borderColor: result.found ? 'rgba(31,122,77,0.3)' : 'rgba(180,58,40,0.25)',
              background: result.found ? 'rgba(31,122,77,0.05)' : 'rgba(180,58,40,0.04)',
            }}
          >
            <div className="flex items-center gap-2">
              {result.found ? (
                <CheckCircle2 className="w-5 h-5 text-positive" />
              ) : (
                <XCircle className="w-5 h-5 text-danger" />
              )}
              <div className="font-display text-[17px]">
                {result.found
                  ? `${label} markanızı ${result.position}. sırada andı 🎉`
                  : `${label} bu soruda markanızı anmadı`}
              </div>
            </div>
            {result.snippet && (
              <p className="text-[13px] text-ink-muted mt-3 italic border-l-2 border-hairline pl-3">…{result.snippet}…</p>
            )}
            {result.otherBrands.length > 0 && (
              <div className="text-[12.5px] text-ink-muted mt-3">
                Bunun yerine öne çıkanlar: <span className="text-ink">{result.otherBrands.join(', ')}</span>
              </div>
            )}
            <div className="text-[11px] text-ink-faint mt-3 font-mono">
              {result.modelName}{result.isMocked ? ' · demo yanıt (gerçek API anahtarı yok)' : ''}
            </div>
          </div>

          {/* Tam yanıt */}
          <details className="mt-4 group">
            <summary className="text-[13px] text-brand-deep cursor-pointer">Tam yanıtı gör</summary>
            <div className="text-[13px] text-ink-muted whitespace-pre-wrap mt-2 leading-relaxed max-h-72 overflow-y-auto card p-4 bg-paper-2/40">
              {result.answer}
            </div>
          </details>

          {/* CTA */}
          <div className="mt-6 rounded-xl p-5 text-center" style={{ background: accent + '12' }}>
            <Sparkles className="w-5 h-5 mx-auto mb-2" style={{ color: accent }} />
            <div className="font-display text-[16px]">Tek soru yetmez — her gün, 3 modelde, otomatik izleyin</div>
            <p className="text-[13px] text-ink-muted mt-1.5 max-w-md mx-auto">
              Independent AI markanızı ChatGPT, Claude ve Gemini'de günlük takip eder, rakip karşılaştırması ve trend verir. İlk 6 ay ücretsiz.
            </p>
            <Link href="/register" className="btn-primary inline-flex items-center gap-2 mt-4">
              Ücretsiz başla <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
