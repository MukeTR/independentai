import { Gauge } from 'lucide-react';
import { GeoAuditScanner } from '@/components/dashboard/geo-audit-scanner';

export const metadata = { title: 'GEO Audit — AI Hazırlık Skoru' };

export default function GeoAuditToolPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <Gauge className="w-5 h-5 text-brand" />
        <div className="eyebrow">Denetim</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">GEO Audit — AI Hazırlık Skoru</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Bir URL girin; sayfanızı gerçek zamanlı tarayıp ChatGPT, Claude ve Gemini gibi modellerin sizi anlama ve
        alıntılama olasılığını 0-100 arası puanlayalım. Teknik, içerik, otorite, tazelik ve AI anlaşılabilirliği
        eksenlerinde somut iyileştirme önerileri çıkarır.
      </p>

      <GeoAuditScanner />
    </div>
  );
}
