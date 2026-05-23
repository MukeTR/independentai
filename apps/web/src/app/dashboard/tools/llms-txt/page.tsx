import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { LlmsTxtGenerator } from '@/components/marketing/llms-txt-generator';

export default function LlmsTxtPage() {
  return (
    <ToolPageShell
      eyebrow="Üretici"
      title="llms.txt Generator"
      description="AI crawler'larına markanızı doğrudan anlatan markdown dosyasını üretin. Formu doldur, çıktıyı sitenizin köküne yükle."
    >
      <LlmsTxtGenerator />
    </ToolPageShell>
  );
}
