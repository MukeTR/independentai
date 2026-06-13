import { ShieldAlert } from 'lucide-react';
import { HallucinationTool } from '@/components/dashboard/hallucination-tool';

export const metadata = { title: 'Halüsinasyon Tespiti' };

export default function HallucinationPage() {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <ShieldAlert className="w-5 h-5 text-brand" />
        <div className="eyebrow">Doğruluk</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">Halüsinasyon Tespiti</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        AI motorları markanız hakkında yanlış bilgi veriyor olabilir — uydurma özellikler, yanlış fiyat, hatalı kuruluş bilgisi.
        Doğrulanmış gerçeklerinizi girin, son cevapları tarayıp çelişkileri yakalayalım.
      </p>

      <HallucinationTool />
    </div>
  );
}
