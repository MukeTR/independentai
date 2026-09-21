import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { questionCoverageTool } from '@/server/site-scan/question-coverage';

export const maxDuration = 60;

/** Satın alma sorusu kapsama — POST {url, sector}. Sektör zorunlu (motor ClientError → 400). */
export const POST = route('tools.question_coverage', (req) =>
  handlePublicScan(req, questionCoverageTool.kind, questionCoverageTool.run, {
    input: (b) => ({ sector: typeof b.sector === 'string' ? b.sector : undefined }),
  }),
);
