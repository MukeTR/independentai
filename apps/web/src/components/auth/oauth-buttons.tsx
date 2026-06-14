import { enabledOAuthProviders, type OAuthProvider } from '@/server/oauth';

/**
 * Server component — sadece env'i yapılandırılmış provider'ları gösterir.
 * Hiçbiri yapılandırılmamışsa hiç render etmez (e-posta/şifre akışı aynı kalır).
 */
export function OAuthButtons({ label = 'ile devam et' }: { label?: string }) {
  const providers = enabledOAuthProviders();
  if (providers.length === 0) return null;

  return (
    <div>
      <div className="space-y-2.5">
        {providers.map((p) => (
          <a
            key={p.id}
            href={`/api/auth/oauth/${p.id}`}
            className="w-full h-12 rounded-full border-hairline border bg-paper-3 hover:border-ink transition-colors flex items-center justify-center gap-3 text-[14px] font-medium text-ink"
          >
            <ProviderIcon id={p.id} />
            {p.label} {label}
          </a>
        ))}
      </div>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-hairline" />
        <span className="text-[11px] text-ink-faint font-mono uppercase tracking-wider">veya</span>
        <div className="h-px flex-1 bg-hairline" />
      </div>
    </div>
  );
}

function ProviderIcon({ id }: { id: OAuthProvider }) {
  if (id === 'google') {
    return (
      <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden>
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z" />
      </svg>
    );
  }
  return (
    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden>
      <path fill="#0A66C2" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
    </svg>
  );
}
