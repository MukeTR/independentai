'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';

export function RunNowButton({ promptId, disabled = false }: { promptId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);

  async function run() {
    if (loading || disabled) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await apiFetch<{ failed?: number }>(`/api/prompts/${promptId}/run`, {
        method: 'POST',
        timeoutMs: 120_000,
      });
      setMsg(
        r.failed
          ? { tone: 'error', text: `${r.failed} model hata verdi; diğer sonuçlar güncellendi.` }
          : { tone: 'ok', text: 'Ölçüm tamamlandı.' },
      );
      router.refresh();
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err, 'Çalıştırılamadı') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={run}
        disabled={loading || disabled}
        className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1.5 text-[12px] disabled:opacity-50"
        aria-busy={loading}
      >
        <Play className="w-3 h-3" aria-hidden />
        {loading ? 'Çalıştırılıyor…' : 'Şimdi çalıştır'}
      </button>
      {msg && (
        <span
          role={msg.tone === 'error' ? 'alert' : 'status'}
          className={`text-[12px] ${msg.tone === 'error' ? 'text-danger' : 'text-positive'}`}
        >
          {msg.text}
        </span>
      )}
    </span>
  );
}
