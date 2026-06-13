import { NextResponse } from 'next/server';
import { requireSession, handleRouteError } from '@/server/session';
import { hydrateEnvFromConfig } from '@/server/system-config';
import { scanHallucinations } from '@/server/hallucination';

export const maxDuration = 60;

export async function POST() {
  try {
    const session = await requireSession();
    await hydrateEnvFromConfig();
    const result = await scanHallucinations(session.tenantId);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}
