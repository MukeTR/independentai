/**
 * Shopify OAuth (authorization code grant, çevrimdışı token) + webhook imza yardımcıları.
 *
 * Kaynak: shopify.dev → apps/build/authentication-authorization/access-tokens/authorization-code-grant
 *  - Yetkilendirme: https://{shop}/admin/oauth/authorize?client_id&scope&redirect_uri&state
 *  - Geri dönüşte `hmac` sorgu parametresi: hmac hariç parametreler alfabetik sıralanır,
 *    `k=v&k=v` biçiminde birleştirilir, HMAC-SHA256(client_secret) hex ile sabit zamanlı karşılaştırılır.
 *  - Token takası: POST https://{shop}/admin/oauth/access_token {client_id, client_secret, code}
 *    → {access_token, scope}; `expiring: '1'` istenirse ek olarak expires_in + refresh_token gelir.
 *  - Webhook: `X-Shopify-Hmac-Sha256` = base64(HMAC-SHA256(client_secret, HAM gövde)).
 *
 * Bu modül yalnızca kriptografi + URL üretimi + token takası yapar; DB'ye dokunmaz. Secret'lar
 * hiçbir hata mesajına/loga girmez.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { jwtSecret, siteUrl } from '../env';
import { CommerceError, fromHttpStatus, USER_MESSAGES } from './errors';
import type { ShopifyCredentials } from './types';

/** Shopify'ın resmî mağaza alan adı deseni — her iki uçtan sabitlenmiş (…myshopify.com.attacker.example geçmez). */
export const SHOP_DOMAIN_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

export const STATE_COOKIE = 'iai_shopify_state';
/** Çerez yalnızca Shopify OAuth uçlarına gider. */
export const STATE_COOKIE_PATH = '/api/integrations/shopify';
export const STATE_TTL_SEC = 10 * 60;

export const DEFAULT_API_VERSION = '2026-07';
export const DEFAULT_SCOPES = 'read_products';

export function isValidShopDomain(shop: unknown): shop is string {
  return typeof shop === 'string' && shop.length <= 100 && SHOP_DOMAIN_RE.test(shop);
}

/** Kullanıcı girdisini myshopify alan adına indirger (şema/yol atılır, küçük harf); geçersizse null. */
export function normalizeShopDomain(raw: unknown): string | null {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  return isValidShopDomain(s) ? s : null;
}

export type ShopifyEnv = {
  apiKey: string;
  apiSecret: string;
  scopes: string;
  apiVersion: string;
  expiringTokens: boolean;
};

/** Sunucu yapılandırması; eksikse CONFIG_MISSING (kullanıcıya "yapılandırılmamış" mesajı). */
export function shopifyEnv(): ShopifyEnv {
  const apiKey = process.env.SHOPIFY_API_KEY;
  const apiSecret = process.env.SHOPIFY_API_SECRET;
  if (!apiKey || !apiSecret)
    throw new CommerceError('CONFIG_MISSING', USER_MESSAGES.CONFIG_MISSING, { provider: 'SHOPIFY' });
  const scopes = (process.env.SHOPIFY_SCOPES || DEFAULT_SCOPES)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(',');
  const apiVersion = /^\d{4}-\d{2}$/.test(process.env.SHOPIFY_API_VERSION ?? '')
    ? String(process.env.SHOPIFY_API_VERSION)
    : DEFAULT_API_VERSION;
  return { apiKey, apiSecret, scopes, apiVersion, expiringTokens: process.env.SHOPIFY_TOKEN_EXPIRING === '1' };
}

export function apiVersion(): string {
  return /^\d{4}-\d{2}$/.test(process.env.SHOPIFY_API_VERSION ?? '')
    ? String(process.env.SHOPIFY_API_VERSION)
    : DEFAULT_API_VERSION;
}

/** Partner Dashboard'daki izinli yönlendirme adresi ile birebir aynı olmalı (NEXT_PUBLIC_SITE_URL tabanlı). */
export function shopifyRedirectUri(): string {
  return `${siteUrl()}/api/integrations/shopify/callback`;
}

export function makeState(): string {
  return randomBytes(32).toString('hex');
}

// ───────────── State çerezi (state|connectionId|imza) ─────────────

function stateSignature(state: string, connectionId: string): string {
  return createHmac('sha256', jwtSecret()).update(`${state}|${connectionId}`).digest('hex');
}

export function makeStateCookie(state: string, connectionId: string): string {
  return `${state}|${connectionId}|${stateSignature(state, connectionId)}`;
}

/** İmzası geçerli çerezi çözer; bozuk/imzasız → null. */
export function parseStateCookie(value: string | null | undefined): { state: string; connectionId: string } | null {
  if (!value) return null;
  const parts = value.split('|');
  if (parts.length !== 3) return null;
  const [state, connectionId, sig] = parts as [string, string, string];
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[A-Za-z0-9_-]{5,64}$/.test(connectionId)) return null;
  if (!safeEqualHex(stateSignature(state, connectionId), sig)) return null;
  return { state, connectionId };
}

function safeEqualHex(expectedHex: string, actual: string): boolean {
  if (typeof actual !== 'string' || actual.length !== expectedHex.length) return false;
  if (!/^[a-fA-F0-9]+$/.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actual.toLowerCase(), 'hex'));
}

