'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import { useHydrated } from '@/lib/use-hydrated';

export function RegisterForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = { company: useId(), site: useId(), email: useId(), pass: useId(), passHelp: useId() };
  const [companyName, setCompanyName] = useState('');
  const [website, setWebsite] = useState('');
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
      await apiFetch('/api/auth/register', {
        method: 'POST',
        json: { companyName, website: website || undefined, email, password },
      });
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      setError(errorMessage(err, 'Kayıt başarısız'));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={ids.company} className="eyebrow block mb-2">
          Şirket adı
        </label>
        <input
          id={ids.company}
          autoComplete="organization"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Acme Yazılım"
          className="input"
          required
          maxLength={80}
        />
      </div>
      <div>
        <label htmlFor={ids.site} className="eyebrow block mb-2">
          Web sitesi <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
        </label>
        <input
          id={ids.site}
          type="url"
          autoComplete="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://acme.com"
          className="input"
        />
      </div>
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
        <label htmlFor={ids.pass} className="eyebrow block mb-2">
          Şifre
        </label>
        <input
          id={ids.pass}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
          required
          minLength={8}
          aria-describedby={ids.passHelp}
        />
        <p id={ids.passHelp} className="text-[11.5px] text-ink-faint mt-1.5">
          En az 8 karakter, bir harf ve bir rakam.
        </p>
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <button
        type="submit"
        disabled={!hydrated || loading}
        className="btn-primary w-full mt-6 disabled:opacity-50"
        aria-busy={loading}
      >
        {loading ? 'Hesap oluşturuluyor…' : '6 ay ücretsiz başlat'}
      </button>
      <p className="text-[11.5px] text-ink-faint text-center">
        Kayıt olarak{' '}
        <a href="/legal/terms" className="underline">
          Kullanım Şartları
        </a>{' '}
        ve{' '}
        <a href="/legal/privacy" className="underline">
          Gizlilik Politikası
        </a>
        &apos;nı kabul edersiniz.
      </p>
    </form>
  );
}
