import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSuperAdmin, getTenantDetail } from '@/server/admin';

export default async function AdminTenantDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const tenant = await getTenantDetail(id);
  if (!tenant) notFound();

  const trialDaysLeft = Math.max(
    0,
    Math.ceil((tenant.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );

  return (
    <div className="max-w-5xl">
      <Link href="/admin/tenants" className="text-[12px] text-ink-faint hover:text-ink">← Tenants</Link>
      <div className="eyebrow mt-4">Tenant</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">{tenant.name}</h1>
      <div className="flex items-center gap-3 mt-3 text-[12px] text-ink-muted font-mono">
        <span>{tenant.website ?? '—'}</span>
        <span>·</span>
        <span>kayıt: {new Date(tenant.createdAt).toLocaleDateString('tr-TR')}</span>
        <span>·</span>
        <span className={trialDaysLeft > 30 ? 'text-positive' : trialDaysLeft > 7 ? 'text-warning' : 'text-danger'}>
          trial: {trialDaysLeft} gün kaldı
        </span>
      </div>

      <div className="grid grid-cols-2 gap-5 mt-8">
        {/* Users */}
        <div className="card p-6">
          <div className="eyebrow">Kullanıcılar ({tenant.users.length})</div>
          <ul className="mt-4 divide-y divide-hairline">
            {tenant.users.map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-[13px]">{u.email}</div>
                  <div className="text-[10.5px] text-ink-faint font-mono">{u.role}</div>
                </div>
                {u.isSuperAdmin && <span className="chip own !text-[10px]">super</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* Brand + competitors */}
        <div className="card p-6">
          <div className="eyebrow">Marka & Rakipler</div>
          <div className="mt-4">
            <div className="text-[11px] text-ink-faint uppercase tracking-wider mb-2">Kendi markası</div>
            {tenant.brands.length === 0 && <div className="text-[12px] text-ink-muted">Henüz marka yok</div>}
            {tenant.brands.map((b) => (
              <div key={b.id} className="text-[13px] mb-2">
                <span className="chip own">{b.name}</span>
                <span className="text-[11px] text-ink-faint ml-2">{b.aliases.length} alias</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="text-[11px] text-ink-faint uppercase tracking-wider mb-2">Rakipler ({tenant.competitors.length})</div>
            <div className="flex flex-wrap gap-2">
              {tenant.competitors.map((c) => (
                <span key={c.id} className="chip comp">{c.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prompts */}
      <div className="card mt-5 overflow-hidden">
        <div className="px-6 py-4 border-b-hairline border-hairline">
          <div className="eyebrow">Promptlar ({tenant.prompts.length})</div>
        </div>
        <div className="divide-y divide-hairline">
          {tenant.prompts.length === 0 && (
            <div className="px-6 py-8 text-center text-ink-muted text-[13px]">Henüz prompt eklemedi</div>
          )}
          {tenant.prompts.map((p) => (
            <div key={p.id} className="px-6 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[13px] truncate">{p.text}</div>
                <div className="text-[10.5px] text-ink-faint font-mono mt-0.5">
                  {p._count.runs} çalıştırma · {p.isActive ? 'aktif' : 'pasif'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
