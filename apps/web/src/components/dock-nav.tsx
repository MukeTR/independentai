'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, MessageSquare, Swords, Settings, LogOut, Sparkles, Bell, Code2,
  LayoutGrid, Gauge, FileSearch, GitFork, ShieldAlert, KeyRound, Link2, PenLine,
  FileText, Bot, Code, ClipboardCheck, Calculator, CheckCircle2, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const NAV = [
  { href: '/dashboard', label: 'Genel Bakış', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/prompts', label: 'İzlenen Sorular', icon: MessageSquare },
  { href: '/dashboard/competitors', label: 'Rakipler', icon: Swords },
];

const TOOLS: { href: string; label: string; desc: string; icon: typeof Gauge; cat: string }[] = [
  { href: '/dashboard/tools/geo-audit', label: 'GEO Audit', desc: 'URL → 0-100 AI hazırlık skoru', icon: Gauge, cat: 'Denetim' },
  { href: '/dashboard/tools/content-audit', label: 'İçerik Denetleyici', desc: 'Sayfa → aksiyon kartları', icon: FileSearch, cat: 'Denetim' },
  { href: '/dashboard/tools/cannibalization', label: 'Kanibalizasyon', desc: 'Rakip kendi sayfaların', icon: GitFork, cat: 'Denetim' },
  { href: '/dashboard/tools/hallucination', label: 'Halüsinasyon', desc: 'Yanlış bilgi tespiti', icon: ShieldAlert, cat: 'Denetim' },
  { href: '/dashboard/tools/keyword-finder', label: 'Prompt Bulucu', desc: 'Yüksek niyetli sorular', icon: KeyRound, cat: 'Keşif' },
  { href: '/dashboard/tools/backlink-finder', label: 'Backlink Bulucu', desc: 'Atıf alan kaynaklar', icon: Link2, cat: 'Keşif' },
  { href: '/dashboard/tools/aeo-writer', label: 'AEO Yazıcı', desc: 'AI-optimize içerik üret', icon: PenLine, cat: 'Üretici' },
  { href: '/dashboard/tools/llms-txt', label: 'llms.txt', desc: 'AI bot dosyası üret', icon: FileText, cat: 'Üretici' },
  { href: '/dashboard/tools/robots', label: 'robots.txt', desc: 'Crawler kuralları', icon: Bot, cat: 'Üretici' },
  { href: '/dashboard/tools/schema', label: 'Schema', desc: 'JSON-LD markup', icon: Code, cat: 'Üretici' },
  { href: '/dashboard/tools/audit', label: 'GEO Checklist', desc: '10 adımlık denetim', icon: ClipboardCheck, cat: 'Denetim' },
  { href: '/dashboard/tools/visibility', label: 'Visibility Hesap.', desc: 'Score + SoV formülü', icon: Calculator, cat: 'Üretici' },
  { href: '/dashboard/tools/checklist', label: 'SEO Checklist', desc: '25 maddelik liste', icon: CheckCircle2, cat: 'Denetim' },
];

const TOOL_CATS = ['Denetim', 'Keşif', 'Üretici'];

const SECONDARY = [
  { href: '/dashboard/alerts', label: 'Uyarılar', icon: Bell },
  { href: '/dashboard/api', label: 'API', icon: Code2 },
  { href: '/dashboard/settings', label: 'Markam', icon: Settings },
];

export function DockNav({
  user,
}: {
  user: { email: string; tenant: { name: string; trialDaysLeft: number }; isSuperAdmin?: boolean };
}) {
  const pathname = usePathname();
  const [toolsOpen, setToolsOpen] = useState(false);
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));
  const toolsActive = pathname.startsWith('/dashboard/tools');

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 z-50 pb-4 pt-10 group/dock" onMouseLeave={() => setToolsOpen(false)}>
      {/* Tools mega-popover */}
      {toolsOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[min(92vw,760px)] animate-[rise_0.18s_ease]"
          onMouseEnter={() => setToolsOpen(true)}
        >
          <div className="card p-5 shadow-2xl border-hairline" style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="eyebrow">GEO Araç Kutusu</div>
              <Link href="/dashboard/tools" className="text-[11.5px] text-brand-deep hover:text-brand">Tümünü gör →</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1">
              {TOOL_CATS.map((cat) => (
                <div key={cat}>
                  <div className="text-[10px] uppercase tracking-wider text-ink-faint font-mono mb-1.5 mt-1">{cat}</div>
                  {TOOLS.filter((t) => t.cat === cat).map((t) => (
                    <Link
                      key={t.href}
                      href={t.href}
                      onClick={() => setToolsOpen(false)}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition group/item',
                        isActive(t.href) ? 'bg-brand-glow' : 'hover:bg-paper-4',
                      )}
                    >
                      <t.icon className="w-3.5 h-3.5 text-brand mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[12.5px] text-ink leading-tight">{t.label}</div>
                        <div className="text-[10.5px] text-ink-faint leading-tight truncate">{t.desc}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* The dock */}
      <div
        className="flex items-center gap-1 px-2.5 py-2 rounded-2xl border border-hairline shadow-xl translate-y-2 group-hover/dock:translate-y-0 transition-transform duration-300"
        style={{ background: 'rgba(251,249,244,0.82)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px -12px rgba(20,17,13,0.35)' }}
      >
        {NAV.map((n) => (
          <DockItem key={n.href} href={n.href} label={n.label} icon={n.icon} active={isActive(n.href, n.exact)} />
        ))}

        <div className="w-px h-7 bg-hairline mx-0.5" />

        {/* Tools trigger */}
        <button
          onMouseEnter={() => setToolsOpen(true)}
          onClick={() => setToolsOpen((v) => !v)}
          className={cn(
            'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 group/btn',
            toolsActive || toolsOpen ? 'bg-brand text-white' : 'text-ink-muted hover:bg-paper-4 hover:text-ink',
          )}
        >
          <LayoutGrid className="w-[18px] h-[18px]" />
          <ChevronUp className={cn('w-3 h-3 absolute -top-0.5 right-1 transition-transform', toolsOpen && 'rotate-180')} />
          <Tooltip>Araçlar</Tooltip>
        </button>

        <div className="w-px h-7 bg-hairline mx-0.5" />

        {SECONDARY.map((n) => (
          <DockItem key={n.href} href={n.href} label={n.label} icon={n.icon} active={isActive(n.href)} />
        ))}

        {user.isSuperAdmin && (
          <DockItem href="/admin" label="Super Admin" icon={Sparkles} active={pathname.startsWith('/admin')} accent />
        )}

        <div className="w-px h-7 bg-hairline mx-0.5" />

        {/* Trial + user + logout */}
        <Link
          href="/dashboard/settings"
          className="hidden sm:flex items-center gap-2 pl-2 pr-1 h-11 rounded-xl hover:bg-paper-4 transition group/u"
        >
          <div className="w-7 h-7 rounded-full bg-brand/15 flex items-center justify-center text-[11px] font-semibold text-brand-deep shrink-0">
            {user.tenant.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="leading-tight pr-1">
            <div className="text-[11.5px] text-ink max-w-[100px] truncate">{user.tenant.name}</div>
            <div className="text-[9.5px] text-brand-deep font-mono">{user.tenant.trialDaysLeft}g ücretsiz</div>
          </div>
        </Link>
        <button
          onClick={logout}
          className="relative w-11 h-11 rounded-xl flex items-center justify-center text-ink-faint hover:bg-danger/10 hover:text-danger transition group/btn"
        >
          <LogOut className="w-[17px] h-[17px]" />
          <Tooltip>Çıkış</Tooltip>
        </button>
      </div>
    </div>
  );
}

function DockItem({
  href, label, icon: Icon, active, accent,
}: { href: string; label: string; icon: typeof Gauge; active: boolean; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative w-11 h-11 rounded-xl flex items-center justify-center transition-all hover:-translate-y-0.5 group/btn',
        active
          ? accent ? 'bg-brand-glow text-brand-deep' : 'bg-brand text-white'
          : accent ? 'text-brand-deep hover:bg-brand-glow' : 'text-ink-muted hover:bg-paper-4 hover:text-ink',
      )}
    >
      <Icon className="w-[18px] h-[18px]" />
      {active && !accent && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
      <Tooltip>{label}</Tooltip>
    </Link>
  );
}

function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] text-paper-2 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-150">
      {children}
    </span>
  );
}
