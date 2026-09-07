'use client';

import { useEffect, useId, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ExternalLink,
  HelpCircle,
  Loader2,
  Search,
  ShoppingBag,
  Store,
  X,
} from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { isCommerceErrorCode, USER_MESSAGES } from '@/server/commerce/messages';
import { InlineAlert } from '@/components/ui/inline-alert';
import type {
  CommerceProvider,
  CreateConnectionResponse,
  PlatformDetectResponse,
  ProviderDto,
} from './integrations-types';

type Step = 'platform' | 'store' | 'auth' | 'done';
const STEPS: { key: Step; label: string }[] = [
  { key: 'platform', label: 'Platform' },
  { key: 'store', label: 'Mağaza' },
  { key: 'auth', label: 'Yetki' },
  { key: 'done', label: 'Sonuç' },
];

export const PROVIDER_ICONS: Record<CommerceProvider, typeof Store> = {
  SHOPIFY: ShoppingBag,
  IKAS: Store,
  TICIMAX: Boxes,
};

const PROVIDER_HINTS: Record<CommerceProvider, string> = {
  SHOPIFY:
    'OAuth ile salt-okunur ürün izni (read_products). App Store listesinde değil — kendi Partner hesabınızdaki özel uygulama ile kurulur.',
  IKAS: 'ikas yönetim panelinde oluşturduğunuz özel uygulamanın Client ID / Client Secret bilgileriyle bağlanır. Salt-okunur ürün erişimi.',
  TICIMAX: 'Ticimax ürün servisi (SOAP) ve üye kodu ile bağlanır. Webhook yok: katalog günde bir kez senkronlanır.',
};

/** normalizeStoreDomain (sunucu) ile aynı kural — erken geri bildirim için istemci kopyası. */
const DOMAIN_RE = /^[a-z0-9][a-z0-9.-]{1,120}\.[a-z]{2,}$/;
const SHOP_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const IKAS_RE = /^[a-z0-9][a-z0-9-]*\.myikas\.com$/;

function cleanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

function normalizeShop(raw: string): string | null {
  let s = cleanDomain(raw);
  if (s && !s.includes('.')) s = `${s}.myshopify.com`;
  return SHOP_RE.test(s) ? s : null;
}

function normalizeIkas(raw: string): string | null {
  let s = cleanDomain(raw);
  if (s && !s.includes('.')) s = `${s}.myikas.com`;
  return IKAS_RE.test(s) ? s : null;
}

/**
 * Sağlayıcı connect uçları (ikas/Ticimax) hatayı 400 `{ message, code, details: { code, retryable } }` ile döner;
 * `details.code` bir CommerceErrorCode ise kullanıcı metni messages.ts'ten alınır (sunucu metniyle aynı kaynak).
 */
async function postConnect(url: string, json: Record<string, unknown>): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    throw new Error(
      err instanceof Error && err.name === 'TimeoutError'
        ? 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.'
        : 'Bağlantı hatası. İnternet bağlantınızı kontrol edip tekrar deneyin.',
    );
  }
  if (res.ok) return;
  let data: { message?: string; code?: string; details?: { code?: string; retryable?: boolean } } = {};
  try {
    data = (await res.json()) as typeof data;
  } catch {
    /* gövdesiz hata */
  }
  const detailCode = data.details?.code;
  if (isCommerceErrorCode(detailCode)) {
    const suffix = data.details?.retryable ? ' Birkaç dakika sonra yeniden deneyebilirsiniz.' : '';
    throw new Error(`${USER_MESSAGES[detailCode]}${suffix}`);
  }
  throw new Error(
    data.message ??
      (res.status === 429 ? 'Çok fazla istek, biraz sonra tekrar deneyin.' : `İstek başarısız (${res.status})`),
  );
}

/** Servis adresi: yalnızca herkese açık https — yerel/özel ağ ipuçlarını daha sunucuya gitmeden reddet (sunucu ayrıca SSRF denetimi yapar). */
function validateServiceBase(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const s = raw.trim();
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { ok: false, message: 'Servis adresi geçerli bir URL olmalı (örn. https://www.magaza.com)' };
  }
  const host = u.hostname.toLowerCase();
  const privateHost =
    host === 'localhost' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(
      host,
    ) ||
    host === '::1' ||
    host.startsWith('[') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host);
  if (u.protocol !== 'https:' || privateHost || u.username || u.password) {
    return {
      ok: false,
      message: 'Servis adresi herkese açık bir https adresi olmalı (yerel/özel ağ adresleri ve IP kabul edilmez)',
    };
  }
  return { ok: true, value: `${u.origin}${u.pathname.replace(/\/+$/, '')}` };
}

