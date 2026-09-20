import { requireSuperAdmin } from '@/server/authz';
import { listReferenceLogos } from '@/server/reference-logos';
import { MetricCard } from '@/components/metric-card';
import { ReferenceLogoForm } from './reference-logo-form';
import { ReferenceLogoRow } from './reference-logo-row';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Referanslar — Admin', robots: { index: false, follow: false } };

const fmt = (d: Date) =>
  d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' });

/**
 * /admin/referanslar — landing'deki referans şeridini yönetir: ekle, düzenle, yayında/gizli,
 * sırala, sil. Logo dosyası yüklenmez; https bağlantı ya da repodaki /img/… yolu girilir.
 */
export default async function AdminReferenceLogos() {
  await requireSuperAdmin();
  const items = await listReferenceLogos();
  const live = items.filter((r) => r.published).length;

  const view = items.map((r, i) => ({
    id: r.id,
    name: r.name,
    logoUrl: r.logoUrl,
    siteUrl: r.siteUrl,
    sector: r.sector,
    order: r.order,
    published: r.published,
    createdAt: fmt(r.createdAt),
    isFirst: i === 0,
    isLast: i === items.length - 1,
  }));

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Referanslar</h1>
      <p className="text-[14px] text-ink-muted mt-2 max-w-2xl">
        Buradaki logolar ana sayfada, hero'nun hemen altındaki şeritte gri tonda görünür; fareyle üzerine gelindiğinde
        renklenir. Yayında hiç kayıt yoksa şerit hiç çizilmez. Sıra, şeritteki soldan sağa dizilimdir.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
        <MetricCard label="Kayıt" value={items.length} tone="brand" />
        <MetricCard label="Yayında" value={live} hint="Ana sayfadaki şeritte görünen logo sayısı" />
      </div>

      <div className="mt-8">
        <ReferenceLogoForm />
      </div>

      <div className="card mt-8 overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[820px] text-[13px]">
            <thead className="bg-paper-2 text-left text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Logo</th>
                <th className="px-5 py-3 font-medium">Ad</th>
                <th className="px-5 py-3 font-medium">Sektör</th>
                <th className="px-5 py-3 font-medium">Site</th>
                <th className="px-5 py-3 font-medium">Durum</th>
                <th className="px-5 py-3 font-medium text-right">Sıra</th>
                <th className="px-5 py-3 font-medium text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {view.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-ink-muted">
                    Henüz referans yok. Yukarıdaki formla ilk logoyu ekleyin.
                  </td>
                </tr>
              )}
              {view.map((r) => (
                <ReferenceLogoRow key={r.id} variant="row" item={r} />
              ))}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden divide-y divide-hairline" aria-label="Referans logoları">
          {view.length === 0 && <li className="p-6 text-center text-ink-muted text-[14px]">Henüz referans yok.</li>}
          {view.map((r) => (
            <ReferenceLogoRow key={r.id} variant="card" item={r} />
          ))}
        </ul>
      </div>

      <p className="text-[11.5px] text-ink-faint mt-3">
        Not: logo bağlantısı sunucuda indirilmez, doğrudan tarayıcıya verilir. Dış bir adres verirseniz o adresin
        erişilebilir kalması sizin elinizde; kalıcı olması gereken logoları repoya{' '}
        <span className="font-mono">/public/img/…</span> altına koyup <span className="font-mono">/img/…</span> yolunu
        girin.
      </p>
    </div>
  );
}
