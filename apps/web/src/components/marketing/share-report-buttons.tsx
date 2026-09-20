'use client';

/**
 * Kalıcı rapor bağlantısını paylaşma: WhatsApp (wa.me) + panoya kopyala.
 * Metin yalnız hostname/araç/skor içerir; kişisel veri taşımaz. Pano erişimi yoksa bağlantı seçilebilir metin olarak kalır.
 */
import { useId, useState } from 'react';
import { Check, Link2, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export function whatsappHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function ShareReportButtons({
  url,
  text,
  showUrl = true,
  className,
}: {
  /** Paylaşılacak kalıcı rapor bağlantısı */
  url: string;
  /** WhatsApp metni (bağlantı dahil edilmemişse sona eklenir) */
  text?: string;
  showUrl?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const statusId = useId();
  const message = text ? (text.includes(url) ? text : `${text} ${url}`) : url;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* pano erişimi yok — bağlantı aşağıda görünür kalır */
    }
  }

  return (
    <div className={cn('flex items-center gap-2.5 flex-wrap', className)}>
      <a
        href={whatsappHref(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px] min-h-[44px]"
      >
        <MessageCircle className="w-3.5 h-3.5" aria-hidden />
        WhatsApp’ta paylaş
      </a>
      <button
        type="button"
        onClick={copy}
        aria-describedby={statusId}
        className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px] min-h-[44px]"
      >
        {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Link2 className="w-3.5 h-3.5" aria-hidden />}
        {copied ? 'Bağlantı kopyalandı' : 'Bağlantıyı kopyala'}
      </button>
      <span id={statusId} role="status" aria-live="polite" className="sr-only">
        {copied ? 'Rapor bağlantısı panoya kopyalandı' : ''}
      </span>
      {showUrl && <span className="text-[11.5px] text-ink-faint break-all basis-full sm:basis-auto">{url}</span>}
    </div>
  );
}
