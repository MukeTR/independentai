import { route } from '@/server/route';
import { ClientError, readJson } from '@/server/errors';
import { log } from '@/server/logger';
import { assertPublicUrl, UnsafeUrlError } from '@/server/safe-fetch';
import { CommerceError } from '@/server/commerce/errors';
import { normalizeServiceBase } from '@/server/commerce/connectors/ticimax';
import { bindAndActivate, requireConnectActor, requireSecretField } from '@/server/commerce/connect-shared';

/**
 * Ticimax web servis bilgilerini PENDING bağlantıya bağlar ve doğrular (SelectUrunCount).
 * POST { connectionId, serviceBase, uyeKodu } → { connection (secret yok), store }.
 * serviceBase: https zorunlu, public host (parsePublicUrl + DNS doğrulaması); `/Servis/...` eki atılır.
 */
export const POST = route('integrations.ticimax.connect', async (req) => {
  const actor = await requireConnectActor(req);
  const body = await readJson<{ connectionId?: unknown; serviceBase?: unknown; uyeKodu?: unknown }>(req);
  const uyeKodu = requireSecretField(body.uyeKodu, 'Üye kodu', { min: 3, max: 200 });
  let serviceBase: string;
  try {
    serviceBase = normalizeServiceBase(body.serviceBase);
    await assertPublicUrl(serviceBase); // DNS çözümü de özel/dahili adres olmasın
  } catch (err) {
    if (err instanceof CommerceError || err instanceof UnsafeUrlError) throw new ClientError(err.message);
    throw err;
  }
  const host = new URL(serviceBase).hostname.replace(/^www\./, '');
  log.debug('ticimax.connect_attempt', {
    connectionId: typeof body.connectionId === 'string' ? body.connectionId : null,
    host,
  });
  return bindAndActivate(actor, 'TICIMAX', body.connectionId, { kind: 'TICIMAX', serviceBase, uyeKodu }, req);
});
