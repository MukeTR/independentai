/**
 * AES-256-GCM encryption for sensitive system config values.
 *
 * Key derivation: scrypt(JWT_SECRET, 'iai-config-salt') → 32 bytes
 * Format: base64( iv[12] | tag[16] | ciphertext )
 *
 * JWT_SECRET değişirse mevcut şifrelenmiş değerler decrypt edilemez,
 * yeniden girilmesi gerek.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';
const SALT = 'iai-config-salt';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;

function getKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET tanımlı değil veya çok kısa — şifreleme yapılamaz');
  }
  return scryptSync(secret, SALT, KEY_LEN);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decrypt(encoded: string): string {
  const key = getKey();
  const data = Buffer.from(encoded, 'base64');
  if (data.length < IV_LEN + TAG_LEN) throw new Error('Geçersiz şifreli veri');
  const iv = data.subarray(0, IV_LEN);
  const tag = data.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ciphertext = data.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Bir API key'in güvenli "preview"i: ilk 4 + son 4 karakter, ortası ●●●.
 * Örn: "sk-proj-abc123...xyz789" → "sk-p●●●●●●●●●89"
 */
export function maskKey(value: string): string {
  if (!value || value.length < 12) return '●●●●';
  return `${value.slice(0, 5)}${'●'.repeat(8)}${value.slice(-4)}`;
}
