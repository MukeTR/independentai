import { requireSuperAdmin } from '@/server/admin';
import { TriggerCronButton } from './trigger-cron-button';
import { ALL_PROVIDERS, getAdapter } from '@independentai/ai';

export default async function AdminSystem() {
  await requireSuperAdmin();

  const providers = ALL_PROVIDERS.map((id) => ({
    id,
    label: id,
    available: getAdapter(id).isAvailable(),
  }));

  return (
    <div className="max-w-4xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Sistem</h1>
      <p className="text-[14px] text-ink-muted mt-2">Provider durumu, cron tetikleme, hızlı operasyonlar.</p>

      {/* AI providers */}
      <div className="card p-6 mt-8">
        <div className="eyebrow">AI Provider Durumu</div>
        <ul className="mt-5 space-y-3">
          {providers.map((p) => (
            <li key={p.id} className="flex items-center justify-between border-b-hairline border-hairline pb-3 last:border-0">
              <div>
                <div className="font-display text-[16px]">{p.label}</div>
                <div className="text-[11px] text-ink-faint font-mono mt-0.5">
                  {p.available ? 'API_KEY mevcut · gerçek API çağrıları aktif' : 'API_KEY yok · mock mode'}
                </div>
              </div>
              <span className={p.available ? 'chip own' : 'chip'}>
                {p.available ? 'live' : 'mock'}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-ink-faint mt-5 font-mono">
          // API key'leri Vercel project settings → Environment Variables üzerinden eklenir
        </p>
      </div>

      {/* Manual cron */}
      <div className="card p-6 mt-5">
        <div className="eyebrow">Manuel Cron Tetikle</div>
        <h3 className="font-display text-[20px] mt-3">Tüm aktif promptları şimdi çalıştır</h3>
        <p className="text-[13.5px] text-ink-muted mt-2 leading-relaxed">
          Normal akış: her gece 02:00'de Vercel Cron tetikler. Bunu manuel olarak hemen yapmak istersen aşağıdaki butonu kullan.
          Tüm tenant'lar × tüm aktif promptlar × 3 model çalışır. Uzun sürebilir.
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
