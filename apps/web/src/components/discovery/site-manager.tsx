'use client';

/**
 * Site yöneticisi — ekleme sihirbazı, snippet, kurulum sağlığı, anahtar rotasyonu, doğrulama,
 * duraklatma/iptal, saklama süresi ve silme.
 *
 * Dürüstlük kuralları:
 *  - Public key ve ingest sırrı yalnızca üretildikleri anda gösterilir; sunucu bir daha veremez.
 *  - "Kurulum tamam" iddiası istemcide üretilmez: rozetler sunucunun `health` alanından gelir
 *    (son tarayıcı/sunucu olayı damgası). Tarayıcı olayı yoksa "script bulunamadı" denir.
 *  - Crawler ölçümü ayrı bir bağlantı gerektirir; script'in kurulu olması yeterli değildir.
 */
import { useCallback, useEffect, useId, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { formatRelative } from '@/lib/format-relative';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import {
  INSTALL_METHOD_LABELS,
  SITE_KIND_LABELS,
  SITE_STATUS_LABELS,
  labelOf,
  snippetFor,
  type CreateSiteResponse,
  type RotateKeyResponse,
  type SitesResponse,
  type TrackedSiteView,
  type VerifyInfoResponse,
  type VerifyResponse,
} from './types';

const RETENTION_OPTIONS = [7, 30, 90, 180, 365];

const STATUS_CLASS: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning border-warning/30',
  ACTIVE: 'bg-positive/10 text-positive border-positive/30',
  PAUSED: 'bg-paper-4 text-ink-muted border-hairline',
  REVOKED: 'bg-danger/10 text-danger border-danger/30',
};

const HEALTH_TEXT: Record<'ok' | 'stale' | 'missing', string> = {
  ok: 'veri geliyor',
  stale: '48 saattir veri yok',
  missing: 'bağlı değil',
};

const HEALTH_CLASS: Record<'ok' | 'stale' | 'missing', string> = {
  ok: 'bg-positive/10 text-positive border-positive/30',
  stale: 'bg-warning/10 text-warning border-warning/30',
  missing: 'bg-paper-4 text-ink-faint border-hairline',
};

/** Panoya kopyalama — izin verilmeyen ortamda sessizce başarısız olur, kullanıcıya metin görünür kalır. */
function CopyBox({ label, value, id }: { label: string; value: string; id?: string }) {
  const [copied, setCopied] = useState(false);
  const hydrated = useHydrated();
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[12px] text-ink-muted">{label}</span>
        <button
          type="button"
          disabled={!hydrated}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex items-center gap-1 text-[11.5px] text-brand-deep hover:text-brand disabled:opacity-50"
        >
          {copied ? <Check className="w-3 h-3" aria-hidden /> : <Copy className="w-3 h-3" aria-hidden />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <pre
        id={id}
        className="text-[11.5px] font-mono bg-paper-2 border border-hairline rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all"
      >
        {value}
      </pre>
    </div>
  );
}

type Wizard =
  { step: 'form' } | { step: 'install'; site: TrackedSiteView; publicKey: string; scriptUrl: string } | null;

