import type { NextRequest } from 'next/server';
import { handleBrowserCollect, handleCollectPreflight } from '@/server/discovery/collect-handler';

export const dynamic = 'force-dynamic';
export const maxDuration = 20;

/**
 * POST /api/collect/v1/batch — sayfa kapanırken biriken olayların tek istekte gönderimi
 * (en fazla 20 olay). Aynı doğrulama zinciri ve limitler geçerlidir.
 */
export async function POST(req: NextRequest) {
  return handleBrowserCollect(req, 20);
}

export async function OPTIONS(req: NextRequest) {
  return handleCollectPreflight(req);
}
