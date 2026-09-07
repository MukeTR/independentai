'use client';

import { useState } from 'react';
import { Copy, Check, Link2 } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';
import { Modal } from '@/components/ui/modal';

/**
 * "Mevcut hesabı bağla": tek kullanımlık onay linki üretir; marka hesabının sahibi linki açıp onaylar.
 * Ajans veriyi sahiplenmez, erişim alır; marka istediğinde bağlantıyı kesebilir.
 */
export function LinkRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const hydrated = useHydrated();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const r = await apiFetch<{ link: string }>('/api/agency/link', { method: 'POST', json: {} });
      setLink(r.link);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setLink(null);
    setError(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Mevcut bir Independent AI hesabını bağla"
      description="Müşteriniz zaten kendi hesabında ölçüm yapıyorsa, onay linkini hesap sahibine iletin. Onaylayınca müşteri portföyünüze eklenir; veri müşteride kalır, istediği an bağlantıyı kesebilir."
    >
      {error && <InlineAlert className="mb-3">{error}</InlineAlert>}
      {!link ? (
        <div className="flex justify-end gap-2">
          <button type="button" onClick={close} className="btn-secondary !py-2 !px-4 text-[13px]">
            Vazgeç
          </button>
          <button
            type="button"
            onClick={create}
            disabled={!hydrated || busy}
            className="btn-primary !py-2 !px-4 text-[13px] inline-flex items-center gap-2 disabled:opacity-50"
            aria-busy={busy}
          >
            <Link2 className="w-4 h-4" aria-hidden /> {busy ? 'Oluşturuluyor…' : 'Onay linki oluştur'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <InlineAlert tone="success">
            Link 7 gün geçerli ve tek kullanımlık. Yalnızca marka hesabının sahibi onaylayabilir.
          </InlineAlert>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11.5px] break-all bg-paper-1 border border-hairline rounded px-2 py-1.5">
              {link}
            </code>
            <button
              type="button"
              className="btn-secondary !py-1.5 !px-3 text-[12px] inline-flex items-center gap-1"
              onClick={() => {
                void navigator.clipboard?.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              aria-label="Onay linkini kopyala"
            >
              {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={close} className="btn-primary !py-2 !px-4 text-[13px]">
              Tamam
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
