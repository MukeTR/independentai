import Link from 'next/link';
import { AuthCentered } from '@/components/auth/auth-centered';
import { ResetForm } from './reset-form';

export const metadata = { title: 'Şifre sıfırla — Independent AI', robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCentered>
      <div className="card p-7 sm:p-9 rise-1">
        <div className="eyebrow">Hesap kurtarma</div>
        <h1 className="font-display text-[26px] tracking-tight mt-2">Yeni şifre belirle</h1>
        {token ? (
          <div className="mt-6">
            <ResetForm token={token} />
          </div>
        ) : (
          <p className="text-[14px] text-ink-muted mt-4">
            Bağlantı eksik.{' '}
            <Link href="/forgot-password" className="text-brand hover:underline">
              Yeni bir sıfırlama isteyin
            </Link>
            .
          </p>
        )}
      </div>
    </AuthCentered>
  );
}
