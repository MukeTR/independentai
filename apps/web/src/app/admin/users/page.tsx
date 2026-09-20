import Link from 'next/link';
import { Suspense } from 'react';
import { requireSuperAdmin, listAdminUsers, userStatusBadge, type AdminUserRow } from '@/server/admin';
import { DataTable, CursorNav, type DataColumn } from '@/components/admin/data-table';
import { SearchBox } from '@/components/admin/search-box';
import { ScreenGuide } from '@/components/admin/screen-guide';
import { fmtDate, fmtDateTime } from '@/lib/admin-format';
import { cn } from '@/lib/cn';

export const dynamic = 'force-dynamic';

const BADGE_CLS = {
  active: 'bg-positive/10 text-positive border-positive/25',
  trial: 'bg-brand-glow text-brand-deep border-brand/20',
  expired: 'bg-danger/10 text-danger border-danger/25',
} as const;

function Badge({ tenant }: { tenant: AdminUserRow['tenant'] }) {
  const b = userStatusBadge(tenant);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium',
        BADGE_CLS[b.key],
      )}
    >
      {b.label}
    </span>
  );
}

function Actions({ u }: { u: AdminUserRow }) {
  return (
    <details className="relative">
      <summary className="btn-secondary !py-1.5 !px-3 text-[12px] cursor-pointer list-none inline-flex items-center min-h-[36px]">
        İşlemler
      </summary>
      <div className="absolute right-0 z-10 mt-1 w-56 card p-1.5 shadow-lg text-[12.5px]">
        <Link href={`/admin/tenants/${u.tenant.id}`} className="block rounded-md px-3 py-2 hover:bg-paper-2">
          Şirket detayı
        </Link>
        <Link href={`/admin/tenants/${u.tenant.id}#hediye`} className="block rounded-md px-3 py-2 hover:bg-paper-2">
          Hediye süre tanımla
        </Link>
        <Link
          href={`/admin/leads?q=${encodeURIComponent(u.email)}`}
          className="block rounded-md px-3 py-2 hover:bg-paper-2"
        >
          Lead kaydına bak
        </Link>
      </div>
    </details>
  );
}

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; cursor?: string }> }) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 120) || undefined;
  const cursor = sp.cursor || undefined;
  const page = await listAdminUsers({ q, cursor, take: 50 });

  const columns: DataColumn<AdminUserRow>[] = [
    {
      key: 'email',
      header: 'E-posta',
      cell: (u) => (
        <div className="min-w-0">
          <div className="font-mono text-[12px] break-all">{u.email}</div>
          {u.name && <div className="text-[11px] text-ink-faint">{u.name}</div>}
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Şirket',
      cell: (u) => (
        <Link href={`/admin/tenants/${u.tenant.id}`} className="hover:text-brand-deep">
          {u.tenant.name}
          {u.tenant.kind === 'AGENCY' && <span className="chip !text-[10px] ml-1.5">ajans</span>}
        </Link>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      cell: (u) => (
        <>
          <span className="chip !text-[10px]">{u.role}</span>
          {u.isSuperAdmin && <span className="chip own !text-[10px] ml-1">süper</span>}
          {!u.emailVerifiedAt && <span className="chip !text-[10px] ml-1">doğrulanmadı</span>}
        </>
      ),
    },
    { key: 'status', header: 'Durum', cell: (u) => <Badge tenant={u.tenant} /> },
    {
      key: 'trial',
      header: 'Bitiş',
      cell: (u) => (
        <span className="text-[12px] text-ink-muted">
          {u.tenant.plan === 'LAUNCH' ? fmtDate(u.tenant.trialEndsAt) : u.tenant.plan}
        </span>
      ),
    },
    {
      key: 'login',
      header: 'Son giriş',
      cell: (u) => <span className="text-[11px] text-ink-faint">{fmtDateTime(u.lastLoginAt)}</span>,
    },
    {
      key: 'created',
      header: 'Kayıt',
      cell: (u) => <span className="text-[11px] text-ink-faint">{fmtDate(u.createdAt)}</span>,
    },
    { key: 'actions', header: 'İşlemler', align: 'right', cell: (u) => <Actions u={u} /> },
  ];

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Super Admin</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Kullanıcılar</h1>
          <p className="text-[14px] text-ink-muted mt-2">{page.total.toLocaleString('tr-TR')} kayıtlı kullanıcı.</p>
        </div>
        <ScreenGuide className="mt-1" />
      </div>

      <Suspense fallback={<div className="input mt-6 min-h-[44px] max-w-md" aria-hidden="true" />}>
        <SearchBox placeholder="E-posta ya da şirket ara…" className="mt-6 max-w-md" />
      </Suspense>

      <DataTable
        className="mt-5"
        caption="Kullanıcı listesi"
        columns={columns}
        rows={page.items}
        rowKey={(u) => u.id}
        empty={q ? 'Aramayla eşleşen kullanıcı yok.' : 'Henüz kullanıcı yok.'}
        minWidth={900}
        mobileRow={(u) => (
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[12px] break-all">{u.email}</div>
              <Badge tenant={u.tenant} />
            </div>
            <div className="text-[12px] text-ink-muted mt-1">
              <Link href={`/admin/tenants/${u.tenant.id}`} className="hover:text-brand-deep">
                {u.tenant.name}
              </Link>{' '}
              · {u.role}
              {u.isSuperAdmin ? ' · süper' : ''} · bitiş {fmtDate(u.tenant.trialEndsAt)}
            </div>
            <div className="mt-2">
              <Actions u={u} />
            </div>
          </div>
        )}
      />

      <CursorNav
        className="mt-4"
        nextCursor={page.nextCursor}
        basePath="/admin/users"
        params={{ q, cursor }}
        shown={page.items.length}
        total={page.total}
      />
    </div>
  );
}
