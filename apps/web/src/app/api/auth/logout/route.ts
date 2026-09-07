import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { clearSessionCookie } from '@/server/session';

export const POST = route('auth.logout', async () => {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
});
