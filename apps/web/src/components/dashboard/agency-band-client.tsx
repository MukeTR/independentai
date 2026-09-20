'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Briefcase, X } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';

export const AGENCY_BAND_DISMISS_KEY = 'iai_agency_band_dismissed_until';
const DISMISS_MS = 7 * 86_400_000;

function readDismissedUntil(): number {
  try {
    const v = window.localStorage.getItem(AGENCY_BAND_DISMISS_KEY);
    const n = v ? Number(v) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/**
 * "Ajans mısınız?" bandı — role=status; "Ben ajansım" (beyan + isteğe bağlı e-posta izni) · "Ortaklığı incele"
 * (/solutions/agencies#ortaklik) · kapat (7 gün, localStorage try/catch). Hidrasyon öncesi render edilmez (flaş yok).
 */
export function AgencyBandClient({ score }: { score: number }) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const consentId = useId();

  useEffect(() => {
    setVisible(readDismissedUntil() < Date.now());
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(AGENCY_BAND_DISMISS_KEY, String(Date.now() + DISMISS_MS));
    } catch {
      /* özel mod / kapalı depolama — yalnız bu oturumda gizlenir */
    }
    setVisible(false);
  }

  async function declare() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/agency-signal/declare', { method: 'POST', json: { contactConsent: consent } });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Beyan kaydedilemedi'));
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Ajans ortaklık programı"
      className="bg-brand-glow border-b border-brand/20 text-[13px] text-ink px-4 sm:px-6 py-2.5"
    >
      <div className="mx-auto max-w-[1280px] flex flex-wrap items-center gap-x-4 gap-y-2">
        <Briefcase className="w-4 h-4 text-brand shrink-0" aria-hidden />
        {done ? (
          <span className="flex-1 min-w-[200px]">
            Teşekkürler — beyanınız alındı. Yanıt Agency ortaklık ekibi{' '}
            {consent ? 'e-posta ile size ulaşacak' : 'panel içinden bilgilendirecek'}.
          </span>
        ) : (
          <span className="flex-1 min-w-[200px]">
            Ajans mısınız? Kullanım örüntünüz birden çok müşteri sitesine benziyor (sinyal {score}/100).{' '}
            <b>Yanıt Agency ortaklık programı</b> ajanslara portföy paneli ve gelir paylaşımı sunar.
          </span>
        )}
        {!done && (
          <span className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={`${consentId}-panel`}
              className="btn-primary !py-1.5 !px-3 text-[12px]"
            >
              Ben ajansım
            </button>
            <Link href="/solutions/agencies#ortaklik" className="btn-secondary !py-1.5 !px-3 text-[12px]">
              Ortaklığı incele
            </Link>
          </span>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Bandı 7 gün kapat"
          className="ml-auto p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-paper-3"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>
        {open && !done && (
          <div id={`${consentId}-panel`} className="basis-full flex flex-wrap items-center gap-3 pt-1">
            <label htmlFor={consentId} className="flex items-center gap-2 text-[12.5px] text-ink-muted">
              <input
                id={consentId}
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-4 h-4"
              />
              Ortaklık için e-posta adresimle iletişime geçilebilir (isteğe bağlı).
            </label>
            <button
              type="button"
              onClick={declare}
              disabled={busy}
              aria-busy={busy}
              className="btn-primary !py-1.5 !px-3 text-[12px] disabled:opacity-50"
            >
              {busy ? 'Gönderiliyor…' : 'Beyanı gönder'}
            </button>
            {error && <InlineAlert className="basis-full">{error}</InlineAlert>}
          </div>
        )}
      </div>
    </div>
  );
}
