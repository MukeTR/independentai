import Link from 'next/link';
import { Suspense } from 'react';
import { requireSuperAdmin, listAdminTenants, type AdminTenantRow } from '@/server/admin';
import { computeEntitlement } from '@/server/entitlement';
import { DataTable, CursorNav, type DataColumn } from '@/components/admin/data-table';
import { SearchBox } from '@/components/admin/search-box';
import { StagePills } from '@/components/admin/stage-pills';
import { ScreenGuide } from '@/components/admin/screen-guide';
import { fmtDate } from '@/lib/admin-format';

export const dynamic = 'force-dynamic';

type Search = { q?: string; cursor?: string; trial?: string };

function TrialCell({ t }: { t: AdminTenantRow }) {
  const ent = computeEntitlement({ plan: t.plan, trialEndsAt: t.trialEndsAt });
  if (t.plan !== 'LAUNCH') return <span className="text-positive">{t.plan}</span>;
  const d = ent.trialDaysLeft;
  return (
    <span className={d > 30 ? 'text-positive' : d > 7 ? 'text-warning' : 'text-danger'}>
      {d} g{!ent.active ? ' · salt-okunur' : ''}
    </span>
  );
}

export default async function AdminTenants({ searchParams }: { searchParams: Promise<Search> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 120) || undefined;
  const cursor = sp.cursor || undefined;
  const trial = sp.trial === '7d' ? '7d' : sp.trial === '30d' ? '30d' : undefined;
  const page = await listAdminTenants({
    q,
    cursor,
    take: 50,
    trialEndingDays: trial === '7d' ? 7 : trial === '30d' ? 30 : undefined,
  });

  const qsOf = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `?${s}` : '';
  };

  const columns: DataColumn<AdminTenantRow>[] = [
    {
      key: 'name',
      header: 'Şirket',
      cell: (t) => (
        <Link href={`/admin/tenants/${t.id}`} className="text-ink hover:text-brand-deep font-medium">
          {t.name}
          {t.kind === 'AGENCY' && <span className="chip !text-[10px] ml-1.5">ajans</span>}
          {!t.onboardingCompletedAt && <span className="chip !text-[10px] ml-1.5">kurulum eksik</span>}
        </Link>
      ),
    },
    {
      key: 'web',
      header: 'Web',
      cell: (t) => <span className="text-ink-faint font-mono text-[11px] break-all">{t.website ?? '—'}</span>,
    },
    { key: 'users', header: 'Kullanıcı', align: 'right', cell: (t) => t._count.users },
    { key: 'brands', header: 'Marka', align: 'right', cell: (t) => t._count.brands },
    { key: 'competitors', header: 'Rakip', align: 'right', cell: (t) => t._count.competitors },
    { key: 'prompts', header: 'Soru', align: 'right', cell: (t) => t._count.prompts },
    { key: 'trial', header: 'Deneme / plan', cell: (t) => <TrialCell t={t} /> },
    {
      key: 'created',
      header: 'Kayıt',
      cell: (t) => <span className="text-ink-faint text-[11px]">{fmtDate(t.createdAt)}</span>,
    },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Super Admin</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Şirketler (tenant)</h1>
          <p className="text-[14px] text-ink-muted mt-2">{page.total.toLocaleString('tr-TR')} şirket.</p>
        </div>
        <ScreenGuide className="mt-1" />
      </div>

      <StagePills
        className="mt-6"
        ariaLabel="Deneme filtresi"
        pills={[
          { key: 'all', label: 'Tümü', href: `/admin/tenants${qsOf({ q })}`, active: !trial },
          {
            key: '7d',
            label: 'Deneme 7 gün içinde bitiyor',
            href: `/admin/tenants${qsOf({ q, trial: '7d' })}`,
            active: trial === '7d',
            tone: 'danger',
          },
          {
            key: '30d',
            label: '30 gün içinde',
            href: `/admin/tenants${qsOf({ q, trial: '30d' })}`,
            active: trial === '30d',
            tone: 'warning',
          },
        ]}
      />

      <Suspense fallback={<div className="input mt-4 min-h-[44px] max-w-md" aria-hidden="true" />}>
        <SearchBox placeholder="Şirket adı ya da web sitesi ara…" className="mt-4 max-w-md" />
      </Suspense>

      <DataTable
        className="mt-5"
        caption="Şirket listesi"
        columns={columns}
        rows={page.items}
        rowKey={(t) => t.id}
        empty={q || trial ? 'Filtreyle eşleşen şirket yok.' : 'Henüz şirket yok.'}
        minWidth={860}
        mobileRow={(t) => (
          <div>
            <div className="flex items-center justify-between gap-2">
              <Link href={`/admin/tenants/${t.id}`} className="font-medium hover:text-brand-deep">
                {t.name}
              </Link>
              <TrialCell t={t} />
            </div>
            <div className="text-[12px] text-ink-muted mt-1 font-mono break-all">{t.website ?? '—'}</div>
            <div className="text-[12px] text-ink-muted mt-1">
              {t._count.users} kullanıcı · {t._count.brands} marka · {t._count.competitors} rakip · {t._count.prompts}{' '}
              soru
            </div>
          </div>
        )}
      />

      <CursorNav
        className="mt-4"
        nextCursor={page.nextCursor}
        basePath="/admin/tenants"
        params={{ q, trial, cursor }}
        shown={page.items.length}
        total={page.total}
      />
    </div>
  );
}
