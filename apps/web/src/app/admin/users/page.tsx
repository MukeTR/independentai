import Link from 'next/link';
import { requireSuperAdmin, listAllUsers } from '@/server/admin';

export default async function AdminUsers() {
  await requireSuperAdmin();
  const users = await listAllUsers();

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Kullanıcılar</h1>
      <p className="text-[14px] text-ink-muted mt-2">{users.length} kayıtlı kullanıcı.</p>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-paper-2 text-left text-[11px] uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-5 py-3 font-medium">E-posta</th>
              <th className="px-5 py-3 font-medium">Şirket</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Kayıt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center py-12 text-ink-muted">Henüz kullanıcı yok.</td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-paper-2/50 transition">
                <td className="px-5 py-3 font-mono text-[12px]">{u.email}</td>
                <td className="px-5 py-3">
                  <Link href={`/admin/tenants/${u.tenant.id}`} className="hover:text-brand-deep">
                    {u.tenant.name}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="chip !text-[10px]">{u.role}</span>
                  {u.isSuperAdmin && <span className="chip own !text-[10px] ml-1">super</span>}
                </td>
                <td className="px-5 py-3 text-ink-faint text-[11px]">
                  {new Date(u.createdAt).toLocaleString('tr-TR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
