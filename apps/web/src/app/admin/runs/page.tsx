import { requireSuperAdmin, listRecentRuns } from '@/server/admin';
import { PROVIDER_LABELS } from '@independentai/shared';

export default async function AdminRuns() {
  await requireSuperAdmin();
  const runs = await listRecentRuns(100);

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Run Kayıtları</h1>
      <p className="text-[14px] text-ink-muted mt-2">Son 100 model çalıştırması (tüm tenant'lar).</p>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-paper-2 text-left text-[10px] uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">Zaman</th>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Prompt</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium text-right">Mention</th>
              <th className="px-4 py-3 font-medium text-right">Token</th>
              <th className="px-4 py-3 font-medium text-right">Latency</th>
              <th className="px-4 py-3 font-medium">Mock?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-ink-muted">Henüz çalıştırma yok.</td>
              </tr>
            )}
            {runs.map((r) => (
              <tr key={r.id} className="hover:bg-paper-2/50 transition">
                <td className="px-4 py-2.5 font-mono text-[10.5px] text-ink-faint whitespace-nowrap">
                  {new Date(r.runDate).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
                <td className="px-4 py-2.5">{r.prompt.tenant.name}</td>
                <td className="px-4 py-2.5 max-w-[280px] truncate">{r.prompt.text}</td>
                <td className="px-4 py-2.5">
                  <span className="chip !text-[10px]">
                    {PROVIDER_LABELS[r.provider as keyof typeof PROVIDER_LABELS]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right tabular">{r._count.mentions}</td>
                <td className="px-4 py-2.5 text-right tabular text-ink-faint">{r.tokensUsed ?? '—'}</td>
                <td className="px-4 py-2.5 text-right tabular text-ink-faint">{r.latencyMs}ms</td>
                <td className="px-4 py-2.5">
                  {r.isMocked ? <span className="chip !text-[10px]">mock</span> : <span className="text-positive">●</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
