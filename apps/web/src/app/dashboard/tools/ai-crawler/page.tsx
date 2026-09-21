import { Suspense } from 'react';
import { ToolPageShell } from '@/components/dashboard/tool-page-shell';
import { CrawlerTool } from '@/components/marketing/crawler-tool';

export const metadata = { title: 'AI Crawler Testi' };

export default function AiCrawlerToolPage() {
  return (
    <ToolPageShell
      eyebrow="E-ticaret"
      title="AI Crawler Testi"
      description="robots.txt kurallarınızı 10 AI botu ve 2 arama botu için çözümler; noindex, canonical, sitemap, llms.txt, yönlendirme zinciri ve JS bağımlılığını kontrol eder. Seçtiğiniz botlar için robots.txt satırları üretir."
    >
      <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
        <CrawlerTool variant="dashboard" />
      </Suspense>
    </ToolPageShell>
  );
}
