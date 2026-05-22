import Link from 'next/link';
import { requireSuperAdmin, listAllTenants } from '@/server/admin';

export default async function AdminTenants() {
  await requireSuperAdmin();
  const tenants = await listAllTenants();

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Tenants</h1>
      <p className="text-[14px] text-ink-muted mt-2">{tenants.length} tenant, hepsi lansman sürümünde.</p>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-paper-2 text-left text-[11px] uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-5 py-3 font-medium">Şirket</th>
              <th className="px-5 py-3 font-medium">Web</th>
              <th className="px-5 py-3 font-medium text-right">Kullanıcı</th>
              <th className="px-5 py-3 font-medium text-right">Marka</th>
              <th className="px-5 py-3 font-medium text-right">Rakip</th>
              <th className="px-5 py-3 font-medium text-right">Prompt</th>
              <th className="px-5 py-3 font-medium">Trial</th>
              <th className="px-5 py-3 font-medium">Kayıt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-ink-muted">
                  Henüz tenant yok.
                </td>
              </tr>
            )}
            {tenants.map((t) => {
              const trialDaysLeft = Math.max(
                0,
                Math.ceil((t.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
              );
              return (
                <tr key={t.id} className="hover:bg-paper-2/50 transition">
                  <td className="px-5 py-3">
                    <Link href={`/admin/tenants/${t.id}`} className="text-ink hover:text-brand-deep font-medium">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-ink-faint font-mono text-[11px]">{t.website ?? '—'}</td>
                  <td className="px-5 py-3 text-right tabular">{t._count.users}</td>
                  <td className="px-5 py-3 text-right tabular">{t._count.brands}</td>
                  <td className="px-5 py-3 text-right tabular">{t._count.competitors}</td>
                  <td className="px-5 py-3 text-right tabular">{t._count.prompts}</td>
                  <td className="px-5 py-3">
                    <span className={
                      trialDaysLeft > 30 ? 'text-positive' :
                      trialDaysLeft > 7 ? 'text-warning' : 'text-danger'
                    }>
                      {trialDaysLeft}g
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-faint text-[11px]">
                    {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
