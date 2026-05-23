import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { SchemaGenerator } from '@/components/marketing/schema-generator';

export default function SchemaPage() {
  return (
    <ToolPageShell
      eyebrow="Üretici"
      title="Schema Markup Generator"
      description="Organization JSON-LD üretin. HTML'inizin <head> kısmına yapıştırın. AI gözünde kanonik şirket bilgisi."
    >
      <SchemaGenerator />
    </ToolPageShell>
  );
}
