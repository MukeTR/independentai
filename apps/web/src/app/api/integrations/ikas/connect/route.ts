import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { bindAndActivate, requireConnectActor, requireSecretField } from '@/server/commerce/connect-shared';

/**
 * ikas özel uygulama kimlik bilgilerini PENDING bağlantıya bağlar ve doğrular.
 * POST { connectionId, clientId, clientSecret } → { connection (secret yok), store }.
 * Doğrulama hatası (geçersiz secret, yanlış mağaza) → 400 { message, details: { code } }.
 */
export const POST = route('integrations.ikas.connect', async (req) => {
  const actor = await requireConnectActor(req);
  const body = await readJson<{ connectionId?: unknown; clientId?: unknown; clientSecret?: unknown }>(req);
  const clientId = requireSecretField(body.clientId, 'Client ID', { min: 8, max: 128 });
  const clientSecret = requireSecretField(body.clientSecret, 'Client Secret', { min: 8, max: 256 });
  return bindAndActivate(actor, 'IKAS', body.connectionId, { kind: 'IKAS', clientId, clientSecret }, req);
});
