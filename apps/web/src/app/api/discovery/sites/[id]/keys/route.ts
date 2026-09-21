import { NextResponse } from 'next/server';
import { route, requireParam } from '@/server/route';
import { ClientError, readJson } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { rotateIngestSecret, rotatePublicKey } from '@/server/discovery/sites';

/**
 * POST /api/discovery/sites/:id/keys — anahtar rotasyonu.
 *  - `kind: 'public'` → sitedeki snippet anahtarı yenilenir (eski anahtar anında geçersiz).
 *  - `kind: 'ingest'` → sunucu/edge HMAC sırrı yenilenir.
 * Üretilen değer yanıtta **yalnızca bir kez** döner; sunucuda özet/şifreli biçimde saklanır.
 */
export const POST = route('discovery.sites.rotate_key', async (req, ctx) => {
  const actor = await requireActor({ write: true, brandContext: true });
  const id = await requireParam(ctx, 'id');
  const body = await readJson<{ kind?: unknown }>(req);
  if (body.kind !== 'public' && body.kind !== 'ingest') throw new ClientError('Geçersiz anahtar türü');

  if (body.kind === 'public') {
    const { publicKey, site } = await rotatePublicKey(actor, id, req);
    return NextResponse.json({ kind: 'public', publicKey, site });
  }
  const { secret, site } = await rotateIngestSecret(actor, id, req);
  return NextResponse.json({ kind: 'ingest', secret, site });
});
