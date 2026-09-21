import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { runProductPageAudit } from '@/server/commerce/product-page-audit';

export const maxDuration = 60;

/** Ürün Sayfası Testi — POST {url}. */
export const POST = route('tools.product_page', async (req) =>
  handlePublicScan(req, 'PRODUCT_PAGE', runProductPageAudit),
);
