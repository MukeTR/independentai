'use client';

import { useState } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';

export function TriggerCronButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [force, setForce] = useState(false);
  const [result, setResult] = useState<{
    processed: number;
    failed: number;
    remaining: number;
    enqueued: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiFetch<{ processed: number; failed: number; remaining: number; enqueued: number }>(
        '/api/admin/trigger-cron',
        { method: 'POST', json: { force }, timeoutMs: 300_000 },
      );
      setResult(data);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Tetikleme başarısız'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={trigger}
        disabled={loading}
        className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
        aria-busy={loading}
      >
        <Play className="w-4 h-4" aria-hidden />
        {loading ? 'Çalıştırılıyor…' : 'Günlük turu şimdi çalıştır'}
      </button>
      <label className="text-[12.5px] text-ink-muted inline-flex items-center gap-2">
        <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
        force: bugün çalışmış olsa da tam tur üret (maliyetli)
      </label>
      {result && (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-positive" role="status">
          <CheckCircle2 className="w-4 h-4" aria-hidden /> kuyruk {result.enqueued} · işlenen {result.processed} · hata{' '}
          {result.failed} · kalan {result.remaining}
        </span>
      )}
      {error && (
        <span className="text-[13px] text-danger" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
