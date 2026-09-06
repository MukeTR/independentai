import Link from 'next/link';
import { getActor } from '@/server/authz';
import { previewInvite } from '@/server/team';
import { AuthCentered } from '@/components/auth/auth-centered';
import { InviteAccept } from './invite-accept';

export const metadata = { title: 'Ekip daveti — Independent AI', robots: { index: false, follow: false } };

/**
 * Davet linki: giriş yoksa → kayıt/giriş (aynı e-postayla) ve geri dönüş; girişliyse kabul butonu.
 */
export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = token ? await previewInvite(token) : null;
  const actor = await getActor();
  const next = `/invite?token=${encodeURIComponent(token ?? '')}`;

  return (
    <AuthCentered>
      <div className="card p-7 sm:p-9 rise-1">
        <div className="eyebrow">Ekip daveti</div>
        {!invite ? (
          <>
            <h1 className="font-display text-[26px] tracking-tight mt-2">Davet geçersiz</h1>
            <p className="text-[14px] text-ink-muted mt-3">
              Bağlantı süresi dolmuş veya iptal edilmiş olabilir. Davet eden kişiden yeni bir bağlantı isteyin.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[26px] tracking-tight mt-2">{invite.tenantName} ekibine katılın</h1>
            <p className="text-[14px] text-ink-muted mt-3">
              <span className="font-mono">{invite.email}</span> adresine <b>{invite.role}</b> rolüyle davet edildiniz.
            </p>
            {!actor ? (
              <div className="mt-6 space-y-3">
                <p className="text-[13px] text-ink-muted">
                  Devam etmek için bu e-posta ile giriş yapın veya hesap oluşturun.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary">
                    Giriş yap
                  </Link>
                  <Link href={`/register?next=${encodeURIComponent(next)}`} className="btn-secondary">
                    Hesap oluştur
                  </Link>
                </div>
              </div>
            ) : actor.email !== invite.email ? (
              <div className="mt-6 text-[13px] text-danger">
                Şu an <span className="font-mono">{actor.email}</span> ile girişlisiniz. Daveti kabul etmek için{' '}
                {invite.email} hesabıyla giriş yapın.
              </div>
            ) : (
              <div className="mt-6">
                <InviteAccept token={token!} tenantName={invite.tenantName} currentTenantName={actor.tenant.name} />
              </div>
            )}
          </>
        )}
      </div>
    </AuthCentered>
  );
}
