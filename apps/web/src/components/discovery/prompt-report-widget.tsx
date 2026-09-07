'use client';

/**
 * Ziyaretçi mini formu — GÖNÜLLÜ prompt bildirimi.
 *
 * Neden var: AI ürünleri kullanıcının sorduğu soruyu hedef siteye göndermez. Tek dürüst yol
 * ziyaretçiye sormaktır. Form bu yüzden küçük, kapatılabilir ve ısrarcı değildir:
 *   • Oturum başına bir kez gösterilir (gönderildi ya da kapatıldıysa bir daha çıkmaz).
 *   • Hiçbir alan zorunlu değildir; ziyaretçi yalnızca AI ürününü seçip gönderebilir.
 *   • Serbest metin 300 karakterle sınırlıdır ve sunucuda PII'dan temizlenir.
 *
 * Bileşen müşteri sitesine gömülmez; Independent AI'ın kendi sayfalarında ve ileride SDK
 * tarafından çağrılacak biçimde kullanılır. Uç: `POST /api/collect/v1/report`.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { MessageSquareQuote, ShieldCheck, X } from 'lucide-react';
import type { IntentKey } from '@/server/discovery/attribution';
import { useHydrated } from '@/lib/use-hydrated';

/** Sunucudaki `INTENTS` ile aynı küme (tip zorlaması sapmayı derlemede yakalar). */
const INTENT_CHOICES: { value: IntentKey; label: string }[] = [
  { value: 'recommendation', label: 'Öneri istedim' },
  { value: 'comparison', label: 'Karşılaştırdım' },
  { value: 'pricing', label: 'Fiyat sordum' },
  { value: 'alternative', label: 'Alternatif aradım' },
  { value: 'how_to', label: 'Nasıl yapılır' },
  { value: 'local', label: 'Yakınımda arattım' },
  { value: 'other', label: 'Diğer' },
];

/** `ai-sources.ts` içindeki sağlayıcı anahtarlarıyla aynı değerler. */
const PROVIDER_CHOICES: { value: string; label: string }[] = [
  { value: 'openai', label: 'ChatGPT' },
  { value: 'anthropic', label: 'Claude' },
  { value: 'google', label: 'Gemini' },
  { value: 'perplexity', label: 'Perplexity' },
  { value: 'microsoft', label: 'Copilot' },
  { value: 'xai', label: 'Grok' },
  { value: 'other', label: 'Başka bir AI' },
];

export const REPORT_TEXT_MAX = 300;
const STORAGE_KEY = 'iai.report.v1';
const SID_KEY = 'iai.report.sid';

type Stored = { status: 'sent' | 'dismissed'; at: number };

function readState(): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeState(status: Stored['status']) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ status, at: Date.now() } satisfies Stored));
  } catch {
    /* gizli sekme / depolama kapalı: form yine çalışır, yalnızca hatırlanmaz */
  }
}

/** SDK bir oturum anahtarı sağlıyorsa onu kullan; yoksa çerezsiz, kısa ömürlü bir tane üret. */
function resolveSessionKey(explicit?: string | null): string {
  if (explicit && explicit.length >= 8) return explicit;
  const sdk = (globalThis as { independentAI?: { sessionId?: () => string } }).independentAI?.sessionId?.();
  if (typeof sdk === 'string' && sdk.length >= 8) return sdk;
  try {
    const existing = sessionStorage.getItem(SID_KEY);
    if (existing && existing.length >= 8) return existing;
  } catch {
    /* yok sayılır */
  }
  const generated = `r${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`.slice(0, 32);
  try {
    sessionStorage.setItem(SID_KEY, generated);
  } catch {
    /* yok sayılır */
  }
  return generated;
}

