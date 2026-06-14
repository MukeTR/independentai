import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthSplit } from '@/components/auth/auth-split';
import { RegisterForm } from './register-form';

const OAUTH_ERRORS: Record<string, string> = {
  oauth_unavailable: 'Bu giriş yöntemi şu an kullanılamıyor.',
  oauth_denied: 'Kayıt iptal edildi.',
  oauth_state: 'Oturum doğrulaması başarısız oldu. Lütfen tekrar deneyin.',
  oauth_failed: 'Sosyal kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.',
  oauth_no_email: 'Hesabınızdan e-posta alınamadı. E-posta ile kayıt olabilirsiniz.',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const oauthError = error ? OAUTH_ERRORS[error] : undefined;

  return (
    <AuthSplit>
      <div className="chip mb-5">
        <Sparkles className="w-3 h-3 text-brand" />
        <span className="font-mono">İlk 6 ay tamamen ücretsiz</span>
      </div>
      <h1 className="font-display text-[32px] tracking-tight">Hesap oluştur</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Kredi kartı gerekmez. Kayıt anında 6 aylık tam erişim başlar.
      </p>

      {oauthError && (
        <div className="text-[13px] text-danger bg-danger/5 border-hairline border-danger/20 rounded-lg p-3 mt-6">
          {oauthError}
        </div>
      )}

      <div className="mt-8">
        <OAuthButtons label="ile kaydol" />
        <RegisterForm />
      </div>

      <p className="text-center text-[13px] text-ink-muted mt-6">
        Zaten hesabınız var mı?{' '}
        <Link href="/login" className="text-brand hover:underline">
          Giriş yapın
        </Link>
      </p>
    </AuthSplit>
  );
}
