import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { trustSignalsTool } from '@/server/site-scan/trust-signals';

export const maxDuration = 60;

/** Güven sinyalleri — POST {url, sector?}. Yalnız pass/warn üretir. */
export const POST = route('tools.trust_signals', (req) =>
  handlePublicScan(req, trustSignalsTool.kind, trustSignalsTool.run, {
    input: (b) => ({ sector: typeof b.sector === 'string' ? b.sector : undefined }),
  }),
);
