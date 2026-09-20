/**
 * Rapor CTA satırı (mikro-kopya sözleşmesi): "Bunları biz düzeltelim" · "Kendim düzelteceğim" · "Yeniden tara"
 * · WhatsApp/kopyala · "Skor nasıl hesaplanır?". Sunucu bileşeni; paylaşım düğmeleri istemci parçasıdır.
 * Altında KVKK cümlesi (her formun/raporun altında aynı metin).
 */
import Link from 'next/link';
import { ArrowRight, RefreshCw, Wrench } from 'lucide-react';
import { ShareReportButtons } from './share-report-buttons';

export const KVKK_SENTENCE =
  'Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz.';

/** `/contact?src=<slug>&site=<host>&token=<token>` — rapor/araç CTA'larının ortak hedefi. */
export function contactHref(input: {
  src: string;
  site?: string | null;
  token?: string | null;
  sektor?: string | null;
}) {
  const q = new URLSearchParams({ src: input.src });
  if (input.site) q.set('site', input.site);
  if (input.token) q.set('token', input.token);
  if (input.sektor) q.set('sektor', input.sektor);
  return `/contact?${q.toString()}#form`;
}

export function ReportCtaRow({
  contactHref: contact,
  selfHref,
  rescanHref,
  methodHref,
  share,
  kvkk = true,
}: {
  contactHref: string;
  /** "Kendim düzelteceğim" — rehber/öneri anchor'ı */
  selfHref: string;
  rescanHref: string;
  /** "Skor nasıl hesaplanır?" hedefi */
  methodHref: string;
  share?: { url: string; text?: string } | null;
  kvkk?: boolean;
}) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <Link href={contact} className="btn-primary inline-flex items-center justify-center gap-2 min-h-[44px]">
          <Wrench className="w-4 h-4" aria-hidden />
          Bunları biz düzeltelim
        </Link>
        <Link href={selfHref} className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px]">
          Kendim düzelteceğim
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
        <Link href={rescanHref} className="btn-secondary inline-flex items-center justify-center gap-2 min-h-[44px]">
          <RefreshCw className="w-4 h-4" aria-hidden />
          Yeniden tara
        </Link>
      </div>
      {share && (
        <div className="mt-4 pt-4 border-t border-hairline">
          <div className="eyebrow mb-2">Kalıcı rapor bağlantısı</div>
          <ShareReportButtons url={share.url} text={share.text} />
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap text-[12px]">
        <Link href={methodHref} className="text-brand-deep hover:text-brand underline-offset-2 hover:underline">
          Skor nasıl hesaplanır?
        </Link>
        {kvkk && <p className="text-ink-faint">{KVKK_SENTENCE}</p>}
      </div>
    </div>
  );
}
