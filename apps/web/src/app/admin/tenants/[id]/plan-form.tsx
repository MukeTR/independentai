'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

export function TenantPlanForm({
  tenantId,
  plan,
  trialEndsAt,
}: {
  tenantId: string;
  plan: string;
  trialEndsAt: string;
}) {
  const router = useRouter();
  const ids = { plan: useId(), trial: useId() };
  const [p, setP] = useState(plan);
  const [t, setT] = useState(trialEndsAt.slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        json: { plan: p, trialEndsAt: new Date(`${t}T23:59:59Z`).toISOString() },
      });
      setMsg({ ok: true, text: 'Kaydedildi' });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="card p-6 mt-5">
      <div className="eyebrow">Plan ve deneme süresi</div>
      <p className="text-[12px] text-ink-muted mt-1">
        Fiyat/ödeme sağlayıcısı gelene kadar plan elle atanır. STARTER/GROWTH atanmış tenant deneme süresine
        bakılmaksızın aktiftir.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[auto_auto_auto] gap-3 mt-4 items-end">
        <div>
          <label htmlFor={ids.plan} className="eyebrow block mb-1.5">
            Plan
          </label>
          <select id={ids.plan} className="input" value={p} onChange={(e) => setP(e.target.value)}>
            <option value="LAUNCH">LAUNCH (lansman)</option>
            <option value="STARTER">STARTER</option>
            <option value="GROWTH">GROWTH</option>
          </select>
        </div>
        <div>
          <label htmlFor={ids.trial} className="eyebrow block mb-1.5">
            Deneme bitişi
          </label>
          <input id={ids.trial} type="date" className="input" value={t} onChange={(e) => setT(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary !py-2.5 disabled:opacity-50" disabled={saving}>
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
