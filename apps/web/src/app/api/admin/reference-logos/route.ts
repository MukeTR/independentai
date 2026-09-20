import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { audit } from '@/server/audit';
import { createReferenceLogo, listReferenceLogos, referenceLogoCreateSchema } from '@/server/reference-logos';

/**
 * Referans logoları (süper admin).
 *  GET  → tüm kayıtlar (yayında olmayanlar dahil), sıraya göre.
 *  POST {name, logoUrl, siteUrl?, sector?, published?} → 201; kayıt listenin sonuna eklenir.
 *  Not: logoUrl yalnız doğrulanır, sunucu tarafında ASLA fetch edilmez.
 */
export const GET = route('admin.reference_logos_list', async () => {
  await requireSuperAdmin();
  return NextResponse.json({ items: await listReferenceLogos() });
});

export const POST = route('admin.reference_logo_create', async (req) => {
  const actor = await requireSuperAdmin();
  const input = referenceLogoCreateSchema.parse(await readJson(req));
  const row = await createReferenceLogo(input);
  await audit({
    action: 'admin.reference_logo_create',
    actorUserId: actor.userId,
    targetType: 'reference_logo',
    targetId: row.id,
    meta: { name: row.name, logoUrl: row.logoUrl, published: row.published },
    req,
  });
  return NextResponse.json(row, { status: 201 });
});
