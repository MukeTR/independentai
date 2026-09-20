'use client';

/**
 * /arac hub — tek URL kutusu; yazılan adres tüm URL tabanlı araç kartlarına `?url=` ile taşınır
 * (tarama burada BAŞLAMAZ; kullanıcı aracı seçer, araç sayfası otomatik tarar). Kartlar gruplu.
 * Yasaklı site ipucu yuvası: `blockedHint` (W5 `BlockedSiteHint` INTEGRATE'te bağlanır).
 */
import { useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  ArrowRightLeft,
  BadgeCheck,
  Bot,
  Braces,
  Gauge,
  HelpCircle,
  Languages,
  Map,
  MessageCircle,
  PackageSearch,
  Scale,
  Search,
  ShieldCheck,
  Store,
  Tags,
  Unlink,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ToolGroup, ToolIcon } from '@/lib/tool-registry';

const ICONS: Record<ToolIcon, typeof Gauge> = {
  Gauge,
  MessageCircle,
  ShieldCheck,
  ArrowRightLeft,
  Unlink,
  Map,
  Languages,
  Braces,
  HelpCircle,
  BadgeCheck,
  Scale,
  Store,
  PackageSearch,
  Bot,
  Tags,
  Search,
};

export type HubTool = {
  slug: string;
  path: string;
  title: string;
  question: string;
  description: string;
  group: ToolGroup;
  icon: ToolIcon;
  /** URL taraması olan araç (kind != null) — `?url=` alır */
  scans: boolean;
  badge?: 'beta' | 'yeni';
};

export type HubGroup = { key: ToolGroup; label: string; tools: HubTool[] };

export function ToolHub({ groups, blockedHint }: { groups: HubGroup[]; blockedHint?: ReactNode }) {
  const params = useSearchParams();
  const [url, setUrl] = useState(() => params.get('url') ?? '');
  const inputId = useId();
  const target = url.trim();
  const query = target ? `?url=${encodeURIComponent(target)}` : '';
  const total = groups.reduce((n, g) => n + g.tools.length, 0);

  return (
    <div>
      <form
        className="card p-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          const first = groups.flatMap((g) => g.tools).find((t) => t.scans);
          if (first && target) window.location.assign(`${first.path}${query}`);
        }}
        role="search"
      >
        <label htmlFor={inputId} className="text-[13px] text-ink-muted">
          Site adresi — yazın, aşağıdan aracı seçin
        </label>
        <div className="flex flex-col sm:flex-row gap-3 mt-1.5">
          <input
            id={inputId}
            name="url"
            type="text"
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="firma.com"
            className="input flex-1"
            maxLength={300}
            aria-describedby={`${inputId}-help`}
          />
          <button type="submit" className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px]">
            <Search className="w-4 h-4" aria-hidden /> İlk araçla başla
          </button>
        </div>
        <p id={`${inputId}-help`} className="text-[11.5px] text-ink-faint mt-2">
          {target
            ? `${total} aracın tamamı ${target} için hazır; kart seçince tarama otomatik başlar.`
            : 'Yalnızca herkese açık sayfalar taranır; giriş, e-posta veya kayıt gerekmez.'}
        </p>
        {blockedHint}
      </form>

      <div className="mt-10 space-y-10">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`grp-${g.key}`}>
            <h2 id={`grp-${g.key}`} className="eyebrow mb-4">
              {g.label} · {g.tools.length}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {g.tools.map((t) => {
                const Icon = ICONS[t.icon] ?? Gauge;
                const href = t.scans ? `${t.path}${query}` : t.path;
                return (
                  <li key={t.slug}>
                    <Link
                      href={href}
                      className={cn(
                        'card p-5 h-full flex flex-col hover:-translate-y-0.5 hover:shadow-lg transition-all group',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-brand-glow text-brand-deep">
                          <Icon className="w-[18px] h-[18px]" aria-hidden />
                        </span>
                        <span className="font-display text-[15.5px] leading-tight">{t.title}</span>
                        {t.badge && <span className="chip !text-[10px] ml-auto">{t.badge}</span>}
                      </div>
                      <p className="text-[13.5px] text-ink mt-3 leading-snug">{t.question}</p>
                      <p className="text-[12.5px] text-ink-faint mt-1.5 leading-relaxed flex-1">{t.description}</p>
                      <span className="inline-flex items-center gap-1 text-[12.5px] text-brand-deep mt-4 group-hover:gap-2 transition-all">
                        {t.scans && target ? 'Bu siteyi tara' : 'Aracı aç'}{' '}
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
