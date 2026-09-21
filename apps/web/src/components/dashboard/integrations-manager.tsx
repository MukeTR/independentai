'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ListChecks,
  Loader2,
  Plug,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Unplug,
  Webhook,
  Clock3,
  ExternalLink,
} from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { formatRelative } from '@/lib/format-relative';
import { commerceMessage } from '@/server/commerce/messages';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useRealtimeEvent } from '@/components/realtime-provider';
import { CatalogPreview } from './catalog-preview';
import { ConnectStoreWizard, PROVIDER_ICONS, ScopeExplainer, type WizardPreset } from './connect-store-wizard';
import {
  isSyncActive,
  progressFromSync,
  STATUS_LABELS,
  type ConnectionDto,
  type IntegrationsResponse,
  type SyncProgress,
  type SyncsResponse,
} from './integrations-types';

export type IntegrationsNotice = { kind: 'connected' | 'error'; code: string } | null;

const STATUS_CLASS: Record<ConnectionDto['status'], string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/30',
  ACTIVE: 'bg-positive/10 text-positive border-positive/30',
  ERROR: 'bg-danger/10 text-danger border-danger/30',
  DISCONNECTED: 'bg-paper-4 text-ink-faint border-hairline',
};

const POLL_MS = 5_000;

/**
 * Entegrasyon paneli: bağlantı kartları + sihirbaz + senkron ilerlemesi.
 * Canlı güncelleme: `integration.sync` / `integration.changed` Realtime olayları; Realtime yoksa yalnızca
 * aktif senkron varken 5 sn'lik polling (/syncs). Liste her zaman sunucu gerçeğinden yenilenir — istemci
 * hiçbir zaman kendi başına "bağlı" durumu üretmez.
 */
