import Link from 'next/link';
import { requireSuperAdmin, getPlatformStats } from '@/server/admin';
import { getAdminStats } from '@/server/admin-stats';
import { MetricCard } from '@/components/metric-card';
import { KpiTile } from '@/components/admin/kpi-tile';
import { ScreenGuide } from '@/components/admin/screen-guide';
import { fmtDate, fmtPercent } from '@/lib/admin-format';

export const dynamic = 'force-dynamic';

export default async function AdminHome() {
  await requireSuperAdmin();
  const [stats, kpi] = await Promise.all([getPlatformStats(), getAdminStats()]);

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="eyebrow">Super Admin</div>
          <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mt-2">Genel bakış</h1>
          <p className="text-[14px] text-ink-muted mt-2">
            Ücretsiz araçlar, lead’ler ve hesaplar — her kutu ilgili listeye gider. Gün sınırı TSİ.
          </p>
        </div>
        <ScreenGuide className="mt-1" />
      </div>

      <section aria-label="Günlük göstergeler" className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <KpiTile
          label="Bugün tarama"
          value={kpi.scans.today}
          hint={`7 günde ${kpi.scans.d7.toLocaleString('tr-TR')} · 30 günde ${kpi.scans.d30.toLocaleString('tr-TR')}`}
          href="/admin/scans"
          tone="brand"
          sparkline={kpi.sparkline}
          sparklineLabel="Son 14 gün günlük tarama"
        />
        <KpiTile
          label="Yeni lead"
          value={kpi.leads.byStatus.NEW}
          hint={`toplam ${kpi.leads.total.toLocaleString('tr-TR')} · kazanılan ${kpi.leads.byStatus.WON.toLocaleString('tr-TR')}`}
          href="/admin/leads?status=NEW"
          tone={kpi.leads.byStatus.NEW > 0 ? 'positive' : 'default'}
        />
        <KpiTile
          label="Dönüşüm · 7 gün"
          value={fmtPercent(kpi.conversion7d.ratio)}
          hint={`${kpi.conversion7d.contacts} iletişim formu / ${kpi.conversion7d.scans} tarama`}
          href="/admin/leads?source=CONTACT"
        />
        <KpiTile
          label="Ajans adayı"
          value={kpi.agencyCandidates}
          hint="skor ≥ 50, henüz sonuçlanmamış"
          href="/admin/agency-candidates"
          tone={kpi.agencyCandidates > 0 ? 'warning' : 'default'}
        />
        <KpiTile
          label="Aktif duyuru"
          value={kpi.activeAnnouncements}
          hint="yayında ve tarih aralığında"
          href="/admin/announcements"
        />
        <KpiTile
          label="Yasaklı isabet"
          value={kpi.blockedHits}
          hint="engellenen tarama denemesi (toplam)"
          href="/admin/blocked-sites"
        />
        <KpiTile
          label="Deneme biten · 7 gün"
          value={kpi.trialsEndingIn7d}
          hint="LAUNCH planı, süresi yaklaşan"
          href="/admin/tenants?trial=7d"
          tone={kpi.trialsEndingIn7d > 0 ? 'danger' : 'default'}
        />
        <KpiTile
          label="Atlanan bildirim · 7 gün"
          value={kpi.notificationsSkipped7d}
          hint={kpi.notificationsSkipped7d > 0 ? 'e-posta sağlayıcısı eksik olabilir' : 'teslimat sorunu yok'}
          href="/admin/system"
          tone={kpi.notificationsSkipped7d > 0 ? 'warning' : 'default'}
        />
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
        <MetricCard label="Tenant" value={stats.tenants} tone="brand" />
        <MetricCard label="Kullanıcı" value={stats.users} />
        <MetricCard label="Soru" value={stats.prompts} />
        <MetricCard label="Toplam çalıştırma" value={stats.runs} hint={`${stats.recentRuns7d} son 7 günde`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-5">
        <MetricCard label="Toplam anılma" value={stats.mentions} />
        <MetricCard
          label="AI maliyet (toplam)"
          value={`$${stats.totalCostUsd.toFixed(3)}`}
          hint={`Fiyatı bilinen çalıştırmalar; ${stats.costUnknownRuns} çalıştırmanın maliyeti bilinmiyor`}
        />
        <MetricCard
          label="Yarım tarama · 30 gün"
          value={fmtPercent(kpi.scans.partialRatio)}
          hint="bütçe dolduğu için kısmi skor"
        />
        <MetricCard label="Cron" value="~02:00 TR" hint="Her gece ±1 saat, zincirleme" tone="positive" />
      </div>

      <div className="card p-6 mt-8">
        <div className="flex items-center justify-between">
          <div className="eyebrow">Son kayıt olan tenant’lar</div>
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
            const trialDaysLeft = Math.max(0, Math.ceil((t.trialEndsAt.getTime() - Date.now()) / 86_400_000));
            return (
              <Link
                key={t.id}
                href={`/admin/tenants/${t.id}`}
                className="flex items-center justify-between py-3 hover:bg-paper-2 -mx-2 px-2 rounded transition"
              >
                <div className="min-w-0">
                  <div className="text-[14px] truncate">{t.name}</div>
                  <div className="text-[11px] text-ink-faint font-mono mt-0.5 truncate">
                    {t.website ?? 'web sitesi yok'} · {t._count.users} kullanıcı · {t._count.prompts} soru
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[12px] text-ink-muted">
                    <span
                      className={
                        trialDaysLeft > 30 ? 'text-positive' : trialDaysLeft > 7 ? 'text-warning' : 'text-danger'
                      }
                    >
                      deneme: {trialDaysLeft} g
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-faint font-mono">{fmtDate(t.createdAt)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
