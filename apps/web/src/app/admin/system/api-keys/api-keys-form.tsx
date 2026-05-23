'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Eye, EyeOff, Save, Trash2, Database, Server } from 'lucide-react';

type ConfigStatus = {
  key: string;
  label: string;
  provider: string;
  help: string;
  pattern?: string;
  source: 'db' | 'env' | 'none';
  preview: string | null;
  updatedAt: Date | string | null;
  updatedBy: string | null;
};

export function ApiKeysForm({ initial }: { initial: ConfigStatus[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveKey(key: string) {
    const value = values[key];
    if (!value || value.trim().length < 10) {
      setError(`${key}: Değer çok kısa veya boş`);
      return;
    }
    setSaving(key);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: value.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Kaydedilemedi');
      }
      setSuccess(`${key} kaydedildi`);
      setValues({ ...values, [key]: '' });
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setSaving(null);
    }
  }

  async function clearKey(key: string) {
    if (!confirm(`${key} silinsin mi? Vercel env varsa fallback olarak o kullanılır.`)) return;
    setSaving(key);
    setError(null);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Silinemedi');
      }
      setSuccess(`${key} silindi`);
      router.refresh();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Global feedback */}
      {success && (
        <div className="card p-3 bg-positive/5 border-positive/30 flex items-center gap-2 text-[13px] text-positive">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}
      {error && (
        <div className="card p-3 bg-danger/5 border-danger/30 flex items-center gap-2 text-[13px] text-danger">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {initial.map((cfg) => (
        <div key={cfg.key} className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-display text-[18px]">{cfg.label}</h3>
                {cfg.source === 'db' && (
                  <span className="chip own !text-[10px] inline-flex items-center gap-1">
                    <Database className="w-3 h-3" /> DB
                  </span>
                )}
                {cfg.source === 'env' && (
                  <span className="chip !text-[10px] inline-flex items-center gap-1">
                    <Server className="w-3 h-3" /> Vercel env
                  </span>
                )}
                {cfg.source === 'none' && (
                  <span className="chip comp !text-[10px]">tanımsız → mock mode</span>
                )}
              </div>
              <div className="text-[11.5px] text-ink-faint font-mono mt-1">
                {cfg.key} · {cfg.help}
              </div>
              {cfg.preview && (
                <div className="text-[12px] text-ink-muted mt-2 font-mono">
                  Mevcut: <span className="text-ink">{cfg.preview}</span>
                </div>
              )}
              {cfg.updatedAt && (
                <div className="text-[10.5px] text-ink-faint mt-1 font-mono">
                  Son güncelleme: {new Date(cfg.updatedAt).toLocaleString('tr-TR')}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <input
                type={shown[cfg.key] ? 'text' : 'password'}
                value={values[cfg.key] ?? ''}
                onChange={(e) => setValues({ ...values, [cfg.key]: e.target.value })}
                placeholder={cfg.source !== 'none' ? 'Yeni değer girersen mevcut üzerine yazılır...' : `${cfg.pattern} ile başlayan key\'i yapıştır`}
                className="input !pr-12 font-mono text-[12.5px]"
              />
              <button
                type="button"
                onClick={() => setShown({ ...shown, [cfg.key]: !shown[cfg.key] })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
              >
                {shown[cfg.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => saveKey(cfg.key)}
              disabled={saving === cfg.key || !values[cfg.key]}
              className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving === cfg.key ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            {cfg.source === 'db' && (
              <button
                type="button"
                onClick={() => clearKey(cfg.key)}
                disabled={saving === cfg.key}
                className="btn-secondary !py-2 !px-3 inline-flex items-center gap-1.5 text-[13px] !text-danger hover:!border-danger disabled:opacity-50"
                title="DB\'den sil (Vercel env varsa fallback)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