export type WizardPreset = { provider: CommerceProvider; storeDomain: string } | null;

/**
 * Mağaza bağlama sihirbazı (native <dialog>): platform → mağaza adresi → yetki → sonuç.
 *  - Shopify: PENDING bağlantı → `next` (OAuth yönlendirmesi; geri dönüş ?connected/?error ile).
 *  - ikas / Ticimax: PENDING bağlantı → sağlayıcı connect ucu (kimlik bilgisi yalnızca istek gövdesinde; state temizlenir).
 * Sahte "bağlandı" yok: sonuç ekranı yalnızca connect ucu 2xx dönerse gösterilir.
 */
export function ConnectStoreWizard({
  open,
  onClose,
  providers,
  preset,
  onConnected,
}: {
  open: boolean;
  onClose: () => void;
  providers: ProviderDto[];
  preset: WizardPreset;
  onConnected: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const ids = {
    domain: useId(),
    service: useId(),
    member: useId(),
    clientId: useId(),
    secret: useId(),
    detect: useId(),
  };
  const hydrated = useHydrated();

  const [step, setStep] = useState<Step>('platform');
  const [provider, setProvider] = useState<CommerceProvider | null>(null);
  const [domain, setDomain] = useState('');
  const [serviceBase, setServiceBase] = useState('');
  const [uyeKodu, setUyeKodu] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [next, setNext] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Platform tespiti
  const [detectOpen, setDetectOpen] = useState(false);
  const [detectUrl, setDetectUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<PlatformDetectResponse | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  function reset() {
    setStep(preset ? 'store' : 'platform');
    setProvider(preset?.provider ?? null);
    setDomain(preset?.storeDomain ?? '');
    setServiceBase('');
    setUyeKodu('');
    setClientId('');
    setClientSecret('');
    setConnectionId(null);
    setNext(null);
    setBusy(false);
    setError(null);
    setRedirecting(false);
    setDetectOpen(false);
    setDetectUrl('');
    setDetection(null);
    setDetectError(null);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      reset();
      el.showModal();
    } else if (!open && el.open) el.close();
    // reset yalnızca açılışta çalışır; preset değişimi yeni açılışta okunur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function close() {
    if (busy || redirecting) return;
    // Kimlik bilgileri bellekte kalmasın
    setClientSecret('');
    setUyeKodu('');
    onClose();
  }

  const selected = provider ? (providers.find((p) => p.provider === provider) ?? null) : null;

  async function detect(e: React.FormEvent) {
    e.preventDefault();
    if (!detectUrl.trim() || detecting) return;
    setDetecting(true);
    setDetectError(null);
    setDetection(null);
    try {
      setDetection(
        await apiFetch<PlatformDetectResponse>('/api/tools/platform-detect', {
          method: 'POST',
          json: { url: detectUrl.trim() },
          timeoutMs: 30_000,
        }),
      );
    } catch (err) {
      setDetectError(errorMessage(err, 'Tespit başarısız'));
    } finally {
      setDetecting(false);
    }
  }

  function useDetected() {
    if (!detection || !detection.connectorAvailable) return;
    const p = detection.platform as CommerceProvider;
    setProvider(p);
    try {
      const host = new URL(detection.url).hostname.toLowerCase();
      setDomain(
        p === 'SHOPIFY' ? (SHOP_RE.test(host) ? host : '') : p === 'IKAS' ? (IKAS_RE.test(host) ? host : '') : host,
      );
      if (p === 'TICIMAX') setServiceBase(`https://${host}`);
    } catch {
      /* alan adı doldurulamadı; kullanıcı girer */
    }
    setStep('store');
  }

  async function submitStore(e: React.FormEvent) {
    e.preventDefault();
    if (!provider || busy) return;
    setError(null);
    let storeDomain: string;
    if (provider === 'SHOPIFY') {
      const shop = normalizeShop(domain);
      if (!shop)
        return setError('Shopify mağaza adresi "magaza.myshopify.com" biçiminde olmalı (özel alan adı değil).');
      storeDomain = shop;
    } else if (provider === 'IKAS') {
      const shop = normalizeIkas(domain);
      if (!shop) return setError('ikas mağaza adresi "magaza.myikas.com" biçiminde olmalı (özel alan adı değil).');
      storeDomain = shop;
    } else {
      storeDomain = cleanDomain(domain);
      if (!DOMAIN_RE.test(storeDomain)) return setError('Geçerli bir mağaza alan adı girin (örn. www.magaza.com).');
    }
    if (provider === 'TICIMAX') {
      const v = validateServiceBase(serviceBase);
      if (!v.ok) return setError(v.message);
      setServiceBase(v.value);
      if (uyeKodu.trim().length < 3) return setError('Üye kodu gerekli.');
    }
    setBusy(true);
    try {
      const r = await apiFetch<CreateConnectionResponse>('/api/integrations', {
        method: 'POST',
        json: { provider, storeDomain },
      });
      setConnectionId(r.connection.id);
      setNext(r.next);
      setDomain(storeDomain);
      setStep('auth');
    } catch (err) {
      setError(errorMessage(err, 'Bağlantı oluşturulamadı'));
    } finally {
      setBusy(false);
    }
  }

  function goToShopify() {
    if (!next) return;
    setRedirecting(true);
    window.location.href = next;
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (!provider || !connectionId || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (provider === 'IKAS') {
        if (!clientId.trim() || !clientSecret.trim()) throw new Error('Client ID ve Client Secret gerekli.');
        await postConnect('/api/integrations/ikas/connect', {
          connectionId,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        });
      } else if (provider === 'TICIMAX') {
        await postConnect('/api/integrations/ticimax/connect', { connectionId, serviceBase, uyeKodu: uyeKodu.trim() });
      }
      setClientSecret('');
      setUyeKodu('');
      setStep('done');
      onConnected();
    } catch (err) {
      setError(errorMessage(err, 'Doğrulama başarısız'));
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      className="rounded-2xl p-0 border border-hairline bg-paper-3 text-ink shadow-2xl w-[min(94vw,640px)] max-h-[92vh] backdrop:bg-ink/40"
    >
      <div className="p-5 sm:p-7 overflow-y-auto max-h-[92vh]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Mağaza bağla</div>
            <h2 id={titleId} className="font-display text-[20px] mt-1">
              {step === 'platform' && 'Platformunuzu seçin'}
              {step === 'store' && `${selected?.label ?? 'Mağaza'} — mağaza adresi`}
              {step === 'auth' && `${selected?.label ?? 'Mağaza'} — yetkilendirme`}
              {step === 'done' && 'Bağlantı kuruldu'}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy || redirecting}
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-paper-4 disabled:opacity-40"
            aria-label="Sihirbazı kapat"
          >
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>

        <ol className="flex items-center gap-2 mt-5 text-[11px]" aria-label="Adımlar">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2" aria-current={s.key === step ? 'step' : undefined}>
              <span
                className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-mono ${
                  i < stepIndex
                    ? 'bg-positive text-white'
                    : i === stepIndex
                      ? 'bg-ink text-paper-3'
                      : 'bg-paper-4 text-ink-faint'
                }`}
                aria-hidden
              >
                {i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
              </span>
              <span className={i === stepIndex ? 'text-ink' : 'text-ink-faint'}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="w-4 h-px bg-hairline" aria-hidden />}
            </li>
          ))}
        </ol>

        {/* ── Adım 1: platform ── */}
        {step === 'platform' && (
          <div className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Platform">
              {providers.map((p) => {
                const Icon = PROVIDER_ICONS[p.provider];
                const active = provider === p.provider;
                return (
                  <button
                    key={p.provider}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={!p.configured || !hydrated}
                    onClick={() => {
                      setProvider(p.provider);
                      setError(null);
                    }}
                    className={`text-left rounded-xl border p-4 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      active ? 'border-brand bg-brand-glow/40' : 'border-hairline hover:border-ink/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-5 h-5 text-brand" aria-hidden />
                      <span className="chip !text-[10px]">beta</span>
                    </div>
                    <div className="font-medium text-[14px] mt-3">{p.label}</div>
                    <div className="text-[11.5px] text-ink-faint mt-1">
                      {!p.configured
                        ? 'Sunucuda yapılandırılmamış'
                        : p.capabilities?.webhooks
                          ? 'OAuth · canlı güncelleme (webhook)'
                          : p.auth === 'oauth'
                            ? 'OAuth'
                            : 'API anahtarı · günlük senkron'}
                    </div>
                  </button>
                );
              })}
            </div>
            {selected && (
              <p className="text-[12.5px] text-ink-muted mt-3 leading-relaxed">{PROVIDER_HINTS[selected.provider]}</p>
            )}

            <div className="mt-5 rounded-xl border border-dashed border-hairline p-4">
              <button
                type="button"
                onClick={() => setDetectOpen((v) => !v)}
                aria-expanded={detectOpen}
                aria-controls={ids.detect}
                className="inline-flex items-center gap-1.5 text-[13px] text-brand-deep hover:text-brand"
              >
                <HelpCircle className="w-4 h-4" aria-hidden /> Platformumu bilmiyorum
              </button>
              {detectOpen && (
                <form id={ids.detect} onSubmit={detect} className="mt-3">
                  <label htmlFor={`${ids.detect}-url`} className="text-[12px] text-ink-muted block mb-1.5">
                    Mağazanızın adresi — herkese açık sayfadan tespit ederiz, kimlik bilgisi gerekmez
                  </label>
                  <div className="flex gap-2">
                    <input
                      id={`${ids.detect}-url`}
                      value={detectUrl}
                      onChange={(e) => setDetectUrl(e.target.value)}
                      placeholder="www.magaza.com"
                      className="input !py-2 text-[13px]"
                      inputMode="url"
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      disabled={!hydrated || detecting || !detectUrl.trim()}
                      className="btn-secondary !py-2 !px-3 text-[13px] inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                      aria-busy={detecting}
                    >
                      {detecting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Search className="w-3.5 h-3.5" aria-hidden />
                      )}{' '}
                      Tespit et
                    </button>
                  </div>
                  {detectError && <InlineAlert className="mt-3">{detectError}</InlineAlert>}
                  {detection && (
                    <div className="mt-3 text-[13px]" role="status">
                      <div>
                        Tespit: <b>{detection.label}</b>{' '}
                        <span className="text-ink-faint">(güven %{Math.round(detection.confidence * 100)})</span>
                      </div>
                      {detection.evidence.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5 mt-2" aria-label="Kanıtlar">
                          {detection.evidence.map((e) => (
                            <li key={e} className="chip !text-[10.5px]">
                              {e}
                            </li>
                          ))}
                        </ul>
                      )}
                      {detection.connectorAvailable ? (
                        <button
                          type="button"
                          onClick={useDetected}
                          className="btn-primary !py-2 !px-3 text-[13px] mt-3 inline-flex items-center gap-1.5"
                        >
                          {detection.label} ile devam et <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                        </button>
                      ) : (
                        <p className="text-ink-muted mt-2 leading-relaxed">
                          {detection.platform === 'UNKNOWN'
                            ? 'Platformu güvenle tespit edemedik.'
                            : `${detection.label} için doğrudan bağlayıcımız henüz yok.`}{' '}
                          Mağaza bağlamadan da{' '}
                          <a
                            href="/arac/urun-sayfasi-testi"
                            className="underline text-brand-deep"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            ürün sayfası testini
                          </a>{' '}
                          kullanabilirsiniz.
                        </p>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={close} className="btn-secondary !py-2 !px-4 text-[13px]">
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!provider || !hydrated}
                onClick={() => setStep('store')}
                className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                Devam <ArrowRight className="w-3.5 h-3.5" aria-hidden />
              </button>
            </div>
          </div>
        )}

        {/* ── Adım 2: mağaza adresi ── */}
        {step === 'store' && provider && (
          <form onSubmit={submitStore} className="mt-6 space-y-4">
            <div>
              <label htmlFor={ids.domain} className="text-[13px] font-medium">
                {provider === 'SHOPIFY'
                  ? 'Shopify mağaza adresi'
                  : provider === 'IKAS'
                    ? 'ikas mağaza adresi'
                    : 'Mağaza alan adı'}
              </label>
              <input
                id={ids.domain}
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder={
                  provider === 'SHOPIFY'
                    ? 'magaza.myshopify.com'
                    : provider === 'IKAS'
                      ? 'magaza.myikas.com'
                      : 'www.magaza.com'
                }
                className="input mt-1.5"
                autoComplete="off"
                inputMode="url"
                required
                aria-describedby={`${ids.domain}-hint`}
              />
              <p id={`${ids.domain}-hint`} className="text-[11.5px] text-ink-faint mt-1.5">
                {provider === 'SHOPIFY'
                  ? 'Yönetim panelindeki .myshopify.com adresi; özel alan adınızı değil. Yalnızca ad girerseniz ".myshopify.com" ekleriz.'
                  : provider === 'IKAS'
                    ? 'ikas mağaza adresiniz .myikas.com biçiminde olmalı; özel alan adınızı değil. Yalnızca ad girerseniz ".myikas.com" ekleriz.'
                    : 'Ürün bağlantılarını oluşturmak ve mağazayı tanımak için kullanılır.'}
              </p>
            </div>
            {provider === 'TICIMAX' && (
              <>
                <div>
                  <label htmlFor={ids.service} className="text-[13px] font-medium">
                    Servis adresi (https)
                  </label>
                  <input
                    id={ids.service}
                    value={serviceBase}
                    onChange={(e) => setServiceBase(e.target.value)}
                    placeholder="https://www.magaza.com"
                    className="input mt-1.5"
                    autoComplete="off"
                    inputMode="url"
                    required
                    aria-describedby={`${ids.service}-hint`}
                  />
                  <p id={`${ids.service}-hint`} className="text-[11.5px] text-ink-faint mt-1.5">
                    Ticimax web servis kökü; <span className="font-mono">/Servis/UrunServis.svc</span> biz ekleriz.
                    Yalnızca herkese açık https adresleri.
                  </p>
                </div>
                <div>
                  <label htmlFor={ids.member} className="text-[13px] font-medium">
                    Üye kodu
                  </label>
                  <input
                    id={ids.member}
                    type="password"
                    value={uyeKodu}
                    onChange={(e) => setUyeKodu(e.target.value)}
                    className="input mt-1.5"
                    autoComplete="off"
                    required
                    aria-describedby={`${ids.member}-hint`}
                  />
                  <p id={`${ids.member}-hint`} className="text-[11.5px] text-ink-faint mt-1.5">
                    Ticimax panelinden alınan servis üye kodu. Şifreli (AES-GCM) saklanır, bir daha gösterilmez.
                  </p>
                </div>
              </>
            )}
            {error && <InlineAlert>{error}</InlineAlert>}
            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('platform');
                }}
                disabled={busy}
                className="btn-secondary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Geri
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="btn-secondary !py-2 !px-4 text-[13px] disabled:opacity-50"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={!hydrated || busy}
                  className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
                  aria-busy={busy}
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : null} Devam
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Adım 3: yetki ── */}
        {step === 'auth' && provider === 'SHOPIFY' && (
          <div className="mt-6 space-y-4">
            <p className="text-[13.5px] text-ink-muted leading-relaxed">
              <b className="text-ink">{domain}</b> için Shopify yönetim paneline yönlendirileceksiniz. Yalnızca{' '}
              <span className="font-mono">read_products</span> (salt-okunur ürün) izni isteriz; sipariş, müşteri ve
              ödeme verisine erişim talep edilmez. Onaydan sonra buraya geri dönersiniz ve ilk senkron kuyruğa alınır.
            </p>
            <InlineAlert tone="info">
              Uygulamamız Shopify App Store&apos;da listelenmez; kendi Partner hesabınızda tanımlı özel (custom)
              uygulama üzerinden kurulur. Kurulum adımları:{' '}
              <a href="/solutions/shopify#kurulum" className="underline">
                Shopify kurulum rehberi
              </a>
              .
            </InlineAlert>
            {error && <InlineAlert>{error}</InlineAlert>}
            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={redirecting}
                className="btn-secondary !py-2 !px-4 text-[13px] disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={goToShopify}
                disabled={!next || redirecting || !hydrated}
                className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
                aria-busy={redirecting}
              >
                {redirecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                ) : (
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden />
                )}{' '}
                Shopify&apos;da yetkilendir
              </button>
            </div>
          </div>
        )}

        {step === 'auth' && provider === 'IKAS' && (
          <form onSubmit={submitCredentials} className="mt-6 space-y-4">
            <p className="text-[13px] text-ink-muted leading-relaxed">
              ikas yönetim panelinizde bir özel uygulama (API erişimi) oluşturun ve Client ID / Client Secret
              değerlerini girin. Salt-okunur ürün erişimi yeterlidir. Kimlik bilgileri şifreli saklanır ve bir daha
              gösterilmez.
            </p>
            <div>
              <label htmlFor={ids.clientId} className="text-[13px] font-medium">
                Client ID
              </label>
              <input
                id={ids.clientId}
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input mt-1.5 font-mono"
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor={ids.secret} className="text-[13px] font-medium">
                Client Secret
              </label>
              <input
                id={ids.secret}
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="input mt-1.5 font-mono"
                autoComplete="new-password"
                required
              />
            </div>
            {error && <InlineAlert>{error}</InlineAlert>}
            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="btn-secondary !py-2 !px-4 text-[13px] disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={!hydrated || busy}
                className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
                aria-busy={busy}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : null} Doğrula ve bağla
              </button>
            </div>
          </form>
        )}

        {step === 'auth' && provider === 'TICIMAX' && (
          <form onSubmit={submitCredentials} className="mt-6 space-y-4">
            <dl className="text-[13px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-ink-faint">Mağaza</dt>
              <dd className="font-mono break-all">{domain}</dd>
              <dt className="text-ink-faint">Servis</dt>
              <dd className="font-mono break-all">{serviceBase}</dd>
              <dt className="text-ink-faint">Üye kodu</dt>
              <dd className="font-mono">••••••</dd>
            </dl>
            <p className="text-[13px] text-ink-muted leading-relaxed">
              Servise bağlanıp üye kodunu doğrularız; başarılıysa bağlantı etkinleşir ve ilk katalog senkronu kuyruğa
              alınır. Ticimax webhook sağlamadığı için katalog günde bir kez yenilenir (istediğinizde &quot;Şimdi
              senkronla&quot;).
            </p>
            {error && <InlineAlert>{error}</InlineAlert>}
            <div className="flex justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStep('store');
                }}
                disabled={busy}
                className="btn-secondary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden /> Geri
              </button>
              <button
                type="submit"
                disabled={!hydrated || busy}
                className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-1.5 disabled:opacity-50"
                aria-busy={busy}
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : null} Doğrula ve bağla
              </button>
            </div>
          </form>
        )}

        {/* ── Adım 4: sonuç ── */}
        {step === 'done' && (
          <div className="mt-6 space-y-4" role="status">
            <InlineAlert tone="success">
              <b>{domain}</b> doğrulandı ve bağlandı. İlk katalog senkronu kuyruğa alındı; ilerlemeyi bağlantı kartında
              görebilirsiniz.
            </InlineAlert>
            <ScopeExplainer />
            <div className="flex justify-end pt-2">
              <button type="button" onClick={onClose} className="btn-primary !py-2 !px-4 text-[13px]">
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}

/** "Ne çekiyoruz / ne çekmiyoruz" — dürüst kapsam bildirimi (v1 salt-okunur katalog). */
export function ScopeExplainer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${compact ? 'text-[12px]' : 'text-[12.5px]'}`}>
      <div className="rounded-xl border border-positive/30 bg-positive/5 p-3">
        <div className="font-medium text-positive">Ne çekiyoruz</div>
        <ul className="mt-1.5 space-y-1 text-ink-muted list-disc pl-4">
          <li>Ürün adı, açıklama, fiyat aralığı, stok durumu</li>
          <li>Ürün görseli ve alt metni, kategori/koleksiyon, tür</li>
          <li>SEO başlığı/açıklaması, SKU/barkod gibi tanımlayıcılar</li>
          <li>Mağaza adı, para birimi, alan adı</li>
        </ul>
      </div>
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-3">
        <div className="font-medium text-danger">Ne çekmiyoruz</div>
        <ul className="mt-1.5 space-y-1 text-ink-muted list-disc pl-4">
          <li>Sipariş ve sepet verisi</li>
          <li>Müşteri bilgileri, adresler, iletişim</li>
          <li>Ödeme ve fatura bilgileri</li>
          <li>Mağazanıza yazma — erişim salt-okunurdur</li>
        </ul>
      </div>
    </div>
  );
}
