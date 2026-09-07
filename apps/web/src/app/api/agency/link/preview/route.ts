import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { ClientError } from '@/server/errors';
import { previewLinkRequest } from '@/server/agency';

export const GET = route('agency.link_preview', async (req) => {
  const token = new URL(req.url).searchParams.get('token') ?? '';
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) throw new ClientError('Bağlantı isteği geçersiz veya süresi dolmuş');
  const info = await previewLinkRequest(token);
  if (!info) throw new ClientError('Bağlantı isteği geçersiz veya süresi dolmuş');
  return NextResponse.json(info);
});
