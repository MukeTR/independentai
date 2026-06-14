import Link from 'next/link';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthSplit } from '@/components/auth/auth-split';
import { LoginForm } from './login-form';

const OAUTH_ERRORS: Record<string, string> = {
  oauth_unavailable: 'Bu giriş yöntemi şu an kullanılamıyor.',
  oauth_denied: 'Giriş iptal edildi.',
  oauth_state: 'Oturum doğrulaması başarısız oldu. Lütfen tekrar deneyin.',
  oauth_failed: 'Sosyal giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.',
  oauth_no_email: 'Hesabınızdan e-posta alınamadı. E-posta ile kayıt olabilirsiniz.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const oauthError = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <AuthSplit>
      <div className="eyebrow">Tekrar hoş geldiniz</div>
      <h1 className="font-display text-[32px] tracking-tight mt-2">Giriş yap</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Markanızın AI'daki konumunu izlemeye devam edin.
      </p>

      {oauthError && (
        <div className="text-[13px] text-danger bg-danger/5 border-hairline border-danger/20 rounded-lg p-3 mt-6">
          {oauthError}
        </div>
      )}

      <div className="mt-8">
        <OAuthButtons />
        <LoginForm />
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
