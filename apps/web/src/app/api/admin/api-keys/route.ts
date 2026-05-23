import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSuperAdmin, ForbiddenError } from '@/server/admin';
import { UnauthorizedError } from '@/server/session';
import { setConfigValue, clearConfigValue, CONFIG_KEYS, type ConfigKey } from '@/server/system-config';

const VALID_KEYS = CONFIG_KEYS.map((c) => c.key);

const setSchema = z.object({
  key: z.enum(VALID_KEYS as [ConfigKey, ...ConfigKey[]]),
  value: z.string().min(10).max(2000),
});

const deleteSchema = z.object({
  key: z.enum(VALID_KEYS as [ConfigKey, ...ConfigKey[]]),
});

function handleErr(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) return NextResponse.json({ message: 'Yetkisiz' }, { status: 401 });
  if (err instanceof ForbiddenError) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ message: err instanceof Error ? err.message : 'Hata' }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const body = setSchema.parse(await req.json());
    await setConfigValue(body.key, body.value, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleErr(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin();
    const body = deleteSchema.parse(await req.json());
    await clearConfigValue(body.key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleErr(err);
  }
}
