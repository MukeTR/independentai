import { GitFork } from 'lucide-react';
import { CannibalizationScanner } from '@/components/dashboard/cannibalization-scanner';

export const metadata = { title: 'Kanibalizasyon Denetleyici' };

export default function CannibalizationPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <GitFork className="w-5 h-5 text-brand" />
        <div className="eyebrow">Denetim</div>
      </div>
      <h1 className="font-display text-[36px] tracking-tight">Kanibalizasyon Denetleyici</h1>
      <p className="text-[15px] text-ink-muted mt-3 max-w-2xl mb-8">
        Sitenizin birden fazla sayfası aynı konu için yarışıyor mu? Sayfalarınızı anlamsal olarak karşılaştırıp
        birbirine fazla benzeyen — ve AI alıntılarını birbirinden çalan — sayfa çiftlerini tespit ederiz.
      </p>

      <CannibalizationScanner />
    </div>
  );
}
