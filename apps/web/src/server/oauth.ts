import { randomBytes } from 'node:crypto';

/**
 * Bağımlılıksız OAuth 2.0 / OIDC akışı (Google + LinkedIn).
 * Provider yapılandırılmadıysa ilgili buton gizlenir. Başarılı girişte `iai_token` JWT kurulur.
 * Kullanıcı eşleme mantığı accounts.ts → upsertOAuthUser (doğrulanmış e-posta şartı).
 */

export type OAuthProvider = 'google' | 'linkedin';

export type ProviderMeta = {
  id: OAuthProvider;
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
  clientIdEnv: string;
  clientSecretEnv: string;
};

const PROVIDERS: Record<OAuthProvider, ProviderMeta> = {
  google: {
    id: 'google',
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
    clientIdEnv: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_OAUTH_CLIENT_SECRET',
  },
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    userInfoUrl: 'https://api.linkedin.com/v2/userinfo',
    scope: 'openid profile email',
    clientIdEnv: 'LINKEDIN_OAUTH_CLIENT_ID',
    clientSecretEnv: 'LINKEDIN_OAUTH_CLIENT_SECRET',
  },
};

export function isOAuthProvider(v: string): v is OAuthProvider {
  return v === 'google' || v === 'linkedin';
}

function credentials(p: OAuthProvider): { clientId: string; clientSecret: string } | null {
  const meta = PROVIDERS[p];
  const clientId = process.env[meta.clientIdEnv];
  const clientSecret = process.env[meta.clientSecretEnv];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function enabledOAuthProviders(): { id: OAuthProvider; label: string }[] {
  return (Object.keys(PROVIDERS) as OAuthProvider[])
    .filter((p) => credentials(p) !== null)
    .map((p) => ({ id: p, label: PROVIDERS[p].label }));
}

export const OAUTH_STATE_COOKIE = 'iai_oauth_state';

export function makeState(): string {
  return randomBytes(20).toString('hex');
}

export function redirectUri(origin: string, p: OAuthProvider): string {
  return `${origin}/api/auth/oauth/${p}/callback`;
}

export function buildAuthorizeUrl(p: OAuthProvider, origin: string, state: string): string {
  const creds = credentials(p);
  if (!creds) throw new Error(`OAuth provider yapılandırılmamış: ${p}`);
  const meta = PROVIDERS[p];
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: creds.clientId,
    redirect_uri: redirectUri(origin, p),
    scope: meta.scope,
    state,
  });
  if (p === 'google') params.set('prompt', 'select_account');
  return `${meta.authorizeUrl}?${params.toString()}`;
}

export type NormalizedProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

export async function exchangeAndFetchProfile(
  p: OAuthProvider,
  code: string,
  origin: string,
): Promise<NormalizedProfile> {
  const creds = credentials(p);
  if (!creds) throw new Error(`OAuth provider yapılandırılmamış: ${p}`);
  const meta = PROVIDERS[p];

  const tokenRes = await fetch(meta.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(origin, p),
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenRes.ok) throw new Error(`Token değişimi başarısız (${p}): ${tokenRes.status}`);
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error(`access_token alınamadı (${p})`);

  const infoRes = await fetch(meta.userInfoUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!infoRes.ok) throw new Error(`Profil alınamadı (${p}): ${infoRes.status}`);
  const info = (await infoRes.json()) as Record<string, unknown>;

  const sub = String(info.sub ?? '');
  if (!sub) throw new Error(`Profil "sub" içermiyor (${p})`);
  // OIDC standardı: email_verified boolean (Google) — LinkedIn OIDC de aynı alanı döner.
  const ev = info.email_verified;
  const emailVerified = ev === true || ev === 'true';
  return {
    sub,
    email: typeof info.email === 'string' ? info.email.toLowerCase() : null,
    emailVerified,
    name:
      (typeof info.name === 'string' && info.name) ||
      [info.given_name, info.family_name].filter(Boolean).join(' ').trim() ||
      null,
    picture: typeof info.picture === 'string' ? info.picture : null,
  };
}

export { upsertOAuthUser } from './accounts';
