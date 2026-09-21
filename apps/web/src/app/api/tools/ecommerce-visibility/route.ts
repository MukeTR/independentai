import { route } from '@/server/route';
import { handlePublicScan } from '@/server/commerce/public-scan';
import { runCommerceAudit } from '@/server/commerce/commerce-audit';

export const maxDuration = 60;

/** E-ticaret AI Görünürlük Testi — POST {url}; e-posta duvarı yok, IP + küresel limit, 10 dk önbellek. */
export const POST = route('tools.ecommerce_visibility', async (req) =>
  handlePublicScan(req, 'COMMERCE', runCommerceAudit),
);
