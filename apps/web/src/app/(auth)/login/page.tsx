import Link from 'next/link';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthSplit } from '@/components/auth/auth-split';
import { Suspense } from 'react';
import { LoginForm } from './login-form';

const OAUTH_ERRORS: Record<string, string> = {
  oauth_unavailable: 'Bu giriş yöntemi şu an kullanılamıyor.',
  oauth_denied: 'Giriş iptal edildi.',
  oauth_state: 'Oturum doğrulaması başarısız oldu. Lütfen tekrar deneyin.',
  oauth_failed: 'Sosyal giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.',
  oauth_no_email: 'Hesabınızdan e-posta alınamadı. E-posta ile kayıt olabilirsiniz.',
  oauth_email_unverified:
    'Bu e-posta ile zaten bir hesap var ve sosyal hesabınızın e-postası doğrulanmamış. Güvenlik için şifrenizle giriş yapın.',
  oauth_conflict: 'Bu e-posta ile zaten bir hesap var. Şifrenizle giriş yapın.',
  session_expired: 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string; reset?: string }>;
}) {
  const { error, verified, reset } = await searchParams;
  const oauthError = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <AuthSplit>
      <div className="eyebrow">Tekrar hoş geldiniz</div>
      <h1 className="font-display text-[32px] tracking-tight mt-2">Giriş yap</h1>
      <p className="text-[14px] text-ink-muted mt-2">Markanızın AI'daki konumunu izlemeye devam edin.</p>

      {verified === '1' && (
        <div
          role="status"
          className="text-[13px] text-positive bg-positive/5 border-hairline border-positive/20 rounded-lg p-3 mt-6"
        >
          E-posta adresiniz doğrulandı. Giriş yapabilirsiniz.
        </div>
      )}
      {reset === '1' && (
        <div
          role="status"
          className="text-[13px] text-positive bg-positive/5 border-hairline border-positive/20 rounded-lg p-3 mt-6"
        >
          Şifreniz güncellendi. Yeni şifrenizle giriş yapın.
        </div>
      )}
      {oauthError && (
        <div className="text-[13px] text-danger bg-danger/5 border-hairline border-danger/20 rounded-lg p-3 mt-6">
          {oauthError}
        </div>
      )}

      <div className="mt-8">
        <OAuthButtons />
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="text-center text-[13px] text-ink-muted mt-6">
        Hesabınız yok mu?{' '}
        <Link href="/register" className="text-brand hover:underline">
          Ücretsiz oluşturun
        </Link>
      </p>
    </AuthSplit>
  );
}
