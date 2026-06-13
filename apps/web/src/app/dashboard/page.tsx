import Link from 'next/link';
import { requireSession } from '@/server/session';
import { listPrompts, listCompetitors, listOwnBrands, getMe } from '@/server/repo';
import { getComprehensiveAnalytics } from '@/server/dashboard-analytics';
import { getRadarData, getTopCitationSources, getVisibilityGaps } from '@/server/insights';
import { CompetitorRadar } from '@/components/dashboard/competitor-radar';
import { CitationSources } from '@/components/dashboard/citation-sources';
import { VisibilityGaps } from '@/components/dashboard/visibility-gaps';
import { KpiRow } from '@/components/dashboard/widgets/kpi-row';
import { DualTrend } from '@/components/dashboard/widgets/dual-trend';
import { SovDonut } from '@/components/dashboard/widgets/sov-donut';
import { SentimentPanel } from '@/components/dashboard/widgets/sentiment-panel';
import { MentionTypeBar } from '@/components/dashboard/widgets/mention-type-bar';
import { PositionHistogram } from '@/components/dashboard/widgets/position-histogram';
import { ProviderBreakdown } from '@/components/dashboard/widgets/provider-breakdown';
import { CompetitorLeaderboard } from '@/components/dashboard/widgets/competitor-leaderboard';
import { PromptPerformanceTable } from '@/components/dashboard/widgets/prompt-performance-table';
import { CategoryBreakdown } from '@/components/dashboard/widgets/category-breakdown';
import { HealthPanel } from '@/components/dashboard/widgets/health-panel';
import { ActivityFeed } from '@/components/dashboard/widgets/activity-feed';
import {
  ArrowRight, CheckCircle2, Activity, Radar, Gauge, FileSearch, GitFork,
  ShieldAlert, KeyRound, Link2, PenLine,
} from 'lucide-react';

const FEATURED_TOOLS = [
  { href: '/dashboard/tools/geo-audit', icon: Gauge, title: 'GEO Audit', desc: 'URL → 0-100 AI hazırlık skoru' },
  { href: '/dashboard/tools/content-audit', icon: FileSearch, title: 'İçerik Denetleyici', desc: 'Sayfa → aksiyon kartları' },
  { href: '/dashboard/tools/keyword-finder', icon: KeyRound, title: 'Prompt Bulucu', desc: 'Yüksek niyetli sorular' },
  { href: '/dashboard/tools/cannibalization', icon: GitFork, title: 'Kanibalizasyon', desc: 'Rakip kendi sayfaların' },
  { href: '/dashboard/tools/hallucination', icon: ShieldAlert, title: 'Halüsinasyon', desc: 'Yanlış bilgi tespiti' },
  { href: '/dashboard/tools/backlink-finder', icon: Link2, title: 'Backlink Bulucu', desc: 'Atıf alan kaynaklar' },
  { href: '/dashboard/tools/aeo-writer', icon: PenLine, title: 'AEO Yazıcı', desc: 'AI-optimize içerik üret' },
];

