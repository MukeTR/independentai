import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { previewAgencyInvite } from '@/server/agency';

/** Davet önizleme (giriş şart değil): ?token= → e-posta/rol/ajans adı. */
export const GET = route('agency.invite_preview', async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) throw new ClientError('Davet geçersiz veya süresi dolmuş');
  const inv = await previewAgencyInvite(token);
  if (!inv) throw new ClientError('Davet geçersiz veya süresi dolmuş');
  return NextResponse.json(inv);
});
