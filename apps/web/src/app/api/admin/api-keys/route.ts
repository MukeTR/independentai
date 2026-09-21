import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireSuperAdmin } from '@/server/authz';
import { setConfigValue, clearConfigValue, CONFIG_KEYS, type ConfigKey } from '@/server/system-config';
import { audit } from '@/server/audit';

const VALID_KEYS = new Set<string>(CONFIG_KEYS.map((c) => c.key));

function parseKey(v: unknown): ConfigKey {
  if (typeof v !== 'string' || !VALID_KEYS.has(v)) throw new ClientError('Geçersiz anahtar');
  return v as ConfigKey;
}

export const POST = route('admin.api_keys.set', async (req) => {
  const actor = await requireSuperAdmin();
  const body = await readJson<{ key?: unknown; value?: unknown }>(req);
  const key = parseKey(body.key);
  const value = typeof body.value === 'string' ? body.value.trim() : '';
  if (value.length < 10 || value.length > 2000) throw new ClientError('Değer 10-2000 karakter olmalı');
  await setConfigValue(key, value, actor.userId);
  await audit({ action: 'admin.api_key_set', actorUserId: actor.userId, meta: { key }, req });
  return NextResponse.json({ ok: true });
});

export const DELETE = route('admin.api_keys.clear', async (req) => {
  const actor = await requireSuperAdmin();
  const body = await readJson<{ key?: unknown }>(req);
  const key = parseKey(body.key);
  await clearConfigValue(key);
  await audit({ action: 'admin.api_key_clear', actorUserId: actor.userId, meta: { key }, req });
  return NextResponse.json({ ok: true });
});
