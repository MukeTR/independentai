'use client';

/**
 * Yanıt Agency teklif formu — ajans landing'ine gömülür.
 *
 * Fiyat sayfada YAZMAZ: kapsam görüşmeden sonra netleşir. Bu form o görüşmeyi başlatır ve
 * `POST /api/contact` üzerinden konu="ajans" ile aynı lead havuzuna düşer (admin → Lead'ler).
 * İletişim formunun kısa hâli: yalnız teklif için gereken alanlar sorulur.
 *
 * KVKK onayı zorunlu ve ayrı kutudur; İYS ticari ileti izni ayrı ve isteğe bağlıdır.
 * `website_confirm` honeypot alanıdır, gerçek kullanıcı görmez.
 */
import { useId, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { InlineAlert } from '@/components/ui/inline-alert';
import { apiFetch, ApiError, errorMessage } from '@/lib/api-client';
import { BLOCKED_REJECTED_MESSAGE, handleBlockedResponse } from '@/lib/blocked-redirect';
import { useHydrated } from '@/lib/use-hydrated';

/** Teklifi şekillendiren tek soru: bugün en çok neyi çözmek istiyorsunuz? */
const NEEDS = [
  { value: 'gorunmuyoruz', label: 'Sorularda hiç görünmüyoruz' },
  { value: 'rakip-onde', label: 'Rakibimiz bizden önde çıkıyor' },
  { value: 'yanlis-bilgi', label: 'Hakkımızda yanlış/eksik bilgi veriliyor' },
  { value: 'ekip-yok', label: 'Listeyi uygulayacak ekibimiz yok' },
  { value: 'yeni-site', label: 'Siteyi yeniliyoruz, baştan doğru kuralım' },
] as const;

const DEFAULT_NEED = NEEDS[0].value;

export function AgencyBriefForm({ id = 'teklif' }: { id?: string }) {
  const hydrated = useHydrated();
  const uid = useId();
  const f = (name: string) => `${uid}-${name}`;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [need, setNeed] = useState<string>(DEFAULT_NEED);
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
      const needLabel = NEEDS.find((n) => n.value === need)?.label ?? need;
      const res = await apiFetch<{ ok?: boolean; blocked?: boolean; redirectUrl?: string }>('/api/contact', {
        method: 'POST',
        json: {
          name,
          email,
          phone,
          company,
          website,
          topic: 'ajans',
          message: `Öncelik: ${needLabel}\n\n${message}`.trim(),
          kvkk,
          iys,
          src: 'yanit-agency',
          website_confirm: trap,
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
          : errorMessage(err, 'Form gönderilemedi; lütfen tekrar deneyin.');
      setState({ status: 'error', message: msg });
    }
  }

  if (state.status === 'done') {
    return (
      <div id={id} className="card p-7 sm:p-9 scroll-mt-24" role="status" aria-live="polite">
        <div className="eyebrow">Aldık</div>
        <h2 className="font-display text-[26px] tracking-tight mt-2">Kapsam görüşmesi için sıraya aldık.</h2>
        <p className="text-[14.5px] text-ink-muted mt-3 leading-relaxed max-w-xl">
          Görüşmeden önce sitenizi kendi araçlarımızla okuyup gelirsiniz; ilk konuşmada elimizde somut bulgular olur.
          Teklif, o görüşmede netleşen kapsama göre yazılır.
        </p>
        <p className="text-[12.5px] text-ink-faint mt-5">
          Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.
        </p>
      </div>
    );
  }

  return (
    <form
      id={id}
      onSubmit={submit}
      className="card p-6 sm:p-8 space-y-5 scroll-mt-24"
      aria-busy={busy}
      aria-labelledby={f('baslik')}
      noValidate
    >
      <div>
        <div className="eyebrow">Teklif alın</div>
        <h2 id={f('baslik')} className="font-display text-[24px] lg:text-[28px] tracking-tight mt-2 leading-snug">
          Kapsamı birlikte çıkaralım, fiyatı sonra konuşalım.
        </h2>
        <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
          Sabit bir paket satmıyoruz. Sitenizin durumu, rakip yoğunluğu ve kaç sayfaya dokunacağımız teklifi belirler.
          Aşağıyı doldurun, önce sizi okuyup gelelim.
        </p>
      </div>

      {/* Honeypot: ekran okuyucudan ve gözden gizli */}
      <div aria-hidden className="hidden">
        <label htmlFor={f('website_confirm')}>Bu alanı boş bırakın</label>
        <input
          id={f('website_confirm')}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={f('name')} className="eyebrow block mb-1.5">
            Ad soyad
          </label>
          <input
            id={f('name')}
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label htmlFor={f('company')} className="eyebrow block mb-1.5">
            Şirket
          </label>
          <input
            id={f('company')}
            className="input w-full"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            autoComplete="organization"
          />
        </div>
        <div>
          <label htmlFor={f('email')} className="eyebrow block mb-1.5">
            E-posta
          </label>
          <input
            id={f('email')}
            type="email"
            className="input w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor={f('phone')} className="eyebrow block mb-1.5">
            Telefon <span className="text-ink-faint normal-case">(isteğe bağlı)</span>
          </label>
          <input
            id={f('phone')}
            type="tel"
            className="input w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      <div>
        <label htmlFor={f('website')} className="eyebrow block mb-1.5">
          Web siteniz
        </label>
        <input
          id={f('website')}
          className="input w-full"
          placeholder="sirketiniz.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          autoComplete="url"
          required
        />
        <p className="text-[12px] text-ink-faint mt-1.5">
          Görüşmeden önce bu adresi okuyup geliyoruz; ilk konuşma boş sayfadan başlamıyor.
        </p>
      </div>

      <div>
        <label htmlFor={f('need')} className="eyebrow block mb-1.5">
          Bugün en çok neyi çözmek istiyorsunuz?
        </label>
        <select id={f('need')} className="input w-full" value={need} onChange={(e) => setNeed(e.target.value)}>
          {NEEDS.map((n) => (
            <option key={n.value} value={n.value}>
              {n.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={f('message')} className="eyebrow block mb-1.5">
          Eklemek istedikleriniz <span className="text-ink-faint normal-case">(isteğe bağlı)</span>
        </label>
        <textarea
          id={f('message')}
          className="input w-full min-h-[96px]"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hangi sorularda görünmek istiyorsunuz, kimleri rakip görüyorsunuz, sitenizde yakında değişecek bir şey var mı?"
        />
      </div>

      <div className="space-y-2.5 pt-1">
        <label className="flex items-start gap-2.5 text-[13.5px] leading-relaxed">
          <input
            type="checkbox"
            className="mt-1 shrink-0"
            checked={kvkk}
            onChange={(e) => setKvkk(e.target.checked)}
            required
          />
          <span>
            <Link href="/legal/kvkk" className="text-brand-deep hover:text-brand underline">
              KVKK aydınlatma metnini
            </Link>{' '}
            okudum; verilerimin teklif süreci için işlenmesini kabul ediyorum.
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-ink-muted">
          <input type="checkbox" className="mt-1 shrink-0" checked={iys} onChange={(e) => setIys(e.target.checked)} />
          <span>Yanıt’tan ticari elektronik ileti almak istiyorum. (İsteğe bağlı, istediğiniz an çıkabilirsiniz.)</span>
        </label>
      </div>

      {state.status === 'error' && state.message && <InlineAlert tone="error">{state.message}</InlineAlert>}

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <button type="submit" className="btn-primary inline-flex items-center gap-2" disabled={!hydrated || busy}>
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> Gönderiliyor
            </>
          ) : (
            <>
              Kapsam görüşmesi isteyin <ArrowRight className="w-4 h-4" aria-hidden />
            </>
          )}
        </button>
        <span className="text-[12.5px] text-ink-faint">Sonuç sözü vermiyoruz; ne ölçtüğümüzü ve ne yaptığımızı yazıyoruz.</span>
      </div>
    </form>
  );
}
