'use client';

import { useId, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

export function ForgotForm() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<'email' | 'unavailable' | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ delivery: 'email' | 'unavailable' }>('/api/auth/forgot-password', {
        method: 'POST',
        json: { email },
      });
      setDone(res.delivery);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (done === 'email') {
    return (
      <InlineAlert tone="success">
        Bu adres kayıtlıysa sıfırlama bağlantısı gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.
      </InlineAlert>
    );
  }
  if (done === 'unavailable') {
    return (
      <InlineAlert tone="warning">
        E-posta gönderimi bu ortamda yapılandırılmamış. Lütfen destek ile iletişime geçin: destek@independentai.space
      </InlineAlert>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={id} className="eyebrow block mb-2">
          E-posta
        </label>
        <input
          id={id}
          type="email"
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error && <InlineAlert>{error}</InlineAlert>}
      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50" aria-busy={loading}>
        {loading ? 'Gönderiliyor…' : 'Sıfırlama bağlantısı gönder'}
      </button>
    </form>
  );
}
