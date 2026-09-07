import Link from 'next/link';
import { ArrowRight, KeyRound, Database, Server, Activity } from 'lucide-react';
import { requireSuperAdmin } from '@/server/authz';
import { TriggerCronButton } from './trigger-cron-button';
import { listConfigStatus, providerHealth } from '@/server/system-config';
import { queueSummary } from '@/server/run-prompt';
import { prisma } from '@/server/prisma';
import { emailConfigured } from '@/server/mailer';
import { cronSecret } from '@/server/env';

export const dynamic = 'force-dynamic';

export default async function AdminSystem() {
  await requireSuperAdmin();
  const [configs, health, queue, notifications] = await Promise.all([
    listConfigStatus(),
    providerHealth(),
    queueSummary(),
    prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  return (
    <div className="max-w-5xl">
      <div className="eyebrow">Super Admin</div>
      <h1 className="font-display text-[36px] tracking-tight mt-2">Sistem</h1>
      <p className="text-[14px] text-ink-muted mt-2">
        Provider/model durumu, cron kuyruğu, bildirim teslimatı, API key yönetimi.
      </p>

      {/* Providers + models */}
      <div className="card p-6 mt-8">
        <div className="flex items-center justify-between mb-2">
          <div className="eyebrow">AI Provider &amp; Model Durumu</div>
          <Link
            href="/admin/system/api-keys"
            className="text-[12px] text-brand-deep hover:text-brand inline-flex items-center gap-1"
          >
            <KeyRound className="w-3 h-3" aria-hidden /> Key&apos;leri yönet{' '}
            <ArrowRight className="w-3 h-3" aria-hidden />
          </Link>
        </div>
        {health.mockAllowed && (
          <p className="text-[12px] text-warning mb-3" role="status">
            Mock modu AÇIK (IAI_ALLOW_MOCK / non-production): anahtarsız provider sahte cevap üretir. Production&apos;da
            kapalı olmalı.
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {health.providers.map((p) => {
            const c = configs.find((x) => x.key.startsWith(p.provider));
            return (
              <li
                key={p.provider}
                className="flex items-center justify-between gap-3 border-b-hairline border-hairline pb-3 last:border-0 flex-wrap"
              >
                <div className="min-w-0">
                  <div className="font-display text-[16px]">{c?.label ?? p.provider}</div>
                  <div className="text-[11px] text-ink-faint font-mono mt-0.5 flex flex-wrap gap-x-2">
                    {c?.source === 'db' && (
                      <span>
                        <Database className="inline w-3 h-3 mr-1" aria-hidden />
                        DB&apos;de tanımlı · {c.preview}
                      </span>
                    )}
                    {c?.source === 'env' && (
                      <span>
                        <Server className="inline w-3 h-3 mr-1" aria-hidden />
                        env&apos;de tanımlı · {c.preview}
                      </span>
                    )}
                    {(!c || c.source === 'none') && <span>Anahtar tanımsız</span>}
                    <span>
                      · model <b>{p.model}</b> ({p.source})
                    </span>
                    <span>· fiyat {p.priced ? 'katalogda' : 'BİLİNMİYOR'}</span>
                    <span>· web arama {p.webSearch ? 'açık' : 'kapalı'}</span>
                  </div>
                </div>
                <span className={p.configured ? 'chip own' : 'chip comp'}>
                  {p.configured ? 'live' : health.mockAllowed ? 'mock' : 'kapalı'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Queue */}
      <div className="card p-6 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-brand" aria-hidden />
          <div className="eyebrow">Cron kuyruğu</div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-paper-4 p-3">
            <div className="eyebrow">Bekleyen</div>
            <div className="font-display text-[22px] tabular mt-1">{queue.pending}</div>
          </div>
          <div className="rounded-lg bg-paper-4 p-3">
            <div className="eyebrow">Çalışan</div>
            <div className="font-display text-[22px] tabular mt-1">{queue.running}</div>
          </div>
          <div className="rounded-lg bg-paper-4 p-3">
            <div className="eyebrow">Bugün hata</div>
            <div className={`font-display text-[22px] tabular mt-1 ${queue.errorToday ? 'text-danger' : ''}`}>
              {queue.errorToday}
            </div>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[12px] font-mono">
            <thead className="text-ink-faint text-left">
              <tr>
                <th className="py-1 pr-3">Başlangıç</th>
                <th className="py-1 pr-3">Tetik</th>
                <th className="py-1 pr-3">Hop</th>
                <th className="py-1 pr-3">Kuyruk</th>
                <th className="py-1 pr-3">İşlenen</th>
                <th className="py-1 pr-3">Hata</th>
                <th className="py-1 pr-3">Kalan</th>
                <th className="py-1">Süre</th>
              </tr>
            </thead>
            <tbody>
              {queue.batches.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-3 text-ink-muted">
                    Henüz toplu çalıştırma yok.
                  </td>
                </tr>
              )}
              {queue.batches.map((b) => (
                <tr key={b.id} className="border-t border-hairline">
                  <td className="py-1.5 pr-3">{b.startedAt.toLocaleString('tr-TR')}</td>
                  <td className="py-1.5 pr-3">{b.triggeredBy ?? '—'}</td>
                  <td className="py-1.5 pr-3">{b.hop}</td>
                  <td className="py-1.5 pr-3">{b.enqueued}</td>
                  <td className="py-1.5 pr-3">{b.processed}</td>
                  <td className={`py-1.5 pr-3 ${b.failed ? 'text-danger' : ''}`}>{b.failed}</td>
                  <td className="py-1.5 pr-3">{b.remaining}</td>
                  <td className="py-1.5">
                    {b.finishedAt ? `${Math.round((b.finishedAt.getTime() - b.startedAt.getTime()) / 1000)}s` : 'devam'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5">
          <TriggerCronButton />
        </div>
      </div>

      {/* Notifications */}
      <div className="card p-6 mt-5">
        <div className="eyebrow mb-3">Bildirim teslimatı (son 10)</div>
        <p className="text-[12px] text-ink-muted mb-3">
          E-posta: {emailConfigured() ? 'RESEND_API_KEY tanımlı' : 'RESEND_API_KEY YOK — e-postalar "skipped"'} · Cron:{' '}
          {cronSecret() ? 'CRON_SECRET tanımlı' : 'CRON_SECRET YOK'}
        </p>
        <ul className="text-[12px] font-mono space-y-1.5">
          {notifications.length === 0 && <li className="text-ink-muted">Henüz kayıt yok.</li>}
          {notifications.map((n) => (
            <li key={n.id} className="flex flex-wrap gap-x-3">
              <span className="text-ink-faint">{n.createdAt.toLocaleString('tr-TR')}</span>
              <span>{n.kind}</span>
              <span>{n.channel}</span>
              <span
                className={
                  n.status === 'sent' ? 'text-positive' : n.status === 'failed' ? 'text-danger' : 'text-warning'
                }
              >
                {n.status}
              </span>
              {n.recipient && <span className="text-ink-faint">{n.recipient}</span>}
              {n.error && <span className="text-danger truncate max-w-[300px]">{n.error}</span>}
            </li>
          ))}
        </ul>
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
