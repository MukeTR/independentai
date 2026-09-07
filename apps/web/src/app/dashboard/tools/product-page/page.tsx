import { Suspense } from 'react';
import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { ProductPageTool } from '@/components/marketing/product-page-tool';

export const metadata = { title: 'Ürün Sayfası Testi' };

export default function ProductPageToolPage() {
  return (
    <ToolPageShell
      eyebrow="E-ticaret"
      title="Ürün Sayfası Testi"
      description="Tek bir ürün sayfasını Product JSON-LD, içerik özgünlüğü, görsel alt metni, yapı (breadcrumb/SSS/özellik tablosu), indekslenebilirlik ve AI cevap uyumu eksenlerinde puanlar; platforma özel düzeltme adımları verir."
    >
      <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
        <ProductPageTool variant="dashboard" />
      </Suspense>
    </ToolPageShell>
  );
}
