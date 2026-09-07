'use client';

import { useEffect, useRef, useState } from 'react';
import { Briefcase, ChevronDown, Check, Loader2, PauseCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { cn } from '@/lib/cn';
import { useWorkspaceSwitch } from './use-workspace-switch';
import type { AccessibleWorkspace } from '@/server/agency';

type Data = {
  agency: { id: string; name: string; role: string } | null;
  current: string | null;
  workspaces: AccessibleWorkspace[];
};

/**
 * TopBar çalışma alanı değiştiricisi. Yalnızca ajans üyesinde görünür (sunucu { agency:null }
 * dönerse hiçbir şey render edilmez). Erişilemeyen/arşivlenmiş müşteriler sunucudan hiç gelmez.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const { switchTo, busy, error } = useWorkspaceSwitch();

  useEffect(() => {
    let alive = true;
    apiFetch<Data>('/api/agency/workspaces')
      .then((d) => alive && setData(d))
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!data?.agency || loadError) return null;
  const current = data.workspaces.find((w) => w.tenantId === data.current) ?? null;
  const label = current ? current.name : 'Ajans portföyü';

  return (
    <div ref={wrap} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!hydrated || busy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Çalışma alanı: ${label}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-paper-3 px-3 py-1.5 text-[12.5px] text-ink hover:border-ink transition max-w-[220px] disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
        ) : (
          <Briefcase className="w-3.5 h-3.5 text-brand" aria-hidden />
        )}
        <span className="truncate">{label}</span>
        {current?.status === 'PAUSED' && <span className="chip !text-[9.5px] !py-0 !px-1.5">duraklatıldı</span>}
        <ChevronDown className="w-3.5 h-3.5 text-ink-faint shrink-0" aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Çalışma alanları"
          className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[min(92vw,320px)] card p-1.5 shadow-2xl z-50 max-h-[60vh] overflow-y-auto"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)' }}
        >
          <div className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-ink-faint font-mono truncate">
            {data.agency.name}
          </div>
          <Option
            selected={!current}
            onPick={() => void switchTo(null)}
            title="Ajans portföyü"
            subtitle="Tüm müşteriler, özet ve ekip"
          />
          {data.workspaces.length > 0 && <div className="h-px bg-hairline my-1" />}
          {data.workspaces.map((w) => (
            <Option
              key={w.tenantId}
              selected={current?.tenantId === w.tenantId}
              onPick={() => void switchTo(w.tenantId)}
              title={w.name}
              subtitle={w.label ?? undefined}
              paused={w.status === 'PAUSED'}
            />
          ))}
          {data.workspaces.length === 0 && (
            <div className="px-2.5 py-2 text-[12px] text-ink-faint">Erişebildiğiniz müşteri yok.</div>
          )}
          {error && (
            <div role="alert" className="px-2.5 py-2 text-[12px] text-danger">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Option({
  selected,
  onPick,
  title,
  subtitle,
  paused,
}: {
  selected: boolean;
  onPick: () => void;
  title: string;
  subtitle?: string;
  paused?: boolean;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onPick}
      className={cn(
        'w-full text-left flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition',
        selected ? 'bg-brand-glow' : 'hover:bg-paper-4',
      )}
    >
      <span className="w-4 shrink-0 flex justify-center">
        {selected ? (
          <Check className="w-3.5 h-3.5 text-brand-deep" aria-hidden />
        ) : paused ? (
          <PauseCircle className="w-3.5 h-3.5 text-warning" aria-hidden />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-ink truncate">{title}</span>
        {subtitle && <span className="block text-[11px] text-ink-faint truncate">{subtitle}</span>}
      </span>
      {paused && <span className="chip !text-[9.5px] !py-0 !px-1.5 shrink-0">duraklatıldı</span>}
    </button>
  );
}
