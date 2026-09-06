'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useHydrated } from '@/lib/use-hydrated';

export function LoginForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const params = useSearchParams();
  const ids = { email: useId(), pass: useId() };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/api/auth/login', { method: 'POST', json: { email, password } });
      const next = params.get('next');
      router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Giriş başarısız'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={ids.email} className="eyebrow block mb-2">
          E-posta
        </label>
        <input
          id={ids.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          required
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor={ids.pass} className="eyebrow">
            Şifre
          </label>
          <Link href="/forgot-password" className="text-[12px] text-brand-deep hover:underline">
            Şifremi unuttum
          </Link>
        </div>
        <input
          id={ids.pass}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          required
        />
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <button
        type="submit"
        disabled={!hydrated || loading}
        className="btn-primary w-full mt-6 disabled:opacity-50"
        aria-busy={loading}
      >
        {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
