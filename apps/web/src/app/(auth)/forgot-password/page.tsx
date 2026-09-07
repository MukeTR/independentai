import Link from 'next/link';
import { AuthCentered } from '@/components/auth/auth-centered';
import { ForgotForm } from './forgot-form';

export const metadata = { title: 'Şifremi unuttum — Independent AI', robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthCentered>
      <div className="card p-7 sm:p-9 rise-1">
        <div className="eyebrow">Hesap kurtarma</div>
        <h1 className="font-display text-[26px] tracking-tight mt-2">Şifremi unuttum</h1>
        <p className="text-[14px] text-ink-muted mt-2">
          E-posta adresinizi girin; kayıtlıysa 1 saat geçerli bir sıfırlama bağlantısı gönderelim.
        </p>
        <div className="mt-6">
          <ForgotForm />
        </div>
        <p className="text-center text-[13px] text-ink-muted mt-6">
          <Link href="/login" className="text-brand hover:underline">
            Girişe dön
          </Link>
        </p>
      </div>
    </AuthCentered>
  );
}
