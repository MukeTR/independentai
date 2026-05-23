import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { AiSeoChecklist } from '@/components/marketing/ai-seo-checklist';

export default function ChecklistPage() {
  return (
    <ToolPageShell
      eyebrow="Denetim"
      title="AI SEO Checklist"
      description="25 maddelik interaktif checklist. Her birini işaretle, kategori bazlı skor + indirilebilir rapor."
    >
      <AiSeoChecklist />
    </ToolPageShell>
  );
}
