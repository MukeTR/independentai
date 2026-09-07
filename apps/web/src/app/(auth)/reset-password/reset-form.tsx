'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const ids = { p1: useId(), p2: useId() };
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (p1 !== p2) {
      setError('Şifreler eşleşmiyor');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/auth/reset-password', { method: 'POST', json: { token, password: p1 } });
      router.push('/login?reset=1');
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={ids.p1} className="eyebrow block mb-2">
          Yeni şifre
        </label>
        <input
          id={ids.p1}
          type="password"
          autoComplete="new-password"
          className="input"
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          required
          minLength={8}
        />
        <p className="text-[11.5px] text-ink-faint mt-1.5">En az 8 karakter, bir harf ve bir rakam.</p>
      </div>
      <div>
        <label htmlFor={ids.p2} className="eyebrow block mb-2">
          Yeni şifre (tekrar)
        </label>
        <input
          id={ids.p2}
          type="password"
          autoComplete="new-password"
          className="input"
          value={p2}
          onChange={(e) => setP2(e.target.value)}
          required
          minLength={8}
        />
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50" aria-busy={loading}>
        {loading ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
      </button>
    </form>
  );
}
