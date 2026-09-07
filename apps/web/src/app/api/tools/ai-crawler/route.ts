import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { runCrawlerAudit } from '@/server/commerce/crawler-audit';

export const maxDuration = 60;

/** AI Crawler Testi — POST {url}. */
export const POST = route('tools.ai_crawler', async (req) => handlePublicScan(req, 'CRAWLER', runCrawlerAudit));
