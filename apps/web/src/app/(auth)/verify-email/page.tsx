import Link from 'next/link';
import { AuthCentered } from '@/components/auth/auth-centered';
import { VerifyClient } from './verify-client';

export const metadata = { title: 'E-posta doğrulama — Independent AI', robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCentered>
      <div className="card p-7 sm:p-9 rise-1">
        <div className="eyebrow">Hesap</div>
        <h1 className="font-display text-[26px] tracking-tight mt-2">E-posta doğrulama</h1>
        <div className="mt-6">
          {token ? (
            <VerifyClient token={token} />
          ) : (
            <p className="text-[14px] text-ink-muted">
              Bağlantı eksik. Panelden yeni bir doğrulama e-postası isteyebilirsiniz.{' '}
              <Link href="/dashboard" className="text-brand hover:underline">
                Panele git
              </Link>
            </p>
          )}
        </div>
      </div>
    </AuthCentered>
  );
}
