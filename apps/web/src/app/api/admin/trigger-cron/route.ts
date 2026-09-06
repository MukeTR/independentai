import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { triggerManualCron } from '@/server/admin';
import { audit } from '@/server/audit';

export const maxDuration = 300;

export const POST = route('admin.trigger_cron', async (req) => {
  const actor = await requireSuperAdmin();
  const body =
    req.headers.get('content-length') && req.headers.get('content-length') !== '0'
      ? await readJson<{ force?: unknown }>(req).catch(() => ({ force: false }))
      : { force: false };
  const result = await triggerManualCron(actor.userId, { force: body.force === true });
  await audit({
    action: 'admin.trigger_cron',
    actorUserId: actor.userId,
    meta: { force: body.force === true, ...result },
    req,
  });
  return NextResponse.json(result);
});
