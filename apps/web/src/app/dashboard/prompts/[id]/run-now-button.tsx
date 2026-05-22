'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';

export function RunNowButton({ promptId }: { promptId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      await fetch(`/api/prompts/${promptId}/run`, { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1.5 text-[12px] disabled:opacity-50"
    >
      <Play className="w-3 h-3" />
      {loading ? 'Çalıştırılıyor…' : 'Şimdi çalıştır'}
    </button>
  );
}
