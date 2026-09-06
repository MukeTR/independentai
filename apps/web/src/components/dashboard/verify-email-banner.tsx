'use client';

import { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api-client';

export function VerifyEmailBanner() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'unavailable' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  async function resend() {
    setState('sending');
    try {
      const r = await apiFetch<{ delivery?: string; alreadyVerified?: boolean }>('/api/auth/verify-email', {
        method: 'POST',
      });
      if (r.delivery === 'email' || r.alreadyVerified) setState('sent');
      else setState('unavailable');
    } catch (err) {
      setMsg(errorMessage(err));
      setState('error');
    }
  }

  return (
    <div
      role="status"
      className="bg-paper-2 border-b border-hairline text-[12.5px] text-ink-muted px-6 py-2 text-center"
    >
      E-posta adresiniz henüz doğrulanmadı.{' '}
      {state === 'sent' ? (
        <span className="text-positive">Doğrulama e-postası gönderildi.</span>
      ) : state === 'unavailable' ? (
        <span className="text-warning">E-posta gönderimi bu ortamda kapalı.</span>
      ) : state === 'error' ? (
        <span className="text-danger">{msg}</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === 'sending'}
          className="underline text-brand-deep disabled:opacity-50"
        >
          {state === 'sending' ? 'Gönderiliyor…' : 'Doğrulama e-postası gönder'}
        </button>
      )}
    </div>
  );
}
