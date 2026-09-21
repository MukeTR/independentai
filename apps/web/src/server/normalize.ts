/**
 * Girdi normalizasyonu — marka/rakip/alias/prompt/URL/e-posta.
 * Türkçe büyük-küçük harf katlaması (İ→i, I→ı) `toLocaleLowerCase('tr')` ile yapılır.
 */
import { ClientError } from './errors';

export const LIMITS = {
  name: 80,
  alias: 80,
  aliasCount: 20,
  promptText: 500,
  promptCount: 200,
  website: 200,
  email: 254,
  password: { min: 8, max: 128 },
  companyName: 80,
} as const;

/** Karşılaştırma anahtarı: NFC + Türkçe küçük harf + boşluk/noktalama sadeleştirme. */
export function foldKey(s: string): string {
  return s
    .normalize('NFC')
    .toLocaleLowerCase('tr')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^\p{L}\p{N}\s'.-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanName(raw: unknown, label = 'Ad', max = LIMITS.name): string {
  const s = typeof raw === 'string' ? raw.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
  if (!s) throw new ClientError(`${label} boş olamaz`);
  if (s.length > max) throw new ClientError(`${label} en fazla ${max} karakter olabilir`);
  if (/[<>]/.test(s)) throw new ClientError(`${label} geçersiz karakter içeriyor`);
  return s;
}

/** Alias listesi: boşları at, tekrarları (Türkçe harf duyarsız) ve ana adla aynı olanları ele. */
export function cleanAliases(raw: unknown, primaryName: string): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new ClientError('Alternatif yazımlar liste olmalı');
  const seen = new Set<string>([foldKey(primaryName)]);
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const s = item.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (!s) continue;
    if (s.length > LIMITS.alias) throw new ClientError(`Alternatif yazım en fazla ${LIMITS.alias} karakter olabilir`);
    if (s.length < 2) throw new ClientError('Alternatif yazım en az 2 karakter olmalı');
    const k = foldKey(s);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length > LIMITS.aliasCount)
      throw new ClientError(`En fazla ${LIMITS.aliasCount} alternatif yazım eklenebilir`);
  }
  return out;
}

/** Web sitesi: şema yoksa https ekler, host'u küçültür, sondaki / temizler. Boş → null. */
export function cleanWebsite(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') throw new ClientError('Web sitesi metin olmalı');
  let s = raw.trim();
  if (!s) return null;
  if (s.length > LIMITS.website) throw new ClientError('Web sitesi adresi çok uzun');
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    throw new ClientError('Geçersiz web sitesi adresi');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new ClientError('Web sitesi http/https olmalı');
  if (!u.hostname.includes('.') || u.username || u.password) throw new ClientError('Geçersiz web sitesi adresi');
  u.hostname = u.hostname.toLowerCase();
  u.hash = '';
  return u.toString().replace(/\/+$/, '');
}

export function cleanPromptText(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
  if (s.length < 5) throw new ClientError('Soru en az 5 karakter olmalı');
  if (s.length > LIMITS.promptText) throw new ClientError(`Soru en fazla ${LIMITS.promptText} karakter olabilir`);
  return s;
}

export function normalizeEmail(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!s || s.length > LIMITS.email) throw new ClientError('Geçersiz e-posta adresi');
  // Basit ama sağlam: yerel@alan.tld, boşluk yok, tek @
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw new ClientError('Geçersiz e-posta adresi');
  return s;
}

export function validatePassword(raw: unknown): string {
  const s = typeof raw === 'string' ? raw : '';
  if (s.length < LIMITS.password.min) throw new ClientError(`Şifre en az ${LIMITS.password.min} karakter olmalı`);
  if (s.length > LIMITS.password.max) throw new ClientError(`Şifre en fazla ${LIMITS.password.max} karakter olabilir`);
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s) || !/\d/.test(s))
    throw new ClientError('Şifre en az bir harf ve bir rakam içermeli');
  return s;
}

export const PROMPT_CATEGORY_VALUES = ['discovery', 'comparison', 'review', 'how_to', 'other'] as const;
export function cleanCategory(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw !== 'string' || !(PROMPT_CATEGORY_VALUES as readonly string[]).includes(raw)) {
    throw new ClientError('Geçersiz kategori');
  }
  return raw;
}

export function cleanLanguage(raw: unknown): 'tr' | 'en' {
  if (raw == null || raw === '' || raw === 'tr') return 'tr';
  if (raw === 'en') return 'en';
  throw new ClientError('Desteklenmeyen dil');
}
