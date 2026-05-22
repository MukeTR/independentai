'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          website: website || undefined,
          email,
          password,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Kayıt başarısız');
      }
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-9 rise-1">
      <div className="chip mb-5">
        <Sparkles className="w-3 h-3 text-brand" />
        <span className="font-mono">İlk 6 ay tamamen ücretsiz</span>
      </div>
      <h1 className="font-display text-[32px] tracking-tight">Hesap oluştur</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Kredi kartı gerekmez. Kayıt anında 6 aylık tam erişim başlar.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label className="eyebrow block mb-2">Şirket adı</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Yazılım"
            className="input"
            required
          />
        </div>
        <div>
          <label className="eyebrow block mb-2">Web sitesi (opsiyonel)</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://acme.com"
            className="input"
          />
        </div>
        <div>
          <label className="eyebrow block mb-2">E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>
        <div>
          <label className="eyebrow block mb-2">Şifre <span className="text-ink-faint">(en az 8 karakter)</span></label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="text-[13px] text-danger bg-danger/5 border-hairline border-danger/20 rounded-lg p-3">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full mt-6 disabled:opacity-50">
          {loading ? 'Hesap oluşturuluyor…' : '6 ay ücretsiz başlat'}
        </button>
      </form>

      <p className="text-center text-[13px] text-ink-muted mt-6">
        Zaten hesabınız var mı?{' '}
        <Link href="/login" className="text-brand hover:underline">
          Giriş yapın
        </Link>
      </p>
    </div>
  );
}