export function PromptReportWidget({
  publicKey,
  sessionKey,
  endpoint = '/api/collect/v1/report',
  /** Sayfa açılır açılmaz çıkmasın: ziyaretçi önce içeriği görsün. */
  delayMs = 4000,
  onClose,
  className = '',
}: {
  publicKey: string;
  sessionKey?: string | null;
  endpoint?: string;
  delayMs?: number;
  onClose?: () => void;
  className?: string;
}) {
  const hydrated = useHydrated();
  const ids = { text: useId(), provider: useId(), intent: useId() };
  const [visible, setVisible] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [intent, setIntent] = useState<IntentKey | null>(null);
  const [text, setText] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'done' | 'error'>('form');

  useEffect(() => {
    // Bu oturumda gönderildiyse ya da kapatıldıysa bir daha gösterme (frekans sınırı).
    if (readState()) return;
    const t = setTimeout(() => setVisible(true), Math.max(0, delayMs));
    return () => clearTimeout(t);
  }, [delayMs]);

  const remaining = useMemo(() => REPORT_TEXT_MAX - text.length, [text]);

  function dismiss() {
    writeState('dismissed');
    setVisible(false);
    onClose?.();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    const body = JSON.stringify({
      k: publicKey,
      sid: resolveSessionKey(sessionKey),
      provider: provider && provider !== 'other' ? provider : undefined,
      intent: intent ?? undefined,
      text: text.trim() ? text.trim().slice(0, REPORT_TEXT_MAX) : undefined,
    });
    try {
      // `text/plain`: önden yoklama (preflight) tetiklemez; sunucu gövdeyi kendisi ayrıştırır.
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body,
        keepalive: true,
      });
      if (!res.ok) throw new Error(String(res.status));
      writeState('sent');
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (!visible) return null;

  return (
    <aside
      className={`card p-4 max-w-sm relative ${className}`}
      aria-label="AI sorusu bildirimi"
      data-testid="prompt-report-widget"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Kapat"
        className="absolute top-2.5 right-2.5 text-ink-faint hover:text-ink transition"
      >
        <X className="w-4 h-4" aria-hidden />
      </button>

      {state === 'done' ? (
        <div className="pr-6">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            <ShieldCheck className="w-4 h-4 text-positive" aria-hidden /> Teşekkürler
          </div>
          <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">
            Bildiriminiz kaydedildi. Bu bilgi yalnızca hangi soruların bu sayfaya getirdiğini anlamak için kullanılır.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="pr-6">
          <div className="flex items-center gap-2 text-[14px] font-medium">
            <MessageSquareQuote className="w-4 h-4 text-brand" aria-hidden /> Buraya bir AI önerisiyle mi geldiniz?
          </div>
          <p className="text-[12.5px] text-ink-muted mt-1.5 leading-relaxed">
            İsterseniz paylaşın — hepsi isteğe bağlı, tek tık da yeterli.
          </p>

          <fieldset className="mt-3">
            <legend className="text-[12px] text-ink-muted mb-1.5" id={ids.provider}>
              Hangi AI ürünü?
            </legend>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={ids.provider}>
              {PROVIDER_CHOICES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={provider === p.value}
                  onClick={() => setProvider(provider === p.value ? null : p.value)}
                  className={`text-[12px] px-2 py-1 rounded-full border transition ${
                    provider === p.value
                      ? 'bg-brand-glow text-brand-deep border-brand/30'
                      : 'border-hairline text-ink-muted hover:border-ink'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-3">
            <legend className="text-[12px] text-ink-muted mb-1.5" id={ids.intent}>
              Ne yapmaya çalışıyordunuz?
            </legend>
            <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={ids.intent}>
              {INTENT_CHOICES.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  aria-pressed={intent === i.value}
                  onClick={() => setIntent(intent === i.value ? null : i.value)}
                  className={`text-[12px] px-2 py-1 rounded-full border transition ${
                    intent === i.value
                      ? 'bg-brand-glow text-brand-deep border-brand/30'
                      : 'border-hairline text-ink-muted hover:border-ink'
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-3">
            <label htmlFor={ids.text} className="text-[12px] text-ink-muted">
              Hatırlıyorsanız: ne sormuştunuz? (isteğe bağlı)
            </label>
            <textarea
              id={ids.text}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, REPORT_TEXT_MAX))}
              maxLength={REPORT_TEXT_MAX}
              rows={2}
              className="input mt-1 w-full text-[13px]"
              placeholder="Örn. İstanbul'da en iyi …"
            />
            <div className="flex items-start gap-1.5 mt-1.5 text-[11px] text-ink-faint leading-relaxed">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />
              <span>
                Lütfen ad, e-posta, telefon gibi kişisel bilgi yazmayın. Yazılsa bile sunucuda otomatik temizlenir.
                Kalan: {remaining} karakter.
              </span>
            </div>
          </div>

          {state === 'error' && (
            <p role="alert" className="mt-2 text-[12px] text-danger">
              Gönderilemedi. İsterseniz tekrar deneyin ya da kapatın.
            </p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <button type="submit" disabled={!hydrated || state === 'sending'} className="btn-primary text-[12.5px]">
              {state === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
            </button>
            <button type="button" onClick={dismiss} className="text-[12.5px] text-ink-muted hover:text-ink">
              Şimdi değil
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
