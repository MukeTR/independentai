import Link from 'next/link';
import { ArrowRight, KeyRound, Database, Server } from 'lucide-react';
import { requireSuperAdmin } from '@/server/admin';
import { TriggerCronButton } from './trigger-cron-button';
import { listConfigStatus } from '@/server/system-config';

export default async function AdminSystem() {
  await requireSuperAdmin();
  const configs = await listConfigStatus();

  return (
    <div className="max-w-4xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Sistem</h1>
      <p className="text-[14px] text-ink-muted mt-2">Provider durumu, cron tetikleme, API key yönetimi.</p>

      {/* AI providers */}
      <div className="card p-6 mt-8">
        <div className="flex items-center justify-between mb-2">
          <div className="eyebrow">AI Provider Durumu</div>
          <Link href="/admin/system/api-keys" className="text-[12px] text-brand-deep hover:text-brand inline-flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> Key\'leri yönet <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {configs.map((c) => (
            <li key={c.key} className="flex items-center justify-between border-b-hairline border-hairline pb-3 last:border-0">
              <div className="min-w-0">
                <div className="font-display text-[16px]">{c.label}</div>
                <div className="text-[11px] text-ink-faint font-mono mt-0.5">
                  {c.source === 'db' && (<>
                    <Database className="inline w-3 h-3 mr-1" />
                    DB\'de tanımlı · {c.preview}
                  </>)}
                  {c.source === 'env' && (<>
                    <Server className="inline w-3 h-3 mr-1" />
                    Vercel env\'inde tanımlı · {c.preview}
                  </>)}
                  {c.source === 'none' && 'Tanımsız → mock mode'}
                </div>
              </div>
              <span className={c.source === 'none' ? 'chip' : 'chip own'}>
                {c.source === 'none' ? 'mock' : 'live'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Manual cron */}
      <div className="card p-6 mt-5">
        <div className="eyebrow">Manuel Cron Tetikle</div>
        <h3 className="font-display text-[20px] mt-3">Tüm aktif promptları şimdi çalıştır</h3>
        <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
          Normal akış: her gece 02:00\'de Vercel Cron tetikler. Bunu manuel olarak hemen yapmak istersen aşağıdaki butonu kullan.
          Tüm tenant\'lar × tüm aktif promptlar × 3 model çalışır. Uzun sürebilir.
        </p>
        <div className="mt-5">
          <TriggerCronButton />
        </div>
      </div>

      {/* Env / build info */}
      <div className="card p-6 mt-5">
        <div className="eyebrow">Build Info</div>
        <dl className="mt-4 text-[12px] font-mono space-y-2">
          <div className="flex justify-between border-b-hairline border-hairline pb-2">
            <dt className="text-ink-faint">NODE_ENV</dt>
            <dd>{process.env.NODE_ENV}</dd>
          </div>
          <div className="flex justify-between border-b-hairline border-hairline pb-2">
            <dt className="text-ink-faint">VERCEL_ENV</dt>
            <dd>{process.env.VERCEL_ENV ?? 'local'}</dd>
          </div>
          <div className="flex justify-between border-b-hairline border-hairline pb-2">
            <dt className="text-ink-faint">VERCEL_GIT_COMMIT_SHA</dt>
            <dd className="truncate max-w-[300px]">{process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
