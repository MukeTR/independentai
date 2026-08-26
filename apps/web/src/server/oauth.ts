import { randomBytes } from 'node:crypto';
import { prisma } from '@/server/prisma';
import { FREE_TRIAL_MONTHS } from '@independentai/shared';
import { ensureAlertConfig } from './notify';

/**
 * Bağımlılıksız OAuth 2.0 / OIDC akışı (Google + LinkedIn).
 * Provider yapılandırılmadıysa (env yoksa) ilgili buton gizlenir, mevcut
 * e-posta/şifre girişi etkilenmez. Başarılı girişte mevcut `iai_token`
 * JWT oturumu kurulur — yani Supabase/NextAuth gibi ek bir sistem yok.
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
    // "Sign In with LinkedIn using OpenID Connect"
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

/** Yapılandırılmış (env'i tam) provider'ların listesi — UI butonları için. */
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
  if (p === 'google') {
    // Refresh gerektirmiyoruz; sadece kimlik. Yeniden onay istemeden devam.
    params.set('prompt', 'select_account');
  }
  return `${meta.authorizeUrl}?${params.toString()}`;
}

type NormalizedProfile = { sub: string; email: string | null; name: string | null; picture: string | null };

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
  });
  if (!tokenRes.ok) {
    throw new Error(`Token değişimi başarısız (${p}): ${tokenRes.status}`);
  }
  const token = (await tokenRes.json()) as { access_token?: string };
  if (!token.access_token) throw new Error(`access_token alınamadı (${p})`);

  const infoRes = await fetch(meta.userInfoUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!infoRes.ok) throw new Error(`Profil alınamadı (${p}): ${infoRes.status}`);
  const info = (await infoRes.json()) as Record<string, unknown>;

  // Google ve LinkedIn OIDC userinfo aynı standart alanları döner.
  const sub = String(info.sub ?? '');
  if (!sub) throw new Error(`Profil "sub" içermiyor (${p})`);
  return {
    sub,
    email: typeof info.email === 'string' ? info.email.toLowerCase() : null,
    name:
      (typeof info.name === 'string' && info.name) ||
      [info.given_name, info.family_name].filter(Boolean).join(' ').trim() ||
      null,
    picture: typeof info.picture === 'string' ? info.picture : null,
  };
}

/**
 * Profili kullanıcıya eşler:
 *  - (provider, sub) ile varsa → o kullanıcı.
 *  - Aynı e-postalı bir kullanıcı varsa → OAuth bağlantısını ona ekler (link).
 *  - Hiçbiri yoksa → yeni Tenant + User (6 ay trial) oluşturur, onboarding'e gönderir.
 */
export async function upsertOAuthUser(
  provider: OAuthProvider,
  profile: NormalizedProfile,
): Promise<{ userId: string; tenantId: string; email: string; isNew: boolean }> {
  // 1) Daha önce bu sosyal hesapla giriş yapılmış mı?
  const byOauth = await prisma.user.findFirst({
    where: { oauthProvider: provider, oauthSub: profile.sub },
  });
  if (byOauth) {
    return { userId: byOauth.id, tenantId: byOauth.tenantId, email: byOauth.email, isNew: false };
  }

  // 2) Aynı e-posta ile şifreli/başka bir hesap var mı? → bağla.
  if (profile.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      const updated = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          oauthProvider: provider,
          oauthSub: profile.sub,
          avatarUrl: byEmail.avatarUrl ?? profile.picture ?? undefined,
          name: byEmail.name ?? profile.name ?? undefined,
        },
      });
      return { userId: updated.id, tenantId: updated.tenantId, email: updated.email, isNew: false };
    }
  }

  // 3) Yeni kullanıcı: Tenant + User oluştur.
  const email = profile.email ?? `${provider}_${profile.sub}@users.independentai.space`;
  const tenantName = profile.name || email.split('@')[0] || 'Markam';

  const trialEndsAt = new Date();
  trialEndsAt.setMonth(trialEndsAt.getMonth() + FREE_TRIAL_MONTHS);

  const tenant = await prisma.tenant.create({ data: { name: tenantName, trialEndsAt } });
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      name: profile.name,
      avatarUrl: profile.picture,
      oauthProvider: provider,
      oauthSub: profile.sub,
      role: 'OWNER',
    },
  });
  // Bildirim tercihleri varsayılanla oluşsun (kayıt akışıyla aynı davranış).
  await ensureAlertConfig(tenant.id);

  return { userId: user.id, tenantId: tenant.id, email: user.email, isNew: true };
}
