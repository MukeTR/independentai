/**
 * Sağlayıcı kataloğu (UI için): etiket, sunucuda yapılandırılmış mı, kimlik doğrulama modeli ve
 * bağlayıcı yetenekleri. Bağlayıcı yüklenemezse sağlayıcı "yapılandırılmamış" olarak işaretlenir —
 * sahte "kullanılabilir" gösterilmez.
 */
import type { CommerceProvider } from '@independentai/db';
import { getConnector, providerConfigured, PROVIDER_LABELS } from './registry';
import type { ConnectorCapabilities } from './types';

export const COMMERCE_PROVIDERS: readonly CommerceProvider[] = ['SHOPIFY', 'IKAS', 'TICIMAX'] as const;

export type ProviderInfo = {
  provider: CommerceProvider;
  label: string;
  configured: boolean;
  /** oauth: sağlayıcıya yönlendirme; credentials: kullanıcı anahtar/kod girer */
  auth: 'oauth' | 'credentials';
  capabilities: ConnectorCapabilities | null;
};

export async function listProviderInfos(): Promise<ProviderInfo[]> {
  return Promise.all(
    COMMERCE_PROVIDERS.map(async (provider): Promise<ProviderInfo> => {
      let capabilities: ConnectorCapabilities | null = null;
      let loadable = true;
      try {
        capabilities = (await getConnector(provider)).capabilities();
      } catch {
        loadable = false;
      }
      return {
        provider,
        label: PROVIDER_LABELS[provider],
        configured: loadable && providerConfigured(provider),
        auth: capabilities?.auth === 'oauth_authorization_code' ? 'oauth' : 'credentials',
        capabilities,
      };
    }),
  );
}
