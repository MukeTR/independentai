import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { GeoAuditChecklist } from '@/components/marketing/geo-audit-checklist';

export default function AuditPage() {
  return (
    <ToolPageShell
      eyebrow="Denetim"
      title="GEO Audit Checklist"
      description="10 adımlık marka GEO denetimi. Her adımı tamamladıkça not ekle, sonunda markdown rapor olarak indir."
    >
      <GeoAuditChecklist />
    </ToolPageShell>
  );
}
