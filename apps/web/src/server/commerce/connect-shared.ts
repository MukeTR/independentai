/**
 * Kimlik bilgisi bağlama route'larının ortak akışı (ikas, Ticimax):
 * yetki (ADMIN+, marka bağlamı) → tenant başına rate limit → bağlantı sahipliği + sağlayıcı eşleşmesi
 * → activateConnection → güvenli görünüm (secret asla dönmez). CommerceError → 400 { message, code:
 * 'bad_request', details: { code: <CommerceErrorCode>, retryable } }.
 */
import { NextResponse } from 'next/server';
import type { CommerceProvider } from '@independentai/db';
import { requireActor, type Actor } from '../authz';
import { ClientError, ConflictError } from '../errors';
import { enforceRateLimit, type LimitSpec } from '../rate-limit';
import { activateConnection, getOwnedConnection } from './connections';
import { publicConnectionView } from './credentials';
import { CommerceError } from './errors';
import { PROVIDER_LABELS } from './registry';
import type { Credentials } from './types';

/** Doğrulama dış sağlayıcıya istek attırır → tenant başına 10 dk'da 10 deneme. */
export const CONNECT_LIMIT: LimitSpec = { name: 'integration-connect', limit: 10, windowMs: 600_000 };

export async function requireConnectActor(req: Request): Promise<Actor> {
  const actor = await requireActor({ write: true, brandContext: true });
  await enforceRateLimit(req, CONNECT_LIMIT, `tenant:${actor.tenantId}`);
  return actor;
}

export function requireConnectionId(v: unknown): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (!/^[a-z0-9]{10,64}$/i.test(s)) throw new ClientError('connectionId gerekli');
  return s;
}

/** Gizli alan doğrulaması: metin, boşluk/kontrol karakteri yok, uzunluk sınırı. Değer loglanmaz. */
export function requireSecretField(v: unknown, label: string, opts: { min?: number; max?: number } = {}): string {
  const s = typeof v === 'string' ? v.trim() : '';
  const min = opts.min ?? 3;
  const max = opts.max ?? 256;
  if (s.length < min || s.length > max) throw new ClientError(`${label} gerekli (${min}-${max} karakter)`);
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001F<>"']/.test(s)) throw new ClientError(`${label} geçersiz karakter içeriyor`);
  return s;
}

export async function bindAndActivate(
  actor: Actor,
  provider: CommerceProvider,
  connectionIdRaw: unknown,
  credentials: Credentials,
  req: Request,
): Promise<Response> {
  const connectionId = requireConnectionId(connectionIdRaw);
  const conn = await getOwnedConnection(actor, connectionId); // başka tenant → 404
  if (conn.provider !== provider)
    throw new ClientError(`Bu bağlantı ${PROVIDER_LABELS[provider]} sağlayıcısına ait değil`);
  if (conn.status === 'DISCONNECTED') throw new ConflictError('Bağlantı kesilmiş; yeni bir bağlantı başlatın');
  try {
    const { connection, info } = await activateConnection(conn.id, credentials, { actorUserId: actor.userId, req });
    return NextResponse.json({
      connection: publicConnectionView(connection),
      store: {
        displayName: info.displayName ?? null,
        primaryDomain: info.primaryDomain ?? null,
        capabilities: info.capabilities ?? null,
      },
    });
  } catch (err) {
    if (err instanceof CommerceError) throw new ClientError(err.message, { code: err.code, retryable: err.retryable });
    throw err;
  }
}
