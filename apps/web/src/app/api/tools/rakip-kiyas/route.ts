import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { compareTool } from '@/server/site-scan/compare';

export const maxDuration = 60;

/** Rakip kıyası — POST {url, competitorUrl}. Rakip de normalize + SSRF + blocklist + host tavanından geçer. */
export const POST = route('tools.compare', (req) =>
  handlePublicScan(req, compareTool.kind, compareTool.run, {
    input: (b) => ({ competitorUrl: typeof b.competitorUrl === 'string' ? b.competitorUrl : undefined }),
  }),
);
