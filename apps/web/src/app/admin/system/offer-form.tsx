'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

type Values = { trialDays: number; saasMonthlyTry: number; agencyFromMonthlyTry: number };

/**
 * Admin > Sistem: teklif ve fiyat override formu. Boş bırakılan alan varsayılana döner.
 * Pazarlama sayfaları (pricing, register, CTA'lar, llms.txt) bu değerleri getOffer() ile okur.
 */
export function OfferForm({ current, defaults }: { current: Values; defaults: Values }) {
  const router = useRouter();
  const ids = { trial: useId(), saas: useId(), agency: useId() };
  const [trial, setTrial] = useState(String(current.trialDays));
  const [saas, setSaas] = useState(String(current.saasMonthlyTry));
  const [agency, setAgency] = useState(String(current.agencyFromMonthlyTry));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const offer = await apiFetch<Values>('/api/admin/offer', {
        method: 'PATCH',
        json: {
          trialDays: trial.trim() === '' ? null : Number(trial),
          saasMonthlyTry: saas.trim() === '' ? null : Number(saas),
          agencyFromMonthlyTry: agency.trim() === '' ? null : Number(agency),
        },
      });
      setTrial(String(offer.trialDays));
      setSaas(String(offer.saasMonthlyTry));
      setAgency(String(offer.agencyFromMonthlyTry));
      setMsg({ ok: true, text: 'Kaydedildi. Pazarlama sayfaları yeni değerleri anında gösterir.' });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { id: ids.trial, label: 'Deneme süresi (gün)', value: trial, set: setTrial, def: defaults.trialDays, max: 365 },
    { id: ids.saas, label: 'Yanıt aylık fiyat (₺)', value: saas, set: setSaas, def: defaults.saasMonthlyTry },
    {
      id: ids.agency,
      label: 'Yanıt Agency başlangıç (₺/ay)',
      value: agency,
      set: setAgency,
      def: defaults.agencyFromMonthlyTry,
    },
  ];

  return (
    <form onSubmit={save} className="card p-6 mt-5">
      <div className="eyebrow">Teklif ve fiyat</div>
      <p className="text-[12px] text-ink-muted mt-1">
        Yeni kayıtların deneme süresi ve sitedeki fiyatlar. Boş bırakılan alan koddaki varsayılana döner; mevcut
        hesapların deneme bitişine dokunulmaz.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 mt-4 items-end">
        {fields.map((f) => (
          <div key={f.id}>
            <label htmlFor={f.id} className="eyebrow block mb-1.5">
              {f.label}
            </label>
            <input
              id={f.id}
              type="number"
              inputMode="numeric"
              min={0}
              max={f.max}
              step={1}
              className="input"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              placeholder={String(f.def)}
              aria-describedby={`${f.id}-help`}
            />
            <p id={`${f.id}-help`} className="text-[11px] text-ink-faint mt-1 font-mono">
              varsayılan {f.def.toLocaleString('tr-TR')}
            </p>
          </div>
        ))}
        <button type="submit" className="btn-primary !py-2.5 disabled:opacity-50 mb-5" disabled={saving}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
      {msg && (
        <InlineAlert tone={msg.ok ? 'success' : 'error'} className="mt-3">
          {msg.text}
        </InlineAlert>
      )}
    </form>
  );
}
