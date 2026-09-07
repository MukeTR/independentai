import { Suspense } from 'react';
import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { CommerceVisibilityTool } from '@/components/marketing/commerce-visibility-tool';
import { CatalogReadinessPanel, CommercePromptSuggestions } from '@/components/dashboard/commerce-readiness';

export const metadata = { title: 'E-ticaret AI Görünürlük Testi' };

export default function EcommerceVisibilityPage() {
  return (
    <ToolPageShell
      eyebrow="E-ticaret"
      title="E-ticaret AI Görünürlük Testi"
      description="Mağazanızı crawl-only tarayıp 6 eksende (katalog yapısı, ürün şeması, içerik, AI taranabilirliği, marka sinyalleri, teknik) puanlar. Bağlı kataloğunuz varsa tüm ürünlerin veri kalitesi ve ticari izleme sorusu önerileri de aşağıda."
    >
      <div className="space-y-8">
        <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
          <CommerceVisibilityTool variant="dashboard" />
        </Suspense>
        <CatalogReadinessPanel />
        <CommercePromptSuggestions />
      </div>
    </ToolPageShell>
  );
}
