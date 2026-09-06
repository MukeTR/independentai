'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowRight } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

type Initial = { brandName: string; aliases: string[]; website: string; competitors: string[]; prompts: string[] };

function TagInput({
  id,
  label,
  help,
  placeholder,
  values,
  onChange,
  max,
  chipClass = 'chip own',
}: {
  id: string;
  label: string;
  help?: string;
  placeholder: string;
  values: string[];
  onChange: (v: string[]) => void;
  max?: number;
  chipClass?: string;
}) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (values.some((x) => x.toLocaleLowerCase('tr') === v.toLocaleLowerCase('tr'))) {
      setInput('');
      return;
    }
    if (max && values.length >= max) return;
    onChange([...values, v]);
    setInput('');
  };
  return (
    <div>
      <label htmlFor={id} className="eyebrow block mb-2">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-describedby={help ? `${id}-help` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="btn-secondary !px-4" onClick={add} aria-label={`${label} ekle`}>
          <Plus className="w-4 h-4" aria-hidden />
        </button>
      </div>
      {help && (
        <p id={`${id}-help`} className="text-[11.5px] text-ink-faint mt-2">
          {help}
        </p>
      )}
      <ul className="flex flex-wrap gap-2 mt-3" aria-label={`${label} listesi`}>
        {values.map((a, i) => (
          <li key={`${a}-${i}`} className={chipClass}>
            {a}
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} aria-label={`${a} kaldır`}>
              <X className="w-3 h-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function OnboardingForm({
  initial,
  limits,
}: {
  initial: Initial;
  limits: { competitors: number; prompts: number };
}) {
  const router = useRouter();
  const ids = { brand: useId(), alias: useId(), site: useId(), comp: useId(), prompt: useId() };
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [brandName, setBrandName] = useState(initial.brandName);
  const [aliases, setAliases] = useState<string[]>(initial.aliases);
  const [website, setWebsite] = useState(initial.website);
  const [competitors, setCompetitors] = useState<string[]>(initial.competitors);
  const [prompts, setPrompts] = useState<string[]>(initial.prompts);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finish() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/onboarding', {
        method: 'POST',
        json: { brand: { name: brandName, aliases, website: website || undefined }, competitors, prompts },
        timeoutMs: 90_000,
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Kurulum kaydedilemedi'));
      setSaving(false);
    }
  }

  return (
    <div className="card p-7 sm:p-9 rise-1">
      <ol className="flex items-center gap-3 mb-7" aria-label="Kurulum adımları">
        {[1, 2, 3].map((n) => (
          <li
            key={n}
            aria-current={n === step ? 'step' : undefined}
            className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-brand' : 'bg-paper-4'}`}
          />
        ))}
      </ol>
      <div className="eyebrow">Adım {step} / 3</div>

      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (brandName.trim()) setStep(2);
          }}
        >
          <h1 className="font-display text-[26px] sm:text-[28px] tracking-tight mt-2">Markanızı tanıtın</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Yapay zekanın metninde markanızı tespit edebilmemiz için adınızı ve alternatif yazımlarını alalım.
          </p>
          <div className="mt-7 space-y-4">
            <div>
              <label htmlFor={ids.brand} className="eyebrow block mb-2">
                Marka adı
              </label>
              <input
                id={ids.brand}
                className="input"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Acme"
                required
                maxLength={80}
                autoFocus
              />
            </div>
            <TagInput
              id={ids.alias}
              label="Alternatif yazımlar / domain"
              help="Örn. acme.com, Acme Corp. Enter ile ekleyin."
              placeholder="acme.com"
              values={aliases}
              onChange={setAliases}
              max={20}
            />
            <div>
              <label htmlFor={ids.site} className="eyebrow block mb-2">
                Web sitesi <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
              </label>
              <input
                id={ids.site}
                className="input"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.com"
              />
            </div>
          </div>
          <div className="mt-9 flex justify-end">
            <button
              type="submit"
              disabled={!brandName.trim()}
              className="btn-primary disabled:opacity-50 inline-flex items-center gap-2"
            >
              Devam <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <>
          <h1 className="font-display text-[26px] sm:text-[28px] tracking-tight mt-2">Rakiplerinizi ekleyin</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            AI cevaplarında karşınıza çıkabilecek 3-5 rakip yazın. Sonra her zaman değiştirebilirsiniz.
          </p>
          <div className="mt-7">
            <TagInput
              id={ids.comp}
              label="Rakip marka adı"
              placeholder="Rakip marka adı"
              values={competitors}
              onChange={setCompetitors}
              max={limits.competitors}
              chipClass="chip comp"
              help={`En fazla ${limits.competitors} rakip.`}
            />
          </div>
          <div className="mt-9 flex justify-between">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              Geri
            </button>
            <button type="button" onClick={() => setStep(3)} className="btn-primary inline-flex items-center gap-2">
              Devam <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="font-display text-[26px] sm:text-[28px] tracking-tight mt-2">İzlenecek soruları girin</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Müşterilerinizin AI&apos;a sorabileceği soruları yazın. Her gece 3 modelde otomatik çalıştırılır; ilk 5 soru
            hemen ölçülür.
          </p>
          <div className="mt-7">
            <TagInput
              id={ids.prompt}
              label="İzlenecek soru"
              placeholder='Örn: "Restoranlar için en iyi POS yazılımı nedir?"'
              values={prompts}
              onChange={setPrompts}
              max={limits.prompts}
              chipClass="chip"
              help="En az 5 karakter. Enter ile ekleyin."
            />
          </div>
          {error && <InlineAlert className="mt-4">{error}</InlineAlert>}
          <div className="mt-9 flex justify-between">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary" disabled={saving}>
              Geri
            </button>
            <button
              type="button"
              disabled={prompts.length === 0 || saving}
              onClick={finish}
              className="btn-primary disabled:opacity-50 inline-flex items-center gap-2"
              aria-busy={saving}
            >
              {saving ? 'Kaydediliyor…' : 'Panele git'} <ArrowRight className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
