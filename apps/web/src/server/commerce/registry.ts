/**
 * Bağlayıcı kayıt defteri. Sağlayıcı modülleri tembel yüklenir (Ticimax SOAP, Shopify GraphQL
 * bağımlılıkları yalnızca gerektiğinde). Yeni sağlayıcı = yeni dosya + burada bir satır.
 */
import type { CommerceProvider } from '@independentai/db';
import type { CommerceConnector } from './types';
import { CommerceError } from './errors';

const loaders: Record<CommerceProvider, () => Promise<CommerceConnector>> = {
  SHOPIFY: async () => (await import('./connectors/shopify')).shopifyConnector,
  IKAS: async () => (await import('./connectors/ikas')).ikasConnector,
  TICIMAX: async () => (await import('./connectors/ticimax')).ticimaxConnector,
};

const cache = new Map<CommerceProvider, Promise<CommerceConnector>>();

export function isCommerceProvider(v: unknown): v is CommerceProvider {
  return v === 'SHOPIFY' || v === 'IKAS' || v === 'TICIMAX';
}

export async function getConnector(provider: CommerceProvider): Promise<CommerceConnector> {
  let p = cache.get(provider);
  if (!p) {
    p = loaders[provider]();
    cache.set(provider, p);
  }
  try {
    return await p;
  } catch (err) {
    cache.delete(provider);
    throw new CommerceError('UNSUPPORTED', 'Bağlayıcı yüklenemedi', { provider, cause: err });
  }
}

/** Sağlayıcı ortam değişkeni hazır mı (UI "kullanılabilir/yapılandırılmamış" rozeti) */
export function providerConfigured(provider: CommerceProvider): boolean {
  if (provider === 'SHOPIFY') return !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);
  // ikas ve Ticimax kimlik bilgileri mağaza sahibinden alınır; sunucu env'i gerekmez.
  return true;
}

export const PROVIDER_LABELS: Record<CommerceProvider, string> = {
  SHOPIFY: 'Shopify',
  IKAS: 'ikas',
  TICIMAX: 'Ticimax',
};
