'use client';

/**
 * İletişim formu — `POST /api/contact`. Ön-doldurma `?src=&site=&sektor=&token=&konu=`.
 * KVKK aydınlatma onayı zorunlu ve AYRI kutu; İYS ticari ileti izni AYRI ve opsiyonel (ikisi de işaretsiz başlar).
 * Honeypot `website_confirm` gerçek kullanıcıya görünmez. Teşekkür metninde süre taahhüdü YOK.
 */
import { useEffect, useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { InlineAlert } from '@/components/ui/inline-alert';
import { apiFetch, ApiError, errorMessage } from '@/lib/api-client';
import { BLOCKED_REJECTED_MESSAGE, handleBlockedResponse } from '@/lib/blocked-redirect';
import { useHydrated } from '@/lib/use-hydrated';

const TOPICS: { value: string; label: string }[] = [
  { value: 'satis', label: 'Satış görüşmesi' },
  { value: 'ajans', label: 'Yanıt Agency (uygulama hizmeti)' },
  { value: 'ortaklik', label: 'Ajans ortaklığı' },
  { value: 'destek', label: 'Destek ve sorular' },
  { value: 'basin', label: 'Basın ve medya' },
];

const KVKK_SENTENCE =
  'Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.';

export function ContactForm() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const src = params.get('src') ?? '';
  const token = params.get('token') ?? '';
  const sektor = params.get('sektor') ?? '';
  const konu = params.get('konu') ?? '';
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const siteParam = params.get('site') ?? '';
  const [website, setWebsite] = useState(siteParam);
  const [topic, setTopic] = useState(() => (TOPICS.some((t) => t.value === konu) ? konu : 'satis'));
  // Aynı sayfadaki kanal kartları `/contact?konu=<x>#form` ile soft-navigation yapar; form zaten mount'lu
  // olduğundan arama parametreleri değişince Konu ve Web sitesi alanlarını yeniden eşitle.
  useEffect(() => {
    if (TOPICS.some((t) => t.value === konu)) setTopic(konu);
  }, [konu]);
  useEffect(() => {
    if (siteParam) setWebsite(siteParam);
  }, [siteParam]);
  const [message, setMessage] = useState('');
  const [kvkk, setKvkk] = useState(false);
  const [iys, setIys] = useState(false);
  const [trap, setTrap] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'busy' | 'done' | 'error'; message?: string }>({
    status: 'idle',
  });

  const busy = state.status === 'busy';

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!kvkk) {
      setState({ status: 'error', message: 'Devam etmek için KVKK aydınlatma metnini okuduğunuzu onaylayın.' });
      return;
    }
    setState({ status: 'busy' });
    try {
      const res = await apiFetch<{ ok?: boolean; blocked?: boolean; redirectUrl?: string }>('/api/contact', {
        method: 'POST',
        json: {
          name,
          email,
          phone,
          company,
          website,
          topic,
          message,
          kvkk,
          iys,
          src,
          token,
          sektor,
          website_confirm: trap,
          utm_source: params.get('utm_source') ?? '',
          utm_medium: params.get('utm_medium') ?? '',
          utm_campaign: params.get('utm_campaign') ?? '',
        },
      });
      const outcome = handleBlockedResponse(res);
      if (outcome === 'redirected') return; // tarayıcı yönlendirildi
      if (outcome === 'rejected') {
        setState({ status: 'error', message: BLOCKED_REJECTED_MESSAGE });
        return;
      }
      setState({ status: 'done' });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 429
          ? 'Kısa sürede çok fazla mesaj gönderildi. Biraz sonra tekrar deneyin.'
          : errorMessage(err, 'Mesaj gönderilemedi; lütfen tekrar deneyin.');
      setState({ status: 'error', message: msg });
    }
  }

  if (state.status === 'done') {
    return (
      <div className="card p-7 sm:p-8" role="status" aria-live="polite">
        <div className="eyebrow">Teşekkürler</div>
        <h2 className="font-display text-[26px] tracking-tight mt-2">Mesajınız ulaştı.</h2>
        <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed">
          Ekibimiz sizinle iletişime geçecek. Herkese açık sitenizi taradıysak kişisel verinizi yapay zekâ servislerine
          göndermedik.
        </p>
        {token && (
          <p className="text-[13.5px] mt-4">
            Raporunuz:{' '}
            <Link href={`/rapor/${encodeURIComponent(token)}`} className="text-brand-deep hover:text-brand underline">
              kalıcı rapor bağlantısı
            </Link>
          </p>
        )}
        <p className="text-[12px] text-ink-faint mt-5">{KVKK_SENTENCE}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card relative p-5 sm:p-7 space-y-5" aria-busy={busy} noValidate>
      {token && (
        <p className="text-[12.5px] text-ink-muted bg-paper-2 rounded-lg px-3 py-2">
          Bu mesaj{' '}
          <Link href={`/rapor/${encodeURIComponent(token)}`} className="underline text-brand-deep hover:text-brand">
            raporunuzla
          </Link>{' '}
          birlikte iletilecek; ekibimiz aynı bulgulara bakar.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field id={f('name')} label="Ad soyad" required>
          <input
            id={f('name')}
            name="name"
            className="input w-full"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field id={f('email')} label="E-posta" required>
          <input
            id={f('email')}
            name="email"
            type="email"
            className="input w-full"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field id={f('phone')} label="Telefon" hint="İsteğe bağlı · örn. 0532 000 00 00">
          <input
            id={f('phone')}
            name="phone"
            type="tel"
            className="input w-full"
            autoComplete="tel"
            inputMode="tel"
            maxLength={24}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-describedby={`${f('phone')}-hint`}
          />
        </Field>
        <Field id={f('company')} label="Şirket" hint="İsteğe bağlı">
          <input
            id={f('company')}
            name="company"
            className="input w-full"
            autoComplete="organization"
            maxLength={120}
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            aria-describedby={`${f('company')}-hint`}
          />
        </Field>
        <Field id={f('website')} label="Web sitesi" hint="İsteğe bağlı · yalnızca herkese açık site adresi">
          <input
            id={f('website')}
            name="website"
            type="text"
            inputMode="url"
            className="input w-full"
            autoComplete="url"
            placeholder="firma.com"
            maxLength={300}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-describedby={`${f('website')}-hint`}
          />
        </Field>
        <Field id={f('topic')} label="Konu">
          <select
            id={f('topic')}
            name="topic"
            className="input w-full"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id={f('message')} label="Mesajınız" required hint={`${message.length}/2000`}>
        <textarea
          id={f('message')}
          name="message"
          className="input w-full min-h-[140px]"
          required
          maxLength={2000}
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-describedby={`${f('message')}-hint`}
        />
      </Field>

      {/* Honeypot — kullanıcı görmez, bot doldurur */}
      <div className="absolute -left-[9999px] w-px h-px overflow-hidden" aria-hidden="true">
        <label htmlFor={f('trap')}>Web sitesi (boş bırakın)</label>
        <input
          id={f('trap')}
          name="website_confirm"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Onaylar</legend>
        <label htmlFor={f('kvkk')} className="flex items-start gap-3 text-[13.5px] leading-snug cursor-pointer">
          <input
            id={f('kvkk')}
            name="kvkk"
            type="checkbox"
            required
            checked={kvkk}
            onChange={(e) => setKvkk(e.target.checked)}
            className="mt-0.5 w-5 h-5 shrink-0"
          />
          <span>
            <Link href="/legal/kvkk" className="underline text-brand-deep hover:text-brand" target="_blank">
              KVKK aydınlatma metnini
            </Link>{' '}
            okudum; mesajımın ve iletişim bilgilerimin bu talebi yanıtlamak için işlenmesini onaylıyorum.{' '}
            <span className="text-ink-faint">(zorunlu)</span>
          </span>
        </label>
        <label htmlFor={f('iys')} className="flex items-start gap-3 text-[13.5px] leading-snug cursor-pointer">
          <input
            id={f('iys')}
            name="iys"
            type="checkbox"
            checked={iys}
            onChange={(e) => setIys(e.target.checked)}
            className="mt-0.5 w-5 h-5 shrink-0"
          />
          <span>
            Yanıt’tan ürün ve kampanya bilgilendirmesi (ticari elektronik ileti) almak istiyorum.{' '}
            <span className="text-ink-faint">(isteğe bağlı · dilediğiniz zaman vazgeçebilirsiniz)</span>
          </span>
        </label>
      </fieldset>

      {state.status === 'error' && <InlineAlert tone="error">{state.message}</InlineAlert>}

      <div className="flex items-center gap-4 flex-wrap">
        <button
          type="submit"
          disabled={!hydrated || busy}
          className="btn-primary inline-flex items-center gap-2 min-h-[44px] disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Send className="w-4 h-4" aria-hidden />}
          {busy ? 'Gönderiliyor…' : 'Mesajı gönder'}
        </button>
        <p className="text-[12px] text-ink-faint">{KVKK_SENTENCE}</p>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] text-ink-muted">
        {label}
        {required && (
          <span className="text-danger" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p id={`${id}-hint`} className="text-[11.5px] text-ink-faint mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}
