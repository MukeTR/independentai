import { KeyRound } from 'lucide-react';
import { KeywordFinder } from '@/components/dashboard/keyword-finder';

export const metadata = { title: 'Anahtar Kelime / Prompt Bulucu' };

export default function KeywordFinderPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <KeyRound className="w-5 h-5 text-brand" />
        <div className="eyebrow">Keşif</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">Anahtar Kelime / Prompt Bulucu</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Konunuzu girin; müşterilerinizin ChatGPT, Claude ve Gemini'ye soracağı yüksek niyetli soruları çıkaralım.
        Beğendiklerinizi tek tıkla takip listenize ekleyin — her gece otomatik izlensin.
      </p>

      <KeywordFinder />
    </div>
  );
}
