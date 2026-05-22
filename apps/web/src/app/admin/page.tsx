import Link from 'next/link';
import { requireSuperAdmin, getPlatformStats } from '@/server/admin';
import { MetricCard } from '@/components/metric-card';

export default async function AdminHome() {
  await requireSuperAdmin();
  const stats = await getPlatformStats();

  return (
    <div className="max-w-6xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Platform Genel Bakış</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        independentai.space — tüm tenant'lar, kullanıcılar ve sistem aktivitesi.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
        <MetricCard label="Tenant" value={stats.tenants} tone="brand" />
        <MetricCard label="Kullanıcı" value={stats.users} />
        <MetricCard label="Prompt" value={stats.prompts} />
        <MetricCard label="Toplam Run" value={stats.runs} hint={`${stats.recentRuns7d} son 7 günde`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5">
        <MetricCard label="Toplam Mention" value={stats.mentions} />
        <MetricCard
          label="AI maliyet (toplam)"
          value={`$${stats.totalCostUsd.toFixed(3)}`}
          hint="Tahmini — sadece kayıtlı"
        />
        <MetricCard label="Aktif AI provider" value={3} hint="OpenAI · Anthropic · Google" />
        <MetricCard label="Cron" value="02:00 TR" hint="Her gün" tone="positive" />
      </div>

      {/* Recent tenants */}
      <div className="card p-6 mt-8">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Son kayıt olan tenant'lar</div>
          <Link href="/admin/tenants" className="text-[12px] text-brand-deep hover:text-brand">
            Tümü →
          </Link>
        </div>
        <div className="divide-y divide-hairline mt-3">
          {stats.recentTenants.length === 0 && (
            <div className="text-center py-8 text-ink-muted text-[14px]">
              Henüz tenant yok. İlk kullanıcı kayıt olduğunda burada görünür.
            </div>
          )}
          {stats.recentTenants.map((t) => {
            const trialDaysLeft = Math.max(
              0,
              Math.ceil((t.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            );
            return (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center justify-between py-3 hover:bg-paper-2 -mx-2 px-2 rounded transition"
              >
                <div>
                  <div className="text-[14px]">{t.name}</div>
                  <div className="text-[11px] text-ink-faint font-mono mt-0.5">
                    {t.website ?? 'website yok'} · {t._count.users} kullanıcı · {t._count.prompts} prompt
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] text-ink-muted">
                    {trialDaysLeft > 30 ? <span className="text-positive">trial: {trialDaysLeft}g</span> :
                     trialDaysLeft > 7 ? <span className="text-warning">trial: {trialDaysLeft}g</span> :
                     <span className="text-danger">trial: {trialDaysLeft}g</span>}
                  </div>
                  <div className="text-[10px] text-ink-faint font-mono">
                    {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