export function SiteManager({ canWrite, onChanged }: { canWrite: boolean; onChanged?: () => void }) {
  const hydrated = useHydrated();
  const formId = useId();
  const [data, setData] = useState<SitesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ tone: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);
  const [wizard, setWizard] = useState<Wizard>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ siteId: string; kind: 'public' | 'ingest'; value: string } | null>(null);
  const [confirm, setConfirm] = useState<{
    type: 'delete' | 'revoke' | 'rotate-public' | 'rotate-ingest';
    site: TrackedSiteView;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Sihirbaz formu
  const [domain, setDomain] = useState('');
  const [siteKind, setSiteKind] = useState('saas');
  const [installMethod, setInstallMethod] = useState('script');
  const [wizardBusy, setWizardBusy] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [verifyInfo, setVerifyInfo] = useState<VerifyInfoResponse | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<SitesResponse>('/api/discovery/sites'));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Siteler yüklenemedi'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Sihirbazı kapatır ve üst bileşeni tazeler (anahtar ekranı kapanmadan tazeleme yapılmaz). */
  const closeWizard = useCallback(() => {
    setWizard(null);
    setVerifyInfo(null);
    void load();
    onChanged?.();
  }, [load, onChanged]);

  const limitReached = !!data && data.sites.length >= data.limits.trackedSites;
  const writable = canWrite && (data?.canWrite ?? false);

  async function createSite(e: React.FormEvent) {
    e.preventDefault();
    if (wizardBusy) return;
    setWizardBusy(true);
    setWizardError(null);
    try {
      const r = await apiFetch<CreateSiteResponse>('/api/discovery/sites', {
        method: 'POST',
        json: { domain, siteKind, installMethod },
      });
      setWizard({ step: 'install', site: r.site, publicKey: r.publicKey, scriptUrl: r.scriptUrl });
      setDomain('');
      // Üst bileşen YALNIZCA sihirbaz kapanınca tazelenir: anahtar ekranı açıkken ağaç değişmemeli
      // (bir kez gösterilen anahtar kullanıcıdan kaçmasın).
      await load();
      try {
        setVerifyInfo(
          await apiFetch<VerifyInfoResponse>(`/api/discovery/sites/${encodeURIComponent(r.site.id)}/verify`),
        );
      } catch {
        setVerifyInfo(null); // meta etiketi opsiyonel yoldur; snippet zaten gösterildi
      }
    } catch (err) {
      setWizardError(errorMessage(err, 'Site eklenemedi'));
    } finally {
      setWizardBusy(false);
    }
  }

  async function patchSite(site: TrackedSiteView, patch: Record<string, unknown>, note?: string) {
    setBusy(site.id);
    setFlash(null);
    try {
      await apiFetch(`/api/discovery/sites/${encodeURIComponent(site.id)}`, { method: 'PATCH', json: patch });
      if (note) setFlash({ tone: 'success', text: note });
      await load();
      onChanged?.();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Güncellenemedi') });
    } finally {
      setBusy(null);
    }
  }

  async function verifySite(site: TrackedSiteView) {
    setBusy(site.id);
    setFlash(null);
    try {
      const r = await apiFetch<VerifyResponse>(`/api/discovery/sites/${encodeURIComponent(site.id)}/verify`, {
        method: 'POST',
        timeoutMs: 30_000,
      });
      setFlash(
        r.verified
          ? { tone: 'success', text: `${site.domain}: alan adı sahipliği doğrulandı.` }
          : {
              tone: 'warning',
              text:
                r.reason === 'site_unreachable'
                  ? `${site.domain} adresine ulaşılamadı. Site yayında mı ve https ile açılıyor mu?`
                  : `${site.domain} ana sayfasında doğrulama meta etiketi bulunamadı.`,
            },
      );
      await load();
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err, 'Doğrulama yapılamadı') });
    } finally {
      setBusy(null);
    }
  }

  async function runConfirm() {
    if (!confirm) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      if (confirm.type === 'delete') {
        await apiFetch(`/api/discovery/sites/${encodeURIComponent(confirm.site.id)}?confirm=1`, { method: 'DELETE' });
        setFlash({ tone: 'info', text: `${confirm.site.domain} ve tüm ölçüm verisi silindi.` });
      } else if (confirm.type === 'revoke') {
        await apiFetch(`/api/discovery/sites/${encodeURIComponent(confirm.site.id)}`, {
          method: 'PATCH',
          json: { status: 'REVOKED' },
        });
        setFlash({ tone: 'info', text: `${confirm.site.domain} anahtarları iptal edildi; yeni olay kabul edilmiyor.` });
      } else {
        const kind = confirm.type === 'rotate-public' ? 'public' : 'ingest';
        const r = await apiFetch<RotateKeyResponse>(
          `/api/discovery/sites/${encodeURIComponent(confirm.site.id)}/keys`,
          { method: 'POST', json: { kind } },
        );
        const value = kind === 'public' ? r.publicKey : r.secret;
        if (value) setReveal({ siteId: confirm.site.id, kind, value });
      }
      setConfirm(null);
      await load();
      onChanged?.();
    } catch (err) {
      setConfirmError(errorMessage(err));
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {flash && <InlineAlert tone={flash.tone}>{flash.text}</InlineAlert>}
      {error && (
        <div className="space-y-2">
          <InlineAlert>{error}</InlineAlert>
          <button type="button" className="btn-secondary !py-1.5 !px-3 text-[12.5px]" onClick={() => void load()}>
            Tekrar dene
          </button>
        </div>
      )}
      {!canWrite && (
        <InlineAlert tone="info">
          Görüntüleyici rolü veya salt-okunur hesap: site ekleyemez, anahtar üretemez ve ayar değiştiremezsiniz.
        </InlineAlert>
      )}

      {reveal && (
        <div className="card p-5 border-warning/40 bg-warning/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-[15px]">
                {reveal.kind === 'public' ? 'Yeni site anahtarı' : 'Yeni sunucu ingest sırrı'}
              </h3>
              <p className="text-[12.5px] text-ink-muted mt-1">
                Bu değer <b>yalnızca bir kez</b> gösterilir; kapattığınızda sunucu bir daha veremez. Kaybederseniz
                yeniden üretmeniz gerekir.
                {reveal.kind === 'public'
                  ? ' Eski anahtar bu andan itibaren geçersizdir: sitedeki snippet’i güncellemezseniz ölçüm durur.'
                  : ' Sunucu/edge entegrasyonunuzdaki imza anahtarını güncelleyin.'}
              </p>
              <div className="mt-3">
                <CopyBox label={reveal.kind === 'public' ? 'Anahtar' : 'Sır'} value={reveal.value} />
              </div>
              {reveal.kind === 'public' && data && (
                <div className="mt-3">
                  <CopyBox label="Güncel snippet" value={snippetFor(data.scriptUrl, reveal.value)} />
                </div>
              )}
              <button
                type="button"
                onClick={() => setReveal(null)}
                className="btn-secondary !py-1.5 !px-3 text-[12.5px] mt-3"
              >
                Kaydettim, kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-[12px] text-ink-muted">
          {data && (
            <>
              <span className={`chip ${limitReached ? '!text-warning !border-warning/40' : ''}`}>
                <Globe className="w-3 h-3" aria-hidden /> {data.sites.length}/{data.limits.trackedSites} site
              </span>
              <span className="chip" title="Site başına aylık kabul edilen ham olay üst sınırı">
                {data.limits.sensorEventsPerMonth.toLocaleString('tr-TR')} olay / ay
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setWizardError(null);
            setVerifyInfo(null);
            setWizard({ step: 'form' });
          }}
          disabled={!hydrated || !writable || limitReached}
          title={limitReached ? 'Plan sınırına ulaşıldı; bir siteyi silin' : undefined}
          className="btn-primary inline-flex items-center justify-center gap-1.5 text-[13.5px] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" aria-hidden /> Site ekle
        </button>
      </div>

      {data && data.sites.length === 0 && !error && (
        <div className="card p-8 text-center">
          <Globe className="w-8 h-8 text-brand mx-auto" aria-hidden />
          <h2 className="font-display text-[20px] mt-4">Henüz izlenen site yok</h2>
          <p className="text-[13.5px] text-ink-muted mt-2 max-w-md mx-auto leading-relaxed">
            Alan adınızı ekleyin, tek satırlık snippet’i sitenize yapıştırın; AI ürünlerinden gelen gerçek ziyaretleri
            ve AI crawler isteklerini ayrı ayrı ölçmeye başlayalım.
          </p>
          <button
            type="button"
            onClick={() => {
              setWizardError(null);
              setVerifyInfo(null);
              setWizard({ step: 'form' });
            }}
            disabled={!hydrated || !writable}
            className="btn-primary inline-flex items-center gap-1.5 text-[13.5px] mt-6 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" aria-hidden /> İlk siteni ekle
          </button>
        </div>
      )}

      {data && data.sites.length > 0 && (
        <ul className="space-y-4" aria-label="İzlenen siteler">
          {data.sites.map((s) => (
            <li key={s.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display text-[17px] break-all">{s.domain}</h3>
                    <span className={`chip !text-[10.5px] border ${STATUS_CLASS[s.status]}`} role="status">
                      {labelOf(SITE_STATUS_LABELS, s.status)}
                    </span>
                    {s.verifiedAt ? (
                      <span className="chip !text-[10px] !text-positive !border-positive/30">alan adı doğrulandı</span>
                    ) : (
                      <span className="chip !text-[10px] !text-ink-faint">doğrulanmadı</span>
                    )}
                  </div>
                  <div className="text-[12px] text-ink-faint mt-1">
                    {labelOf(SITE_KIND_LABELS, s.siteKind, 'Tür seçilmedi')} ·{' '}
                    {labelOf(INSTALL_METHOD_LABELS, s.installMethod, 'Kurulum yöntemi seçilmedi')} · anahtar{' '}
                    <span className="font-mono">{s.publicKeyPrefix}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`chip !text-[10.5px] border ${HEALTH_CLASS[s.health.browser]}`}>
                    Tarayıcı: {HEALTH_TEXT[s.health.browser]}
                  </span>
                  <span className={`chip !text-[10.5px] border ${HEALTH_CLASS[s.health.server]}`}>
                    Sunucu/edge: {HEALTH_TEXT[s.health.server]}
                  </span>
                </div>
              </div>

              {s.health.hints.length > 0 && (
                <ul className="mt-3 space-y-1.5" aria-label={`${s.domain} kurulum uyarıları`}>
                  {s.health.hints.map((h) => (
                    <li key={h} className="text-[12.5px] text-ink-muted flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" aria-hidden />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="text-[12px] text-ink-faint mt-3 flex flex-wrap gap-x-4 gap-y-1">
                <span>Son tarayıcı olayı: {s.lastBrowserEventAt ? formatRelative(s.lastBrowserEventAt) : 'yok'}</span>
                <span>Son sunucu olayı: {s.lastServerEventAt ? formatRelative(s.lastServerEventAt) : 'yok'}</span>
                {s.lastSdkVersion && <span>SDK {s.lastSdkVersion}</span>}
              </div>

              <div className="mt-4">
                <CopyBox
                  label="Kurulum biçimi (anahtar yerine kendi anahtarınızı yazın)"
                  value={snippetFor(data.scriptUrl, `${s.publicKeyPrefix} (tam anahtar tekrar gösterilmez)`)}
                />
                <p className="text-[11px] text-ink-faint mt-1.5">
                  Tam anahtar güvenlik gereği yalnızca üretildiği anda gösterilir. Snippet’i kaybettiyseniz “Anahtarı
                  yenile” ile yeni bir anahtar üretip sitedeki satırı değiştirin.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label htmlFor={`${formId}-ret-${s.id}`} className="text-[12px] text-ink-muted block mb-1.5">
                    Ham veri saklama süresi
                  </label>
                  <select
                    id={`${formId}-ret-${s.id}`}
                    className="input"
                    value={s.retentionDays}
                    disabled={!hydrated || !writable || busy === s.id}
                    onChange={(e) =>
                      void patchSite(s, { retentionDays: Number(e.target.value) }, 'Saklama süresi güncellendi.')
                    }
                  >
                    {RETENTION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d} gün
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-faint mt-1">
                    Süre dolunca ham olaylar silinir; günlük toplamlar kalıcıdır.
                  </p>
                </div>
                <div>
                  <label htmlFor={`${formId}-kind-${s.id}`} className="text-[12px] text-ink-muted block mb-1.5">
                    Site türü
                  </label>
                  <select
                    id={`${formId}-kind-${s.id}`}
                    className="input"
                    value={s.siteKind ?? 'other'}
                    disabled={!hydrated || !writable || busy === s.id}
                    onChange={(e) => void patchSite(s, { siteKind: e.target.value }, 'Site türü güncellendi.')}
                  >
                    {Object.entries(SITE_KIND_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-ink-faint mt-1">
                    Tür, gösterilecek kartları ve hazır hedef paketini belirler.
                  </p>
                </div>
              </div>

              <OriginEditor
                key={s.allowedOrigins.join('|')}
                site={s}
                disabled={!hydrated || !writable || busy === s.id}
                onSave={(origins) =>
                  void patchSite(s, { allowedOrigins: origins }, 'Kabul edilen origin listesi güncellendi.')
                }
              />

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-hairline">
                {s.status === 'ACTIVE' && (
                  <SiteAction
                    icon={Pause}
                    label="Duraklat"
                    busy={busy === s.id}
                    disabled={!hydrated || !writable}
                    onClick={() => void patchSite(s, { status: 'PAUSED' }, 'Ölçüm duraklatıldı.')}
                  />
                )}
                {s.status === 'PAUSED' && (
                  <SiteAction
                    icon={Play}
                    label="Devam ettir"
                    busy={busy === s.id}
                    disabled={!hydrated || !writable}
                    onClick={() => void patchSite(s, { status: 'ACTIVE' }, 'Ölçüm yeniden başladı.')}
                  />
                )}
                {!s.verifiedAt && (
                  <SiteAction
                    icon={ShieldCheck}
                    label="Meta etiketiyle doğrula"
                    busy={busy === s.id}
                    disabled={!hydrated || !writable}
                    onClick={() => void verifySite(s)}
                  />
                )}
                <SiteAction
                  icon={RefreshCw}
                  label="Anahtarı yenile"
                  disabled={!hydrated || !writable}
                  onClick={() => {
                    setConfirmError(null);
                    setConfirm({ type: 'rotate-public', site: s });
                  }}
                />
                <SiteAction
                  icon={KeyRound}
                  label={s.hasIngestSecret ? 'Sunucu sırrını yenile' : 'Sunucu sırrı üret'}
                  disabled={!hydrated || !writable}
                  onClick={() => {
                    setConfirmError(null);
                    setConfirm({ type: 'rotate-ingest', site: s });
                  }}
                />
                <span className="flex-1" />
                {s.status !== 'REVOKED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmError(null);
                      setConfirm({ type: 'revoke', site: s });
                    }}
                    disabled={!hydrated || !writable}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-muted hover:text-warning hover:bg-warning/5 transition disabled:opacity-50"
                  >
                    Anahtarları iptal et
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setConfirmError(null);
                    setConfirm({ type: 'delete', site: s });
                  }}
                  disabled={!hydrated || !writable}
                  aria-label={`${s.domain} sitesini sil`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] text-ink-muted hover:text-danger hover:bg-danger/5 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden /> Sil
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!wizard}
        wide
        title={wizard?.step === 'install' ? 'Snippet’i sitenize ekleyin' : 'Site ekle'}
        description={
          wizard?.step === 'install'
            ? 'Anahtar yalnızca burada görünür. Snippet’i kopyalayıp sitenizin <head> bölümüne yapıştırın.'
            : 'Alan adı ve site türü; tür yalnızca hangi kartların ve hazır hedeflerin gösterileceğini belirler.'
        }
        onClose={closeWizard}
      >
        {wizard?.step === 'form' && (
          <form className="space-y-4" onSubmit={createSite}>
            <div>
              <label htmlFor={`${formId}-domain`} className="text-[12px] text-ink-muted block mb-1.5">
                Alan adı
              </label>
              <input
                id={`${formId}-domain`}
                className="input"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="ornek.com"
                autoComplete="off"
                required
              />
              <p className="text-[11px] text-ink-faint mt-1">
                Yalnızca https origin’i kaydedilir; www alt alan adı otomatik eklenir.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor={`${formId}-sitekind`} className="text-[12px] text-ink-muted block mb-1.5">
                  Site türü
                </label>
                <select
                  id={`${formId}-sitekind`}
                  className="input"
                  value={siteKind}
                  onChange={(e) => setSiteKind(e.target.value)}
                >
                  {Object.entries(SITE_KIND_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${formId}-install`} className="text-[12px] text-ink-muted block mb-1.5">
                  Kurulum yöntemi
                </label>
                <select
                  id={`${formId}-install`}
                  className="input"
                  value={installMethod}
                  onChange={(e) => setInstallMethod(e.target.value)}
                >
                  {Object.entries(INSTALL_METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {wizardError && <InlineAlert>{wizardError}</InlineAlert>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary !py-2 !px-4 text-[13px]" onClick={closeWizard}>
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={!hydrated || wizardBusy || !domain.trim()}
                className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
              >
                {wizardBusy ? 'Ekleniyor…' : 'Devam'}
              </button>
            </div>
          </form>
        )}

        {wizard?.step === 'install' && (
          <div className="space-y-4">
            <InlineAlert tone="warning">
              Bu anahtar bir daha gösterilmez. Snippet’i şimdi kopyalayın; kaybederseniz anahtarı yenilemeniz gerekir.
            </InlineAlert>
            <CopyBox
              label={`${wizard.site.domain} için snippet — <head> içine`}
              value={snippetFor(wizard.scriptUrl, wizard.publicKey)}
            />
            {verifyInfo && (
              <CopyBox label="İsteğe bağlı: alan adı sahipliğini kanıtlayan meta etiketi" value={verifyInfo.metaTag} />
            )}
            <div className="text-[12.5px] text-ink-muted leading-relaxed space-y-2">
              <p>
                Snippet yalnızca <b>gerçek insan ziyaretlerini</b> ölçer. JavaScript çalıştırmayan AI crawler’ları
                görmek için ayrıca sunucu/edge bağlantısı gerekir (sunucu sırrı üretip kenar entegrasyonunu bağlayın).
              </p>
              <p>
                Kurulumu doğrulamak için sitenizi yayınlayın ve bir sayfayı açın: ilk olay geldiğinde “Tarayıcı: veri
                geliyor” rozeti yeşile döner. Bunu istemci tarafında varsaymıyoruz.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary !py-2 !px-4 text-[13px]" onClick={closeWizard}>
                Bitir
              </button>
              <button
                type="button"
                disabled={!hydrated}
                className="btn-primary !py-2 !px-4 text-[13px] disabled:opacity-50"
                onClick={() => void load()}
              >
                Kurulumu kontrol et
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.type === 'delete'
            ? 'Siteyi sil'
            : confirm?.type === 'revoke'
              ? 'Anahtarları iptal et'
              : confirm?.type === 'rotate-ingest'
                ? 'Sunucu sırrını yenile'
                : 'Site anahtarını yenile'
        }
        description={
          confirm?.type === 'delete' ? (
            <>
              <b>{confirm.site.domain}</b> için tüm ölçüm verisi (oturumlar, olaylar, crawler kayıtları, günlük
              toplamlar) <b>kalıcı olarak silinir</b>. Bu işlem geri alınamaz.
            </>
          ) : confirm?.type === 'revoke' ? (
            <>
              <b>{confirm.site.domain}</b> için gelen tüm olaylar reddedilmeye başlar. İptal edilen site yeniden
              açılamaz; ölçüme devam etmek için yeni anahtar üretmeniz gerekir.
            </>
          ) : confirm?.type === 'rotate-ingest' ? (
            <>
              Yeni sunucu ingest sırrı üretilir ve <b>yalnızca bir kez</b> gösterilir. Eski sır anında geçersiz olur;
              kenar/sunucu entegrasyonunuz güncellenene kadar crawler ölçümü durur.
            </>
          ) : (
            <>
              Yeni site anahtarı üretilir ve <b>yalnızca bir kez</b> gösterilir. Eski anahtar anında geçersizdir:
              sitedeki snippet’i güncellemezseniz ziyaret ölçümü durur.
            </>
          )
        }
        confirmLabel={confirm?.type === 'delete' ? 'Sil' : confirm?.type === 'revoke' ? 'İptal et' : 'Yenile'}
        confirmPhrase={confirm?.type === 'delete' ? 'SİL' : undefined}
        destructive={confirm?.type === 'delete' || confirm?.type === 'revoke'}
        busy={confirmBusy}
        error={confirmError}
        onConfirm={() => void runConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function SiteAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy = false,
}: {
  icon: typeof RefreshCw;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
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
      )}
      {label}
    </button>
  );
}

/**
 * Ek origin listesi — kanonik origin ve www her zaman sunucuda eklenir, burada yalnızca fazladan
 * kabul edilenler (alt alan adı, staging) düzenlenir. Wildcard yoktur: tam eşleşme gerekir.
 */
function OriginEditor({
  site,
  disabled,
  onSave,
}: {
  site: TrackedSiteView;
  disabled?: boolean;
  onSave: (origins: string[]) => void;
}) {
  const fieldId = useId();
  const wwwOrigin = site.normalizedOrigin.replace('://', '://www.');
  const extras = site.allowedOrigins.filter((o) => o !== site.normalizedOrigin && o !== wwwOrigin);
  const [value, setValue] = useState(extras.join('\n'));
  const dirty = value.trim() !== extras.join('\n');

  return (
    <details className="mt-4">
      <summary className="text-[12.5px] text-ink-muted cursor-pointer">
        Kabul edilen ek adresler ({extras.length})
      </summary>
      <div className="mt-2">
        <label htmlFor={fieldId} className="text-[12px] text-ink-muted block mb-1.5">
          Her satıra bir origin (örn. https://blog.ornek.com)
        </label>
        <textarea
          id={fieldId}
          className="input font-mono !text-[12px]"
          rows={3}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://staging.ornek.com"
        />
        <p className="text-[11px] text-ink-faint mt-1">
          Buradaki adresler dışındaki origin’lerden gelen olaylar reddedilir. Joker karakter desteklenmez;
          <span className="font-mono"> {site.normalizedOrigin}</span> ve www adresi zaten kabul edilir.
        </p>
        <button
          type="button"
          disabled={disabled || !dirty}
          onClick={() =>
            onSave(
              value
                .split(/[\n,]/)
                .map((x) => x.trim())
                .filter(Boolean),
            )
          }
          className="btn-secondary !py-1.5 !px-3 text-[12.5px] mt-2 disabled:opacity-50"
        >
          Adresleri kaydet
        </button>
      </div>
    </details>
  );
}
