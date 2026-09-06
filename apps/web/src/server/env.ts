/**
 * Ortam değişkenleri — tek noktadan, doğrulanmış erişim.
 * Gizli değerler hiçbir zaman loglanmaz; eksik/zayıf zorunlu değerler açık hata verir.
 */

const MIN_SECRET_LENGTH = 32;

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} ortam değişkeni tanımlı değil`);
  return v;
}

/** JWT imzalama sırrı — en az 32 karakter (256 bit entropi hedefi). */
export function jwtSecret(): string {
  const s = required('JWT_SECRET');
  if (s.length < MIN_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET en az ${MIN_SECRET_LENGTH} karakter olmalı (openssl rand -hex 32)`);
  }
  return s;
}

/** Şifreleme anahtarı: CONFIG_ENCRYPTION_KEY varsa o, yoksa JWT_SECRET (geri uyumluluk). */
export function encryptionSecret(): string {
  const dedicated = process.env.CONFIG_ENCRYPTION_KEY;
  if (dedicated && dedicated.length >= MIN_SECRET_LENGTH) return dedicated;
  return jwtSecret();
}

export function cronSecret(): string | null {
  const s = process.env.CRON_SECRET;
  return s && s.length >= 16 ? s : null;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://independentai.space').replace(/\/+$/, '');
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview';
}

/** Test/E2E ortamı: dış e-posta/Slack gönderimi kapalı, deterministik davranış. */
export function isTestEnv(): boolean {
  return process.env.IAI_TEST_MODE === '1' || process.env.NODE_ENV === 'test';
}

/**
 * Mock mode: provider anahtarı olmayan ortamlarda AI cevapları deterministik sahte üretilir.
 * Production'da yalnızca açıkça IAI_ALLOW_MOCK=1 ile izin verilir; aksi halde anahtarsız
 * provider "yapılandırılmamış" hatası döndürür (sahte veri gerçek ölçüm gibi görünmez).
 */
export function mockAllowed(): boolean {
  if (process.env.IAI_ALLOW_MOCK === '1') return true;
  return !isProduction();
}

export function trialGraceDays(): number {
  const n = Number(process.env.TRIAL_GRACE_DAYS ?? 7);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}
