import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { VisibilityCalculator } from '@/components/marketing/visibility-calculator';

export default function VisibilityPage() {
  return (
    <ToolPageShell
      eyebrow="Hesaplayıcı"
      title="Visibility Score Hesaplayıcı"
      description="Prompt sayınızı, model sayınızı ve mention verilerinizi gir. Anlık Visibility Score + Share of Voice çıktısı."
    >
      <VisibilityCalculator />
    </ToolPageShell>
  );
}
