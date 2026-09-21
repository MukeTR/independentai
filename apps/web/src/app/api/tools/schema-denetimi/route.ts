import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { schemaAuditTool } from '@/server/site-scan/schema-audit';

export const maxDuration = 60;

/** Schema denetimi — POST {url, sector?}. Sektör yalnız şablon alt tipini seçer. */
export const POST = route('tools.schema_audit', (req) =>
  handlePublicScan(req, schemaAuditTool.kind, schemaAuditTool.run, {
    input: (b) => ({ sector: typeof b.sector === 'string' ? b.sector : undefined }),
  }),
);
