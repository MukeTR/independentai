/**
 * AES-256-GCM — hassas ayarlar (provider API key'leri, Slack webhook) için.
 *
 * Anahtar türetme: scrypt(CONFIG_ENCRYPTION_KEY || JWT_SECRET, 'iai-config-salt') → 32 byte
 * Biçim: base64( iv[12] | tag[16] | ciphertext )
 *
 * Anahtar rotasyonu: CONFIG_ENCRYPTION_KEY_PREVIOUS tanımlıysa decrypt önce güncel, sonra
 * önceki anahtarı dener; böylece anahtar değişiminde yeniden şifreleme kademeli yapılabilir.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { encryptionSecret } from './env';

const ALGO = 'aes-256-gcm';
const SALT = 'iai-config-salt';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

const keyCache = new Map<string, Buffer>();
function deriveKey(secret: string): Buffer {
  let k = keyCache.get(secret);
  if (!k) {
    k = scryptSync(secret, SALT, KEY_LEN);
    keyCache.set(secret, k);
  }
  return k;
}

function keys(): Buffer[] {
  const list = [deriveKey(encryptionSecret())];
  const prev = process.env.CONFIG_ENCRYPTION_KEY_PREVIOUS;
  if (prev && prev.length >= 32) list.push(deriveKey(prev));
  return list;
}

export function encrypt(plaintext: string): string {
  const key = keys()[0]!;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(encoded: string): string {
  const data = Buffer.from(encoded, 'base64');
  if (data.length < IV_LEN + TAG_LEN) throw new Error('Geçersiz şifreli veri');
  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.subarray(IV_LEN + TAG_LEN);
  let lastErr: unknown;
  for (const key of keys()) {
    try {
      const decipher = createDecipheriv(ALGO, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Şifre çözülemedi');
}

/** API key önizlemesi: ilk 5 + son 4 karakter. */
export function maskKey(value: string): string {
  if (!value || value.length < 12) return '●●●●';
  return `${value.slice(0, 5)}${'●'.repeat(8)}${value.slice(-4)}`;
}

/** Slack webhook maskesi: https://hooks.slack.com/services/T…/…/•••• */
export function maskWebhook(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const first = parts[1] ?? '';
    return `${u.origin}/${parts[0] ?? 'services'}/${first.slice(0, 2)}…/…/••••${url.slice(-4)}`;
  } catch {
    return '••••';
  }
}