/** Sabit zamanlı state eşitliği (çerezdeki nonce ile geri dönüşteki nonce). */
export function statesMatch(expected: string, actual: string | null | undefined): boolean {
  if (!actual || actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}

// ───────────── Yetkilendirme URL'si ─────────────

export function installUrl(
  shop: string,
  state: string,
  redirectUri: string,
  opts: { apiKey?: string; scopes?: string } = {},
): string {
  if (!isValidShopDomain(shop))
    throw new CommerceError('INVALID_STORE', USER_MESSAGES.INVALID_STORE, { provider: 'SHOPIFY' });
  const env = opts.apiKey && opts.scopes ? null : shopifyEnv();
  const params = new URLSearchParams({
    client_id: opts.apiKey ?? env!.apiKey,
    scope: opts.scopes ?? env!.scopes,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// ───────────── Geri dönüş HMAC'i ─────────────

/**
 * Shopify OAuth geri dönüşü imzası: `hmac` (ve eski `signature`) hariç parametreler alfabetik
 * sıralanır, `k=v&k=v` ile birleştirilir, HMAC-SHA256(client_secret) hex olarak karşılaştırılır.
 */
export function verifyCallbackHmac(searchParams: URLSearchParams, secret: string): boolean {
  const provided = searchParams.get('hmac');
  if (!provided) return false;
  const pairs: string[] = [];
  const keys = Array.from(new Set(Array.from(searchParams.keys())))
    .filter((k) => k !== 'hmac' && k !== 'signature')
    .sort();
  for (const k of keys) {
    for (const v of searchParams.getAll(k)) pairs.push(`${k}=${v}`);
  }
  const digest = createHmac('sha256', secret).update(pairs.join('&')).digest('hex');
  return safeEqualHex(digest, provided);
}

// ───────────── Token takası ─────────────

type TokenResponse = {
  access_token?: unknown;
  scope?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  refresh_token_expires_in?: unknown;
};

function toCredentials(json: TokenResponse, previousRefresh?: string): ShopifyCredentials {
  const accessToken = typeof json.access_token === 'string' ? json.access_token : '';
  if (!accessToken)
    throw new CommerceError('AUTH_INVALID', 'Shopify erişim anahtarı alınamadı', { provider: 'SHOPIFY' });
  const creds: ShopifyCredentials = { kind: 'SHOPIFY', accessToken };
  if (typeof json.scope === 'string') creds.scope = json.scope;
  const ttl = Number(json.expires_in);
  if (Number.isFinite(ttl) && ttl > 0) creds.expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
  if (typeof json.refresh_token === 'string' && json.refresh_token) creds.refreshToken = json.refresh_token;
  else if (previousRefresh && creds.expiresAt) creds.refreshToken = previousRefresh;
  return creds;
}

async function postAccessToken(shop: string, body: URLSearchParams): Promise<ShopifyCredentials> {
  if (!isValidShopDomain(shop))
    throw new CommerceError('INVALID_STORE', USER_MESSAGES.INVALID_STORE, { provider: 'SHOPIFY' });
  let res: Response;
  try {
    res = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new CommerceError('NETWORK', USER_MESSAGES.NETWORK, { provider: 'SHOPIFY', cause: err });
  }
  if (res.status === 400 || res.status === 401) {
    throw new CommerceError('AUTH_INVALID', 'Shopify yetkilendirme kodu geçersiz veya süresi dolmuş', {
      provider: 'SHOPIFY',
      status: res.status,
    });
  }
  if (!res.ok) throw fromHttpStatus(res.status, 'SHOPIFY', res.headers.get('retry-after'));
  let json: TokenResponse;
  try {
    json = (await res.json()) as TokenResponse;
  } catch (err) {
    throw new CommerceError('UPSTREAM_ERROR', USER_MESSAGES.UPSTREAM_ERROR, { provider: 'SHOPIFY', cause: err });
  }
  return toCredentials(json);
}

/** Yetkilendirme kodunu çevrimdışı erişim anahtarıyla takas eder (SHOPIFY_TOKEN_EXPIRING=1 ise süreli token). */
export async function exchangeToken(
  shop: string,
  code: string,
  opts: { expiring?: boolean } = {},
): Promise<ShopifyCredentials> {
  const env = shopifyEnv();
  if (!code || code.length > 512)
    throw new CommerceError('AUTH_INVALID', 'Yetkilendirme kodu eksik', { provider: 'SHOPIFY' });
  const body = new URLSearchParams({ client_id: env.apiKey, client_secret: env.apiSecret, code });
  if (opts.expiring ?? env.expiringTokens) body.set('expiring', '1');
  return postAccessToken(shop, body);
}

/** Süreli çevrimdışı token yenileme (yalnızca refresh_token varsa; v1'de opsiyonel). */
export async function refreshAccessToken(shop: string, refreshToken: string): Promise<ShopifyCredentials> {
  const env = shopifyEnv();
  const body = new URLSearchParams({
    client_id: env.apiKey,
    client_secret: env.apiSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const creds = await postAccessToken(shop, body);
  if (!creds.refreshToken) creds.refreshToken = refreshToken;
  return creds;
}

// ───────────── Webhook HMAC'i ─────────────

/** `X-Shopify-Hmac-Sha256` başlığı = base64(HMAC-SHA256(secret, ham gövde)); sabit zamanlı karşılaştırma. */
export function verifyWebhookHmac(
  rawBody: string | Buffer,
  header: string | null | undefined,
  secret: string,
): boolean {
  if (!header || !secret) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(header.trim(), 'base64');
  } catch {
    return false;
  }
  if (provided.length !== digest.length) return false;
  return timingSafeEqual(digest, provided);
}

/** Test/araç kullanımı: gövde için beklenen başlık değerini üretir. */
export function signWebhookBody(rawBody: string | Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64');
}
