'use client';

import { useState } from 'react';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';

type Type = 'faq' | 'qa' | 'meta' | 'social';
type Result = { type: Type; label: string; content: string; available: boolean };

const TYPES: { value: Type; label: string }[] = [
  { value: 'faq', label: 'FAQ bloğu' },
  { value: 'qa', label: 'Q&A sayfası' },
  { value: 'meta', label: 'Meta başlık + açıklama' },
  { value: 'social', label: 'Sosyal gönderi' },
];

export function AeoWriter() {
  const [type, setType] = useState<Type>('faq');
  const [topic, setTopic] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/tools/aeo-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, topic, brand: brand || undefined, notes: notes || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setResult(data);
      } else {
        setResult({
          type,
          label: 'Hata',
          available: false,
          content: data?.message || 'İçerik üretilemedi, tekrar deneyin.',
        });
      }
    } catch {
      setResult({ type, label: 'Hata', available: false, content: 'Bağlantı hatası, tekrar deneyin.' });
    } finally {
      setLoading(false);
    }
  }

  function copy() {
    if (result) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={generate} className="card p-6 space-y-4 h-fit">
        <div>
          <label className="text-[13px] text-ink-muted">İçerik türü</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`text-[12.5px] rounded-lg border px-3 py-2 transition ${type === t.value ? 'border-brand bg-brand-glow text-brand-deep' : 'border-hairline hover:bg-paper-3'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[13px] text-ink-muted">Konu</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Örn. e-ticaret için muhasebe entegrasyonu"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-[13px] text-ink-muted">Marka (opsiyonel)</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Markanız"
            className="input mt-1.5"
          />
        </div>
        <div>
          <label className="text-[13px] text-ink-muted">Ek notlar (opsiyonel)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ton, hedef kitle, vurgulanacak özellikler…"
            className="input mt-1.5 resize-y"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Üretiliyor…' : 'İçerik üret'}
        </button>
      </form>

      <div className="card p-6 min-h-[300px]">
        {!result && !loading && (
          <div className="text-[13px] text-ink-faint h-full flex items-center justify-center text-center">
            Soldan ayarları girip içerik üretin.
          </div>
        )}
        {loading && (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
          </div>
        )}
        {result && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="eyebrow">{result.label}</div>
              {result.available && (
                <button
                  onClick={copy}
                  className="text-[12px] inline-flex items-center gap-1.5 text-ink-muted hover:text-brand-deep"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} Kopyala
                </button>
              )}
            </div>
            <div className="text-[13.5px] text-ink whitespace-pre-wrap leading-relaxed">{result.content}</div>
          </div>
        )}
      </div>
    </div>
  );
}
