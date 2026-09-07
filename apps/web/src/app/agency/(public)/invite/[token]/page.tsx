import Link from 'next/link';
import { getActor } from '@/server/authz';
import { previewAgencyInvite } from '@/server/agency';
import { AuthCentered } from '@/components/auth/auth-centered';
import { AgencyInviteAccept } from '@/components/agency/agency-invite-accept';
import { AGENCY_ROLE_LABEL } from '@/components/agency/format';

export const metadata = { title: 'Ajans daveti — Independent AI', robots: { index: false, follow: false } };

/** Ajans davet linki: giriş yoksa giriş/kayıt (aynı e-postayla) ve geri dönüş; girişliyse kabul. */
export default async function AgencyInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{20,128}$/.test(token);
  const invite = valid ? await previewAgencyInvite(token) : null;
  const actor = await getActor();
  const next = `/agency/invite/${encodeURIComponent(token)}`;

  return (
    <AuthCentered>
      <div className="card p-7 sm:p-9 rise-1">
        <div className="eyebrow">Ajans daveti</div>
        {!invite ? (
          <>
            <h1 className="font-display text-[26px] tracking-tight mt-2">Davet geçersiz</h1>
            <p className="text-[14px] text-ink-muted mt-3">
              Bağlantı süresi dolmuş veya iptal edilmiş olabilir. Davet eden kişiden yeni bir bağlantı isteyin.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[26px] tracking-tight mt-2">{invite.agencyName} ajans ekibine katılın</h1>
            <p className="text-[14px] text-ink-muted mt-3">
              <span className="font-mono">{invite.email}</span> adresine <b>{AGENCY_ROLE_LABEL[invite.role]}</b> rolüyle
              davet edildiniz.
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
              <div className="mt-6 text-[13px] text-danger" role="alert">
                Şu an <span className="font-mono">{actor.email}</span> ile girişlisiniz. Daveti kabul etmek için{' '}
                {invite.email} hesabıyla giriş yapın.
              </div>
            ) : actor.agency ? (
              <div className="mt-6 text-[13px] text-warning" role="alert">
                Zaten bir ajansın üyesisiniz ({actor.agency.name}). Bir kullanıcı aynı anda tek ajansa bağlı olabilir.
              </div>
            ) : (
              <div className="mt-6">
                <AgencyInviteAccept
                  token={token}
                  agencyName={invite.agencyName}
                  currentTenantName={actor.tenant.name}
                />
              </div>
            )}
          </>
        )}
      </div>
    </AuthCentered>
  );
}
