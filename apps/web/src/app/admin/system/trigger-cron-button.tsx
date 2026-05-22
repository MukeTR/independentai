'use client';

import { useState } from 'react';
import { Play, CheckCircle2 } from 'lucide-react';

export function TriggerCronButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function trigger() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/admin/trigger-cron', { method: 'POST' });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || 'Trigger failed');
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hata');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button onClick={trigger} disabled={loading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
        <Play className="w-4 h-4" />
        {loading ? 'Çalıştırılıyor...' : 'Şimdi tüm promptları çalıştır'}
      </button>
      {result && (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-positive">
          <CheckCircle2 className="w-4 h-4" /> {result.processed} prompt çalıştı, {result.failed} hata
        </span>
      )}
      {error && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}
