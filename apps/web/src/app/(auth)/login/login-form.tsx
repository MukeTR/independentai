'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('demo@independentai.space');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Giriş başarısız');
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="eyebrow block mb-2">E-posta</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
      </div>
      <div>
        <label className="eyebrow block mb-2">Şifre</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
      </div>

      {error && (
        <div className="text-[13px] text-danger bg-danger/5 border-hairline border-danger/20 rounded-lg p-3">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full mt-6 disabled:opacity-50">
        {loading ? 'Giriş yapılıyor…' : 'Giriş yap'}
      </button>
    </form>
  );
}
