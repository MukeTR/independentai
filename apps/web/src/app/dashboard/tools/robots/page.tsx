import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { RobotsTxtGenerator } from '@/components/marketing/robots-txt-generator';

export default function RobotsPage() {
  return (
    <ToolPageShell
      eyebrow="Üretici"
      title="robots.txt Generator"
      description="AI bot'larını ve arama motoru bot'larını yönetin. Sitemap referansı ekleyin. GEO için ideal varsayılan ayarlarla."
    >
      <RobotsTxtGenerator />
    </ToolPageShell>
  );
}