export function IntegrationsManager({
  initial,
  notice,
  readOnlyReason,
}: {
  initial: IntegrationsResponse;
  notice: IntegrationsNotice;
  readOnlyReason: 'viewer' | 'inactive' | null;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [data, setData] = useState<IntegrationsResponse>(initial);
  const [listError, setListError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<Record<string, SyncProgress>>({});
  const [flash, setFlash] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(() =>
    notice
      ? notice.kind === 'connected'
        ? {
            tone: 'success',
            text: 'Mağaza yetkilendirmesi tamamlandı; bağlantı doğrulandı ve ilk senkron kuyruğa alındı.',
          }
        : { tone: 'error', text: commerceMessage(notice.code) }
      : null,
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [preset, setPreset] = useState<WizardPreset>(null);
  const [confirm, setConfirm] = useState<{ type: 'delete' | 'disconnect'; conn: ConnectionDto } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, 'sync' | 'verify' | 'reconnect' | undefined>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);

  const canWrite = data.canWrite && !readOnlyReason;

  // OAuth dönüş parametrelerini URL'den temizle (mesaj yerel state'te kalır).
  useEffect(() => {
    if (notice) router.replace('/dashboard/integrations', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = useCallback(async () => {
    setRefreshing(true);
    try {
      setData(await apiFetch<IntegrationsResponse>('/api/integrations'));
      setListError(null);
    } catch (err) {
      setListError(errorMessage(err, 'Bağlantılar yüklenemedi'));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // ── Realtime ──
  useRealtimeEvent('integration.sync', (evt) => {
    const id = typeof evt.entityId === 'string' ? evt.entityId : null;
    if (!id) return;
    const status = String(evt.status ?? '') as SyncProgress['status'];
    if (!['queued', 'running', 'retrying', 'error', 'success'].includes(status)) return;
    setProgress((prev) => ({
      ...prev,
      [id]: {
        jobId: typeof evt.jobId === 'string' ? evt.jobId : null,
        status,
        progress:
          typeof evt.progress === 'number' ? evt.progress : status === 'success' ? 100 : (prev[id]?.progress ?? 0),
        fetched: typeof evt.fetched === 'number' ? evt.fetched : (prev[id]?.fetched ?? null),
        total: typeof evt.total === 'number' ? evt.total : (prev[id]?.total ?? null),
        errorCode: typeof evt.errorCode === 'string' ? evt.errorCode : null,
        at: Date.now(),
      },
    }));
    if (status === 'success' || status === 'error') void reload();
  });
  useRealtimeEvent('integration.changed', () => {
    void reload();
  });

  // ── Polling fallback: yalnızca aktif senkron varken ──
  const activeKey = useMemo(
    () =>
      data.connections
        .filter((c) => isSyncActive(c, progress[c.id]))
        .map((c) => c.id)
        .join(','),
    [data.connections, progress],
  );
  useEffect(() => {
    if (!activeKey) return;
    const ids = activeKey.split(',');
    let cancelled = false;
    const tick = async () => {
      for (const id of ids) {
        try {
          const r = await apiFetch<SyncsResponse>(`/api/integrations/${encodeURIComponent(id)}/syncs`);
          const latest = r.syncs[0];
          if (cancelled || !latest) continue;
          const p = progressFromSync(latest);
          setProgress((prev) => ({ ...prev, [id]: p }));
          if (p.status === 'success' || p.status === 'error') void reload();
        } catch {
          /* sessiz; sonraki turda tekrar */
        }
      }
    };
    const timer = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeKey, reload]);

  // ── Eylemler ──
  async function sync(conn: ConnectionDto) {
    setBusy((b) => ({ ...b, [conn.id]: 'sync' }));
    setFlash(null);
    try {
      await apiFetch(`/api/integrations/${encodeURIComponent(conn.id)}/sync`, { method: 'POST' });
      setProgress((prev) => ({
        ...prev,
        [conn.id]: {
          jobId: null,
          status: 'queued',
          progress: 0,
          fetched: 0,
          total: null,
          errorCode: null,
          at: Date.now(),
        },
      }));
      await reload();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Senkron başlatılamadı') });
    } finally {
      setBusy((b) => ({ ...b, [conn.id]: undefined }));
    }
  }

  async function verify(conn: ConnectionDto) {
    setBusy((b) => ({ ...b, [conn.id]: 'verify' }));
    setFlash(null);
    try {
      const r = await apiFetch<{ ok: boolean; code: string | null; message: string | null }>(
        `/api/integrations/${encodeURIComponent(conn.id)}/verify`,
        {
          method: 'POST',
          timeoutMs: 45_000,
        },
      );
      setFlash(
        r.ok
          ? { tone: 'success', text: `${conn.storeDomain}: kimlik bilgileri doğrulandı.` }
          : { tone: 'error', text: r.message ?? commerceMessage(r.code) },
      );
      await reload();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Doğrulama başarısız') });
    } finally {
      setBusy((b) => ({ ...b, [conn.id]: undefined }));
    }
  }

  function reconnect(conn: ConnectionDto) {
    setPreset({ provider: conn.provider, storeDomain: conn.storeDomain });
    setWizardOpen(true);
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      if (confirm.type === 'delete')
        await apiFetch(`/api/integrations/${encodeURIComponent(confirm.conn.id)}`, { method: 'DELETE' });
      else await apiFetch(`/api/integrations/${encodeURIComponent(confirm.conn.id)}/disconnect`, { method: 'POST' });
      setFlash({
        tone: 'info',
        text:
          confirm.type === 'delete'
            ? `${confirm.conn.storeDomain} ve katalog verisi silindi.`
            : `${confirm.conn.storeDomain} bağlantısı kesildi; kimlik bilgisi silindi.`,
      });
      setConfirm(null);
      if (previewId === confirm.conn.id) setPreviewId(null);
      await reload();
    } catch (err) {
      setConfirmError(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  }

  const used = data.connections.filter((c) => c.status !== 'DISCONNECTED').length;
  const limitReached = used >= data.limits.storeConnections;

  return (
    <div className="space-y-5">
      {readOnlyReason && (
        <InlineAlert tone="info">
          {readOnlyReason === 'viewer'
            ? 'Görüntüleyici rolü mağaza bağlayamaz veya değiştiremez; mevcut bağlantıları ve katalogu görebilirsiniz.'
            : 'Deneme süresi dolduğu için entegrasyonlar salt-okunur; senkronlar durdu, veriler korunuyor.'}
        </InlineAlert>
      )}
      {flash && <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert>}
      {listError && (
        <InlineAlert>
          {listError}{' '}
          <button type="button" className="underline" onClick={() => void reload()}>
            Tekrar dene
          </button>
        </InlineAlert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-[12px] text-ink-muted">
          <span
            className={`chip ${limitReached ? '!text-warning !border-warning/40' : ''}`}
            title="Plan sınırı: aktif mağaza bağlantısı"
          >
            <Plug className="w-3 h-3" aria-hidden /> {used}/{data.limits.storeConnections} bağlantı
          </span>
          <span className="chip" title="Plan sınırı: bağlantı başına senkronlanan en fazla ürün">
            <ListChecks className="w-3 h-3" aria-hidden /> {data.limits.catalogProducts.toLocaleString('tr-TR')} ürün /
            bağlantı
          </span>
          {refreshing && (
            <span className="inline-flex items-center gap-1 text-ink-faint" aria-live="polite">
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> yenileniyor
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setPreset(null);
            setWizardOpen(true);
          }}
          disabled={!hydrated || !canWrite || limitReached}
          className="btn-primary inline-flex items-center justify-center gap-1.5 text-[13.5px] disabled:opacity-50"
          title={limitReached ? 'Plan sınırına ulaşıldı; bir bağlantıyı kesin veya silin' : undefined}
        >
          <Plus className="w-4 h-4" aria-hidden /> Mağaza bağla
        </button>
      </div>

      {data.connections.length === 0 ? (
        <div className="card p-8 text-center">
          <Plug className="w-8 h-8 text-brand mx-auto" aria-hidden />
          <h2 className="font-display text-[20px] mt-4">Henüz mağaza bağlı değil</h2>
          <p className="text-[13.5px] text-ink-muted mt-2 max-w-md mx-auto leading-relaxed">
            Shopify, ikas veya Ticimax mağazanızı bağlayın; ürün kataloğunuzu salt-okunur senkronlayıp AI asistanlarında
            nasıl göründüğünü ölçelim.
          </p>
          <div className="mt-6 max-w-xl mx-auto text-left">
            <ScopeExplainer compact />
          </div>
          <button
            type="button"
            onClick={() => {
              setPreset(null);
              setWizardOpen(true);
            }}
            disabled={!hydrated || !canWrite}
            className="btn-primary inline-flex items-center gap-1.5 text-[13.5px] mt-6 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" aria-hidden /> İlk mağazanı bağla
          </button>
        </div>
      ) : (
        <ul className="space-y-4" aria-label="Mağaza bağlantıları">
          {data.connections.map((c) => {
            const Icon = PROVIDER_ICONS[c.provider];
            const p = progress[c.id];
            const active = isSyncActive(c, p);
            const b = busy[c.id];
            const open = previewId === c.id;
            return (
              <li key={c.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <span className="w-10 h-10 rounded-xl bg-brand-glow flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-brand" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-display text-[17px] truncate">{c.displayName ?? c.storeDomain}</h2>
                      <span className={`chip !text-[10.5px] border ${STATUS_CLASS[c.status]}`} role="status">
                        {STATUS_LABELS[c.status]}
                      </span>
                      <span className="chip !text-[10px]">{c.providerLabel}</span>
                    </div>
                    <div className="text-[12px] text-ink-faint font-mono mt-0.5 break-all">{c.storeDomain}</div>
                    <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[12.5px] text-ink-muted mt-2">
                      <span className="tabular">{c.productCount.toLocaleString('tr-TR')} ürün</span>
                      <span title={c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString('tr-TR') : 'Henüz senkron yok'}>
                        Son senkron: {c.lastSyncAt ? formatRelative(c.lastSyncAt) : 'henüz yok'}
                      </span>
                      {c.status !== 'DISCONNECTED' &&
                        (c.webhooksRegistered ? (
                          <span className="inline-flex items-center gap-1 text-positive">
                            <Webhook className="w-3 h-3" aria-hidden /> canlı güncelleme
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="w-3 h-3" aria-hidden /> günlük senkron
                          </span>
                        ))}
                    </div>
                    {c.errorMessage && c.status !== 'DISCONNECTED' && !(p && p.status === 'success') && (
                      <InlineAlert tone={c.status === 'ERROR' ? 'error' : 'warning'} className="mt-3 !py-2">
                        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden />
                        {c.errorMessage}
                        {c.lastErrorAt ? (
                          <span className="text-ink-faint"> · {formatRelative(c.lastErrorAt)}</span>
                        ) : null}
                      </InlineAlert>
                    )}
                    {c.status === 'PENDING' && !active && (
                      <p className="text-[12.5px] text-ink-muted mt-3">
                        Yetkilendirme tamamlanmadı.{' '}
                        {c.provider === 'SHOPIFY' ? (
                          <a
                            href={`/api/integrations/shopify/install?connectionId=${encodeURIComponent(c.id)}`}
                            className="underline text-brand-deep inline-flex items-center gap-1"
                          >
                            Shopify&apos;da devam et <ExternalLink className="w-3 h-3" aria-hidden />
                          </a>
                        ) : (
                          '"Yeniden bağlan" ile kimlik bilgilerini girin.'
                        )}
                      </p>
                    )}
                    <SyncProgressBar progress={p} active={active} lastSyncStatus={c.lastSync?.status ?? null} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-hairline">
                  {c.status === 'ACTIVE' && (
                    <ActionButton
                      onClick={() => sync(c)}
                      disabled={!hydrated || !canWrite || !!b || active}
                      busy={b === 'sync'}
                      icon={RefreshCw}
                      label={active ? 'Senkron sürüyor' : 'Şimdi senkronla'}
                    />
                  )}
                  {(c.status === 'ACTIVE' || c.status === 'ERROR') && c.hasCredentials && (
                    <ActionButton
                      onClick={() => verify(c)}
                      disabled={!hydrated || !canWrite || !!b}
                      busy={b === 'verify'}
                      icon={ShieldCheck}
                      label="Doğrula"
                    />
                  )}
                  {(c.status === 'ERROR' || c.status === 'DISCONNECTED' || c.status === 'PENDING') && (
                    <ActionButton
                      onClick={() => reconnect(c)}
                      disabled={!hydrated || !canWrite || limitReachedFor(c, used, data.limits.storeConnections)}
                      icon={Plug}
                      label="Yeniden bağlan"
                    />
                  )}
                  {c.status !== 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => setPreviewId(open ? null : c.id)}
                      aria-expanded={open}
                      aria-controls={`preview-${c.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-[12.5px] hover:bg-paper-2 transition"
                    >
                      <ListChecks className="w-3.5 h-3.5" aria-hidden />{' '}
                      {open ? 'Ürünleri gizle' : 'Ürünleri görüntüle'}
                    </button>
                  )}
                  <span className="flex-1" />
                  {(c.status === 'ACTIVE' || c.status === 'ERROR') && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmError(null);
                        setConfirm({ type: 'disconnect', conn: c });
                      }}
                      disabled={!hydrated || !canWrite}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-muted hover:text-warning hover:bg-warning/5 transition disabled:opacity-50"
                    >
                      <Unplug className="w-3.5 h-3.5" aria-hidden /> Bağlantıyı kes
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      setConfirm({ type: 'delete', conn: c });
                    }}
                    disabled={!hydrated || !canWrite}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-muted hover:text-danger hover:bg-danger/5 transition disabled:opacity-50"
                    aria-label={`${c.storeDomain} bağlantısını sil`}
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden /> Sil
                  </button>
                </div>

                {open && (
                  <div id={`preview-${c.id}`}>
                    <CatalogPreview connectionId={c.id} status={c.status} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConnectStoreWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        providers={data.providers}
        preset={preset}
        onConnected={() => void reload()}
      />

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'delete' ? 'Bağlantıyı sil' : 'Bağlantıyı kes'}
        description={
          confirm?.type === 'delete' ? (
            <>
              <b>{confirm.conn.storeDomain}</b> bağlantısı ve senkronlanan tüm katalog verisi kalıcı olarak silinir.
              Mağazanızdaki veriye dokunulmaz.
            </>
          ) : (
            <>
              <b>{confirm?.conn.storeDomain}</b> için saklanan kimlik bilgisi silinir, senkron durur ve katalog
              arşivlenir. Kayıt denetim izi için kalır; istediğinizde yeniden bağlanabilirsiniz.
            </>
          )
        }
        confirmLabel={confirm?.type === 'delete' ? 'Sil' : 'Bağlantıyı kes'}
        destructive
        busy={confirmBusy}
        error={confirmError}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

/** Yeniden bağlanma plan sınırını yalnızca DISCONNECTED satır için tüketir (PENDING/ERROR zaten sayılıyor). */
function limitReachedFor(c: ConnectionDto, used: number, limit: number): boolean {
  return c.status === 'DISCONNECTED' && used >= limit;
}

function ActionButton({
  onClick,
  disabled,
  busy = false,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  icon: typeof RefreshCw;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-[12.5px] hover:bg-paper-2 transition disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : (
        <Icon className="w-3.5 h-3.5" aria-hidden />
      )}{' '}
      {label}
    </button>
  );
}

function SyncProgressBar({
  progress,
  active,
  lastSyncStatus,
}: {
  progress: SyncProgress | undefined;
  active: boolean;
  lastSyncStatus: string | null;
}) {
  if (!progress && !active) return null;
  const pct = progress ? Math.max(0, Math.min(100, progress.progress)) : 0;
  const status = progress?.status ?? (lastSyncStatus === 'RUNNING' ? 'running' : 'queued');
  const label =
    status === 'queued'
      ? 'Senkron kuyruğa alındı…'
      : status === 'retrying'
        ? `Geçici hata; yeniden denenecek (${commerceMessage(progress?.errorCode ?? 'UPSTREAM_ERROR')})`
        : status === 'running'
          ? `Senkronlanıyor${progress?.fetched != null ? ` · ${progress.fetched.toLocaleString('tr-TR')}${progress.total ? ` / ${progress.total.toLocaleString('tr-TR')}` : ''} ürün` : ''}`
          : status === 'success'
            ? `Senkron tamamlandı${progress?.fetched != null ? ` · ${progress.fetched.toLocaleString('tr-TR')} ürün` : ''}${progress?.errorCode ? ` · ${commerceMessage(progress.errorCode)}` : ''}`
            : `Senkron başarısız: ${commerceMessage(progress?.errorCode ?? null)}`;
  return (
    <div className="mt-3" aria-live="polite">
      <div className="flex items-center justify-between text-[11.5px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          {status === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-positive" aria-hidden />
          ) : status === 'error' ? (
            <AlertTriangle className="w-3.5 h-3.5 text-danger" aria-hidden />
          ) : (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          )}
          {label}
        </span>
        {active && <span className="tabular">{pct}%</span>}
      </div>
      {active && (
        <div
          className="h-1.5 rounded-full bg-paper-4 overflow-hidden mt-1.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Katalog senkron ilerlemesi"
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${status === 'retrying' ? 'bg-warning' : 'bg-brand'}`}
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
      )}
    </div>
  );
}
