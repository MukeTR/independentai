'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowRight } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: brand
  const [brandName, setBrandName] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState('');
  const [website, setWebsite] = useState('');

  // Step 2: competitors
  const [competitors, setCompetitors] = useState<string[]>([]);
  const [compInput, setCompInput] = useState('');

  // Step 3: prompts
  const [prompts, setPrompts] = useState<string[]>([]);
  const [promptInput, setPromptInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      await fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: brandName, aliases, website: website || undefined }),
      });
      for (const c of competitors) {
        await fetch('/api/competitors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: c, aliases: [] }),
        });
      }
      for (const p of prompts) {
        await fetch('/api/prompts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: p, language: 'tr' }),
        });
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-9 rise-1">
      <div className="flex items-center gap-3 mb-7">
        {[1, 2, 3].map((n) => (
          <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-brand' : 'bg-paper-4'}`} />
        ))}
      </div>
      <div className="eyebrow">Adım {step} / 3</div>

      {step === 1 && (
        <>
          <h1 className="font-display text-[28px] tracking-tight mt-2">Markanızı tanıtın</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Yapay zekanın metninde markanızı tespit edebilmemiz için adınızı ve alternatif yazımlarını alalım.
          </p>

          <div className="mt-7 space-y-4">
            <div>
              <label className="eyebrow block mb-2">Marka adı</label>
              <input className="input" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Acme" />
            </div>
            <div>
              <label className="eyebrow block mb-2">Alternatif yazımlar / domain</label>
              <div className="flex gap-2">
                <input
                  className="input"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="acme.com, Acme Corp, Acmecorp"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (aliasInput.trim()) {
                        setAliases([...aliases, aliasInput.trim()]);
                        setAliasInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary !px-4"
                  onClick={() => {
                    if (aliasInput.trim()) {
                      setAliases([...aliases, aliasInput.trim()]);
                      setAliasInput('');
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {aliases.map((a, i) => (
                  <span key={i} className="chip own">
                    {a}
                    <button onClick={() => setAliases(aliases.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-2">Web sitesi</label>
              <input className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://acme.com" />
            </div>
          </div>

          <div className="mt-9 flex justify-end">
            <button
              type="button"
              disabled={!brandName.trim()}
              onClick={() => setStep(2)}
              className="btn-primary disabled:opacity-50 inline-flex items-center gap-2"
            >
              Devam <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="font-display text-[28px] tracking-tight mt-2">Rakiplerinizi ekleyin</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            En sık AI cevaplarında karşınıza çıkabilecek 3-5 rakip yazın. Sonra her zaman değiştirebilirsiniz.
          </p>

          <div className="mt-7">
            <div className="flex gap-2">
              <input
                className="input"
                value={compInput}
                onChange={(e) => setCompInput(e.target.value)}
                placeholder="Rakip marka adı"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (compInput.trim()) {
                      setCompetitors([...competitors, compInput.trim()]);
                      setCompInput('');
                    }
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary !px-4"
                onClick={() => {
                  if (compInput.trim()) {
                    setCompetitors([...competitors, compInput.trim()]);
                    setCompInput('');
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {competitors.map((c, i) => (
                <span key={i} className="chip comp">
                  {c}
                  <button onClick={() => setCompetitors(competitors.filter((_, j) => j !== i))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="mt-9 flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              Geri
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="btn-primary inline-flex items-center gap-2"
            >
              Devam <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="font-display text-[28px] tracking-tight mt-2">İzlenecek soruları girin</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Müşterilerinizin AI'a sorabileceği soruları yazın. Her gece 3 modelde otomatik çalıştırılacak.
          </p>

          <div className="mt-7">
            <div className="flex gap-2">
              <input
                className="input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder='Örn: "Restoranlar için en iyi POS yazılımı nedir?"'
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (promptInput.trim()) {
                      setPrompts([...prompts, promptInput.trim()]);
                      setPromptInput('');
                    }
                  }
                }}
              />
              <button
                type="button"
                className="btn-secondary !px-4"
                onClick={() => {
                  if (promptInput.trim()) {
                    setPrompts([...prompts, promptInput.trim()]);
                    setPromptInput('');
                  }
                }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <ul className="mt-4 space-y-2">
              {prompts.map((p, i) => (
                <li key={i} className="flex items-start justify-between gap-3 border-b-hairline border-hairline pb-2">
                  <span className="font-mono text-[13px] text-ink">{p}</span>
                  <button onClick={() => setPrompts(prompts.filter((_, j) => j !== i))}>
                    <X className="w-3.5 h-3.5 text-ink-faint hover:text-danger" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {error && (
            <div className="text-[13px] text-danger bg-danger/5 border-hairline border-danger/20 rounded-lg p-3 mt-4">
              {error}
            </div>
          )}

          <div className="mt-9 flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary">
              Geri
            </button>
            <button
              type="button"
              disabled={prompts.length === 0 || saving}
              onClick={finish}
              className="btn-primary disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? 'Kaydediliyor…' : 'Dashboard\'a git'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