export default async function DashboardHome() {
  const session = await requireSession();
  const [analytics, prompts, competitors, brands, me, radar, citationSources, gaps] = await Promise.all([
    getComprehensiveAnalytics(session.tenantId),
    listPrompts(session.tenantId),
    listCompetitors(session.tenantId),
    listOwnBrands(session.tenantId),
    getMe(session.userId),
    getRadarData(session.tenantId),
    getTopCitationSources(session.tenantId),
    getVisibilityGaps(session.tenantId),
  ]);

  const hasContent = analytics.hasData;
  const onboarding = {
    brand: brands.length > 0,
    competitors: competitors.length > 0,
    prompts: prompts.length > 0,
    firstRun: analytics.kpis.totalRuns > 0,
  };
  const onboardingDone = Object.values(onboarding).filter(Boolean).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7 rise-1">
        <div>
          <div className="eyebrow">Komuta Merkezi</div>
          <h1 className="font-display text-[30px] lg:text-[36px] tracking-tight mt-1.5 leading-tight">
            Merhaba, {me?.tenant.name}
          </h1>
          <p className="text-[14px] text-ink-muted mt-2">
            {hasContent
              ? `Son ${analytics.window} gün · ${analytics.kpis.totalRuns} çalıştırma · markanız sorguların %${analytics.kpis.visibility}'inde görünüyor.`
              : 'AI görünürlük takibinize başlamak için birkaç adım kaldı.'}
          </p>
        </div>
        <div className="chip !text-[11px] font-mono">Son {analytics.window} gün</div>
      </div>

      {/* Onboarding */}
      {onboardingDone < 4 && (
        <div className="card p-7 mb-8 rise-2">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="eyebrow">Başlangıç adımları</div>
              <h2 className="font-display text-[20px] mt-1">Hesabını {onboardingDone}/4 tamamladın</h2>
            </div>
            <div className="font-display text-[28px] tabular text-brand">{Math.round((onboardingDone / 4) * 100)}%</div>
          </div>
          <div className="h-1.5 bg-paper-4 rounded-full overflow-hidden mb-5">
            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${(onboardingDone / 4) * 100}%` }} />
          </div>
          <div className="space-y-2.5">
            <OnboardStep done={onboarding.brand} label="Marka bilgilerini gir" href="/dashboard/settings" />
            <OnboardStep done={onboarding.competitors} label="3-5 rakip ekle" href="/dashboard/competitors" />
            <OnboardStep done={onboarding.prompts} label="5-10 izlenecek soru ekle" href="/dashboard/prompts" />
            <OnboardStep done={onboarding.firstRun} label="İlk çalıştırmayı tetikle (otomatik gece çalışır)" href="/dashboard/prompts" />
          </div>
        </div>
      )}

      {hasContent ? (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="rise-2"><KpiRow kpis={analytics.kpis} /></div>

          {/* Trend + SoV */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rise-3">
            <div className="lg:col-span-2"><DualTrend trend={analytics.trend} /></div>
            <SovDonut ownSov={analytics.kpis.sov} competitors={analytics.competitors} />
          </div>

          {/* Provider breakdown + Health */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rise-3">
            <div className="lg:col-span-2"><ProviderBreakdown byProvider={analytics.byProvider} /></div>
            <HealthPanel health={analytics.health} />
          </div>

          {/* Radar + Sentiment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rise-3">
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Radar className="w-4 h-4 text-brand" />
                <h3 className="font-display text-[16px]">Rekabet Radarı</h3>
              </div>
              <p className="text-[12.5px] text-ink-muted mb-2">Markanız ile rakipleriniz 5 eksende.</p>
              <CompetitorRadar entities={radar.entities} axes={radar.axes} />
            </div>
            <SentimentPanel sentiment={analytics.sentiment} sentimentTrend={analytics.sentimentTrend} />
          </div>

          {/* Position + MentionType + Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rise-4">
            <PositionHistogram positionHistogram={analytics.positionHistogram} />
            <MentionTypeBar mentionTypes={analytics.mentionTypes} />
            <CategoryBreakdown categories={analytics.categoryBreakdown} />
          </div>

          {/* Leaderboard + Citation sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rise-4">
            <CompetitorLeaderboard competitors={analytics.competitors} />
            <CitationSources sources={citationSources} />
          </div>

          {/* Prompt performance + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 rise-4">
            <div className="lg:col-span-2"><PromptPerformanceTable prompts={analytics.promptPerformance} /></div>
            <ActivityFeed activity={analytics.activity} />
          </div>

          {/* Gaps */}
          <div className="rise-5"><VisibilityGaps gaps={gaps} /></div>
        </div>
      ) : (
        <div className="card p-10 text-center mb-8 rise-3">
          <Activity className="w-10 h-10 text-ink-faint mx-auto mb-4" />
          <h3 className="font-display text-[20px]">Henüz veri yok</h3>
          <p className="text-[14px] text-ink-muted mt-2 max-w-md mx-auto">
            Başlangıç adımlarını tamamla. İlk gece çalıştırması sonrası tüm görünürlük metriklerin burada belirir.
          </p>
          <Link href="/dashboard/prompts" className="btn-primary inline-flex items-center gap-2 mt-6">
            İlk sorunu ekle <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Tools showcase */}
      <div className="mt-10 rise-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="eyebrow">GEO Araç Kutusu</div>
            <h2 className="font-display text-[22px] mt-1">İhtiyacın olan her şey, tek tıkla</h2>
          </div>
          <Link href="/dashboard/tools" className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1">
            Tüm araçlar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {FEATURED_TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="card p-4 hover:-translate-y-0.5 hover:bg-paper-2 transition-all group">
              <div className="w-9 h-9 rounded-lg bg-brand-glow flex items-center justify-center mb-3 group-hover:bg-brand/15 transition">
                <t.icon className="w-4 h-4 text-brand" />
              </div>
              <div className="font-display text-[13.5px] leading-tight">{t.title}</div>
              <div className="text-[10.5px] text-ink-faint mt-1 leading-tight">{t.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function OnboardStep({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 py-1.5 group">
      {done ? (
        <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-ink-faint shrink-0" />
      )}
      <span className={done ? 'text-[14px] text-ink-faint line-through' : 'text-[14px] text-ink group-hover:text-brand-deep'}>
        {label}
      </span>
      {!done && <ArrowRight className="w-3.5 h-3.5 text-ink-faint ml-auto group-hover:text-brand-deep group-hover:translate-x-0.5 transition" />}
    </Link>
  );
}
