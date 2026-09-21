import { requireSuperAdmin } from '@/server/authz';
import { listBlockedSites } from '@/server/blocked-sites-admin';
import { MetricCard } from '@/components/metric-card';
import { BlockedSiteForm, BlocklistTester } from './blocked-site-form';
import { BlockedSiteRow } from './blocked-site-row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Yasaklı siteler — Admin', robots: { index: false, follow: false } };

const fmt = (d: Date) =>
  d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' });

/**
 * /admin/blocked-sites — alan adı + YouTube yönlendirmesi ekle/düzenle/sil, isabet sayısı, "Test et" kutusu.
 * `?hostname=` ile form ön-dolu gelir (/admin/scans "Yasakla" aksiyonu).
 */
export default async function AdminBlockedSites({
  searchParams,
}: {
  searchParams: Promise<{ hostname?: string | string[] }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const prefill = typeof sp.hostname === 'string' ? sp.hostname.slice(0, 253) : '';
  const items = await listBlockedSites();
  const hits = items.reduce((a, r) => a + r.hits, 0);

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Yasaklı siteler</h1>
      <p className="text-[14px] text-ink-muted mt-2 max-w-2xl">
        Listedeki alan adları (ve alt alan adları) hiçbir araçta taranmaz; ziyaretçi alan adını girdiği anda
        belirlediğiniz YouTube bağlantısına yönlendirilir. Yönlendirme hedefi yalnızca youtube.com / youtu.be olabilir.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
        <MetricCard label="Kayıt" value={items.length} tone="brand" />
        <MetricCard label="Toplam isabet" value={hits} hint="Engellenen tarama denemesi (sunucu)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,320px)] gap-5 mt-8 items-start">
        <BlockedSiteForm initialHostname={prefill} />
        <BlocklistTester />
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead className="bg-paper-2 text-left text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Alan adı</th>
                <th className="px-5 py-3 font-medium">Yönlendirme</th>
                <th className="px-5 py-3 font-medium">Not</th>
                <th className="px-5 py-3 font-medium text-right">İsabet</th>
                <th className="px-5 py-3 font-medium">Eklendi</th>
                <th className="px-5 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-ink-muted">
                    Henüz yasaklı site yok. Yukarıdaki formla ilk alan adını ekleyin.
                  </td>
                </tr>
              )}
              {items.map((r) => (
                <BlockedSiteRow
                  key={r.id}
                  variant="row"
                  site={{
                    id: r.id,
                    hostname: r.hostname,
                    redirectUrl: r.redirectUrl,
                    note: r.note,
                    hits: r.hits,
                    createdAt: fmt(r.createdAt),
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden divide-y divide-hairline" aria-label="Yasaklı siteler">
          {items.length === 0 && (
            <li className="p-6 text-center text-ink-muted text-[14px]">Henüz yasaklı site yok.</li>
          )}
          {items.map((r) => (
            <BlockedSiteRow
              key={r.id}
              variant="card"
              site={{
                id: r.id,
                hostname: r.hostname,
                redirectUrl: r.redirectUrl,
                note: r.note,
                hits: r.hits,
                createdAt: fmt(r.createdAt),
              }}
            />
          ))}
        </ul>
      </div>
      <p className="text-[11.5px] text-ink-faint mt-3">
        Not: sunucu tarafı eşleşme 60 saniyelik bellek önbelleği kullanır; değişiklik diğer sunucu örneklerinde en geç
        bir dakikada etkinleşir.
      </p>
    </div>
  );
}
