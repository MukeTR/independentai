'use client';

import { useState } from 'react';
import { Search, Loader2, Plus, Check } from 'lucide-react';

type Idea = {
  prompt: string;
  intent: 'Keşif' | 'Karşılaştırma' | 'Değerlendirme' | 'Nasıl yapılır';
  demand: 'Yüksek' | 'Orta' | 'Düşük';
};

const INTENT_CATEGORY: Record<Idea['intent'], string> = {
  Keşif: 'discovery',
  Karşılaştırma: 'comparison',
  Değerlendirme: 'review',
  'Nasıl yapılır': 'how_to',
};

export function KeywordFinder() {
  const [topic, setTopic] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [added, setAdded] = useState<Record<number, 'adding' | 'done'>>({});
  const [error, setError] = useState('');

  async function find(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    setIdeas([]);
    setAdded({});
    try {
      const res = await fetch('/api/tools/keyword-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, industry: industry || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Hata');
      setIdeas(data.ideas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  async function addPrompt(idea: Idea, i: number) {
    setAdded((s) => ({ ...s, [i]: 'adding' }));
    try {
      const res = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: idea.prompt, category: INTENT_CATEGORY[idea.intent] }),
      });
      if (!res.ok) throw new Error();
      setAdded((s) => ({ ...s, [i]: 'done' }));
    } catch {
      setAdded((s) => {
        const next = { ...s };
        delete next[i];
        return next;
      });
    }
  }

  return (
    <div>
      <form onSubmit={find} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Konu — örn. muhasebe yazılımı" className="input" />
        <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Sektör (opsiyonel) — örn. e-ticaret" className="input" />
        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center justify-center gap-2 whitespace-nowrap">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Aranıyor…' : 'Prompt bul'}
        </button>
      </form>

      {error && <div className="mt-4 text-[13px] text-danger bg-danger/5 border border-danger/20 rounded-lg p-3">{error}</div>}

      {ideas.length > 0 && (
        <div className="mt-8 space-y-2">
          {ideas.map((idea, i) => (
            <div key={i} className="card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[14px] text-ink">{idea.prompt}</div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10.5px] rounded px-1.5 py-0.5 bg-paper-3 text-ink-muted">{idea.intent}</span>
                  <span
                    className={`text-[10.5px] rounded px-1.5 py-0.5 ${
                      idea.demand === 'Yüksek' ? 'bg-positive/10 text-positive' : idea.demand === 'Orta' ? 'bg-warning/10 text-warning' : 'bg-paper-3 text-ink-faint'
                    }`}
                  >
                    {idea.demand} talep
                  </span>
                </div>
              </div>
              <button
                onClick={() => addPrompt(idea, i)}
                disabled={!!added[i]}
                className="shrink-0 text-[12.5px] inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 hover:bg-paper-3 transition disabled:opacity-60"
              >
                {added[i] === 'done' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-positive" /> Eklendi
                  </>
                ) : added[i] === 'adding' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" /> Takibe ekle
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
