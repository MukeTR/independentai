/**
 * Bağlantı kimlik bilgileri: AES-256-GCM ile şifreli JSON (StoreConnection.credentialsEnc).
 * Çözülmüş değer yalnızca sunucu belleğinde, bağlayıcı çağrısı süresince yaşar.
 */
import { encrypt, decrypt } from '../crypto';
import type { Credentials } from './types';
import { CommerceError } from './errors';

export function encryptCredentials(c: Credentials): string {
  return encrypt(JSON.stringify(c));
}

export function decryptCredentials(enc: string | null | undefined, expectKind: Credentials['kind']): Credentials {
  if (!enc) throw new CommerceError('AUTH_INVALID', 'Bağlantı kimlik bilgisi yok', { provider: expectKind });
  let parsed: unknown;
  try {
    parsed = JSON.parse(decrypt(enc));
  } catch {
    throw new CommerceError(
      'AUTH_INVALID',
      'Bağlantı kimlik bilgisi çözülemedi (şifreleme anahtarı değişmiş olabilir)',
      { provider: expectKind },
    );
  }
  if (!parsed || typeof parsed !== 'object' || (parsed as { kind?: string }).kind !== expectKind) {
    throw new CommerceError('AUTH_INVALID', 'Bağlantı kimlik bilgisi biçimi geçersiz', { provider: expectKind });
  }
  return parsed as Credentials;
}

/** API/UI'ya dönen güvenli bağlantı görünümü — secret alanı yok. */
export function publicConnectionView<T extends { credentialsEnc?: string | null }>(
  conn: T,
): Omit<T, 'credentialsEnc'> & { hasCredentials: boolean } {
  const { credentialsEnc, ...rest } = conn;
  return { ...rest, hasCredentials: !!credentialsEnc };
}

/** Hata/log çıktısında kimlik bilgisi izi kalmasın diye anahtar adlarını maskeler. */
export function redactForLog(input: unknown): unknown {
  if (!input || typeof input !== 'object') return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = /token|secret|password|hmac|signature|uyeKodu|clientSecret/i.test(k) ? '[redacted]' : v;
  }
  return out;
}
