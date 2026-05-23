import Link from 'next/link';
import { requireSession } from '@/server/session';
import { getDashboardMetrics, listPrompts, listCompetitors, listOwnBrands, getMe } from '@/server/repo';
import { MetricCard } from '@/components/metric-card';
import { TrendChart } from '@/components/trend-chart';
import {
  ArrowRight, Sparkles, FileText, Bot, Code, ClipboardCheck, Calculator, CheckCircle2,
  MessageSquare, Swords, Settings, TrendingUp, Eye, Activity,
} from 'lucide-react';

const QUICK_TOOLS = [
  { href: '/dashboard/tools/llms-txt', icon: FileText, title: 'llms.txt üret', desc: 'AI bot\'lara markanızı anlatın' },
  { href: '/dashboard/tools/robots', icon: Bot, title: 'robots.txt üret', desc: 'AI crawler\'ları yönetin' },
  { href: '/dashboard/tools/schema', icon: Code, title: 'Schema markup', desc: 'JSON-LD Organization' },
  { href: '/dashboard/tools/audit', icon: ClipboardCheck, title: 'GEO Audit', desc: '10 adımlık denetim' },
];

export default async function DashboardHome() {
  const session = await requireSession();
  const [metrics, prompts, competitors, brands, me] = await Promise.all([
    getDashboardMetrics(session.tenantId),
    listPrompts(session.tenantId),
    listCompetitors(session.tenantId),
    listOwnBrands(session.tenantId),
    getMe(session.userId),
  ]);

  const hasContent = prompts.length > 0 && brands.length > 0;
  const onboarding = {
    brand: brands.length > 0,
    competitors: competitors.length > 0,
    prompts: prompts.length > 0,
    firstRun: metrics.totalRuns > 0,
  };
  const onboardingDone = Object.values(onboarding).filter(Boolean).length;
  const onboardingTotal = 4;

  return (
    <div className="max-w-6xl">
      {/* Welcome banner */}
      <div className="relative card overflow-hidden p-8 lg:p-10 mb-8 rise-1"
        style={{ background: 'linear-gradient(135deg, var(--paper-3) 0%, var(--brand-glow) 100%)' }}>
        <div className="absolute top-0 right-0 w-72 h-72 -mr-20 -mt-20 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, var(--brand-glow), transparent 70%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 chip own !text-[10px]">
            <Sparkles className="w-3 h-3" />
            {me?.tenant.trialDaysLeft} gün ücretsiz dönem
          </div>
          <h1 className="font-display text-[36px] lg:text-[44px] tracking-tight mt-4 leading-tight">
            Hoş geldin, <span className="text-brand">{me?.tenant.name}</span>
          </h1>
          <p className="text-[15px] text-ink-muted mt-3 max-w-2xl">
            {hasContent
              ? `Son 30 günde ${metrics.totalRuns} model çalıştırması yaptık. Markanız izlenen sorguların %${metrics.visibilityScore}'inde görünüyor.`
              : 'Birkaç dakikada GEO yolculuğuna başlayalım. Aşağıdaki adımları tamamla, ilk verilerin gelmesini bekle.'}
          </p>
        </div>
      </div>

      {/* Onboarding progress (only show if not 100%) */}
      {onboardingDone < onboardingTotal && (
        <div className="card p-7 mb-8 rise-2">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="eyebrow">Başlangıç adımları</div>
              <h2 className="font-display text-[20px] mt-1">Hesabını {onboardingDone}/{onboardingTotal} tamamladın</h2>
            </div>
            <div className="font-display text-[28px] tabular text-brand">{Math.round((onboardingDone / onboardingTotal) * 100)}%</div>
          </div>
          <div className="h-1.5 bg-paper-4 rounded-full overflow-hidden mb-5">
            <div className="h-full bg-brand transition-all duration-500" style={{ width: `${(onboardingDone / onboardingTotal) * 100}%` }} />
          </div>
          <div className="space-y-2.5">
            <OnboardStep done={onboarding.brand} label="Marka bilgilerini gir" href="/dashboard/settings" />
            <OnboardStep done={onboarding.competitors} label="3-5 rakip ekle" href="/dashboard/competitors" />
            <OnboardStep done={onboarding.prompts} label="5-10 izlenecek soru ekle" href="/dashboard/prompts" />
            <OnboardStep done={onboarding.firstRun} label="İlk çalıştırmayı tetikle (otomatik gece çalışır)" href="/dashboard/prompts" />
          </div>
        </div>
      )}

      {/* Metrics */}
      {hasContent && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6 rise-3">
            <MetricCard
              label="Görünürlük Skoru"
              value={metrics.visibilityScore}
              suffix="%"
              tone="brand"
              hint="Markanız geçen çalıştırma oranı"
            />
            <MetricCard
              label="Share of Voice"
              value={metrics.shareOfVoice}
              suffix="%"
              hint="Rakiplerinizle birlikte paynız"
            />
            <MetricCard
              label="Toplam Çalıştırma"
              value={metrics.totalRuns}
              hint="Son 30 günde"
            />
            <MetricCard
              label="Toplam Bahsetme"
              value={metrics.totalMentions}
              hint="Siz + rakip toplam"
            />
          </div>

          <div className="grid grid-cols-3 gap-5 mb-8 rise-4">
            <div className="col-span-3 lg:col-span-2">
              <TrendChart data={metrics.trend} />
            </div>
            <div className="col-span-3 lg:col-span-1 card p-6">
              <div className="eyebrow">Modellere Göre</div>
              <ul className="mt-5 space-y-4">
                {metrics.byProvider.map((p) => (
                  <li key={p.provider}>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[14px]">{p.provider}</span>
                      <span className="font-mono text-[14px] tabular">{p.visibility}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-paper-4 mt-2 overflow-hidden">
                      <div className="h-full bg-brand transition-all duration-500" style={{ width: `${p.visibility}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}

      {/* Quick tools — always visible */}
      <div className="mb-8 rise-5">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <div className="eyebrow">Hızlı Araçlar</div>
            <h2 className="font-display text-[20px] mt-1">İhtiyacınız olan GEO araçları, tek tıkla</h2>
          </div>
          <Link href="/dashboard/tools" className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1">
            Tümü <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card p-5 hover:bg-paper-3 hover:-translate-y-0.5 transition-all group"
            >
              <tool.icon className="w-5 h-5 text-brand mb-3 group-hover:scale-110 transition" />
              <div className="font-display text-[15px] leading-tight">{tool.title}</div>
              <div className="text-[11.5px] text-ink-muted mt-1.5">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent prompts (if any) */}
      {prompts.length > 0 && (
        <div className="card p-6 rise-5">
          <div className="flex items-baseline justify-between mb-4">
            <div className="eyebrow">Son izlenen sorular</div>
            <Link href="/dashboard/prompts" className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1">
              Tüm sorular <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-hairline">
            {prompts.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/prompts/${p.id}`}
                className="flex items-center justify-between py-3 hover:bg-paper-2 -mx-2 px-2 rounded transition"
              >
                <div className="min-w-0">
                  <div className="text-[13.5px] text-ink truncate">{p.text}</div>
                  <div className="text-[11px] text-ink-faint font-mono mt-0.5">
                    {p._count.runs} çalıştırma {p.category ? `· ${p.category}` : ''}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-ink-faint" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no prompts yet */}
      {!hasContent && (
        <div className="card p-10 text-center mb-8">
          <Activity className="w-10 h-10 text-ink-faint mx-auto mb-4" />
          <h3 className="font-display text-[20px]">Henüz veri yok</h3>
          <p className="text-[14px] text-ink-muted mt-2 max-w-md mx-auto">
            Yukarıdaki başlangıç adımlarını tamamla. İlk çalıştırma sonrası burada görünürlük metriklerin görünecek.
          </p>
          <Link href="/dashboard/prompts" className="btn-primary inline-flex items-center gap-2 mt-6">
            İlk sorunu ekle <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
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
