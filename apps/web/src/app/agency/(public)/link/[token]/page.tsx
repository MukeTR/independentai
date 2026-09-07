import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { getActor } from '@/server/authz';
import { previewLinkRequest } from '@/server/agency';
import { AuthCentered } from '@/components/auth/auth-centered';
import { AgencyLinkAccept } from '@/components/agency/agency-link-accept';

export const metadata = { title: 'Ajans erişim isteği — Independent AI', robots: { index: false, follow: false } };

/** Marka sahibi için onay ekranı: ajans hesabınıza erişim istiyor; veri sizde kalır; istediğinizde kesebilirsiniz. */
export default async function AgencyLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valid = /^[A-Za-z0-9_-]{20,128}$/.test(token);
  const info = valid ? await previewLinkRequest(token) : null;
  const actor = await getActor();
  const next = `/agency/link/${encodeURIComponent(token)}`;
  const isBrandOwner = !!actor && !actor.viaAgency && actor.tenant.kind === 'BRAND' && actor.homeRole === 'OWNER';

  return (
    <AuthCentered>
      <div className="card p-7 sm:p-9 rise-1">
        <div className="eyebrow">Ajans erişim isteği</div>
        {!info ? (
          <>
            <h1 className="font-display text-[26px] tracking-tight mt-2">İstek geçersiz</h1>
            <p className="text-[14px] text-ink-muted mt-3">
              Bağlantı süresi dolmuş, kullanılmış veya iptal edilmiş olabilir. Ajanstan yeni bir bağlantı isteyin.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[26px] tracking-tight mt-2">
              {info.agencyName} hesabınıza erişim istiyor
            </h1>
            {info.agencyWebsite && (
              <p className="text-[12.5px] text-ink-faint font-mono mt-1">
                {info.agencyWebsite.replace(/^https?:\/\//, '')}
              </p>
            )}
            <ul className="mt-5 space-y-2 text-[13.5px] text-ink-muted">
              <li className="flex gap-2">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden /> Veriniz{' '}
                <b className="text-ink">size ait kalır</b>; ajans hesabınızı kendi portföyünde görür ve yönetir.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden /> Ajans üyeleri rollerine göre
                soru/rakip ekleyebilir ve ölçüm çalıştırabilir; hesabınızı silemez, sahipliği devredemez.
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden /> Bağlantıyı{' '}
                <b className="text-ink">istediğiniz zaman</b> kesebilirsiniz; hiçbir veri silinmez.
              </li>
            </ul>
            {!actor ? (
              <div className="mt-6 space-y-3">
                <p className="text-[13px] text-ink-muted">
                  Onaylamak için marka hesabınızın sahibi olarak giriş yapın.
                </p>
                <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary inline-flex">
                  Giriş yap
                </Link>
              </div>
            ) : !isBrandOwner ? (
              <div className="mt-6 text-[13px] text-danger" role="alert">
                Bu isteği yalnızca marka hesabının <b>sahibi</b> onaylayabilir. Şu an{' '}
                <span className="font-mono">{actor.email}</span> ile{' '}
                {actor.viaAgency
                  ? 'bir ajans üzerinden'
                  : actor.tenant.kind === 'AGENCY'
                    ? 'bir ajans hesabıyla'
                    : `${actor.homeRole} rolüyle`}{' '}
                girişlisiniz.
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-[13px] text-ink-muted mb-3">
                  Onaylanacak hesap: <b className="text-ink">{actor.tenant.name}</b>
                </p>
                <AgencyLinkAccept token={token} agencyName={info.agencyName} />
              </div>
            )}
          </>
        )}
      </div>
    </AuthCentered>
  );
}
