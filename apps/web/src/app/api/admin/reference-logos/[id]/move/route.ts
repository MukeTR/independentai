import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { moveReferenceLogo, referenceLogoMoveSchema } from '@/server/reference-logos';

/**
 * POST {direction: 'up' | 'down'} — kaydı komşusuyla takas eder, listeyi 0..n-1 yeniden numaralar.
 * Uçtaki kayıt için sıra değişmez; yine güncel liste döner.
 */
export const POST = route('admin.reference_logo_move', async (req, ctx) => {
  const actor = await requireSuperAdmin();
  const id = await requireParam(ctx, 'id');
  const { direction } = referenceLogoMoveSchema.parse(await readJson(req));
  const items = await moveReferenceLogo(id, direction);
  await audit({
    action: 'admin.reference_logo_move',
    actorUserId: actor.userId,
    targetType: 'reference_logo',
    targetId: id,
    meta: { direction },
    req,
  });
  return NextResponse.json({ items });
});
