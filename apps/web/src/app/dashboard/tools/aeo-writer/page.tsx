import { PenLine } from 'lucide-react';
import { AeoWriter } from '@/components/dashboard/aeo-writer';

export const metadata = { title: 'AEO İçerik Yazıcı' };

export default function AeoWriterPage() {
  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <PenLine className="w-5 h-5 text-brand" />
        <div className="eyebrow">Üretici</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">AEO İçerik Yazıcı</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        AI motorlarının alıntılamasına optimize, marka-sesli içerik üretin: Schema-hazır FAQ blokları, Soru-Cevap
        sayfaları, meta açıklamalar ve sosyal gönderiler. Denetim araçlarının bulduğu boşlukları doğrudan kapatın.
      </p>

      <AeoWriter />
    </div>
  );
}
