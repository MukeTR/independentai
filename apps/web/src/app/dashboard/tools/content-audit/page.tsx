import { FileSearch } from 'lucide-react';
import { ContentAuditScanner } from '@/components/dashboard/content-audit-scanner';

export const metadata = { title: 'İçerik Denetleyicisi' };

export default function ContentAuditPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <FileSearch className="w-5 h-5 text-brand" />
        <div className="eyebrow">Denetim</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">İçerik Denetleyicisi</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Bir sayfa URL'i girin; içeriğinizi AI motorlarının daha çok alıntılaması için analiz edip önceliklendirilmiş
        aksiyon kartları çıkaralım — her biri zorluk ve tahmini etki etiketiyle.
      </p>

      <ContentAuditScanner />
    </div>
  );
}
