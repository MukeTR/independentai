import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { ProductWriterTool } from '@/components/marketing/product-writer-tool';

export const metadata = { title: 'Ürün Açıklama Yazıcı' };

export default function ProductWriterToolPage() {
  return (
    <ToolPageShell
      eyebrow="E-ticaret"
      title="Ürün Açıklama Yazıcı"
      description="Yalnızca girdiğiniz özelliklerle AI destekli ürün açıklaması, 5 SSS, meta başlık/açıklama ve Product JSON-LD iskeleti üretir. Uydurma spesifikasyon yok; sağlayıcı yoksa dürüstçe 503."
    >
      <ProductWriterTool variant="dashboard" />
    </ToolPageShell>
  );
}
