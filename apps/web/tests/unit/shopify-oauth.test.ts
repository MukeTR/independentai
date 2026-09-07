import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import {
  exchangeToken,
  installUrl,
  isValidShopDomain,
  makeState,
  makeStateCookie,
  normalizeShopDomain,
  parseStateCookie,
  shopifyEnv,
  signWebhookBody,
  statesMatch,
  verifyCallbackHmac,
  verifyWebhookHmac,
} from '@/server/commerce/shopify-oauth';
import { CommerceError } from '@/server/commerce/errors';

const SECRET = 'shpss_test_client_secret_0123456789';

beforeEach(() => {
  process.env.SHOPIFY_API_KEY = 'test_api_key';
  process.env.SHOPIFY_API_SECRET = SECRET;
  delete process.env.SHOPIFY_SCOPES;
  delete process.env.SHOPIFY_API_VERSION;
});
afterEach(() => {
  delete process.env.SHOPIFY_API_KEY;
  delete process.env.SHOPIFY_API_SECRET;
});

describe('shop alan adı doğrulama', () => {
  it.each(['acme.myshopify.com', 'a.myshopify.com', 'my-store-1.myshopify.com', 'ACME.myshopify.com'])(
    '%s geçerli',
    (s) => {
      expect(isValidShopDomain(s)).toBe(true);
    },
  );
  it.each([
    'acme.myshopify.com.attacker.example',
    'evil.com/acme.myshopify.com',
    'acme.myshopify.co',
    '-acme.myshopify.com',
    'acme.myshopify.com:443',
    'https://acme.myshopify.com',
    'acme_store.myshopify.com',
    '',
    'myshopify.com',
    'acme.myshopify.com\n',
  ])('%j geçersiz', (s) => {
    expect(isValidShopDomain(s)).toBe(false);
  });
  it('normalizeShopDomain şema/yol atar ve küçük harfe çevirir', () => {
    expect(normalizeShopDomain(' https://ACME.myshopify.com/admin ')).toBe('acme.myshopify.com');
    expect(normalizeShopDomain('acme.com')).toBeNull();
  });
});

describe('install URL', () => {
  it('resmî authorize ucuna client_id/scope/redirect_uri/state ile yönlendirir', () => {
    const url = new URL(
      installUrl('acme.myshopify.com', 'abc123', 'https://independentai.space/api/integrations/shopify/callback'),
    );
    expect(url.origin + url.pathname).toBe('https://acme.myshopify.com/admin/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('test_api_key');
    expect(url.searchParams.get('scope')).toBe('read_products');
    expect(url.searchParams.get('redirect_uri')).toBe('https://independentai.space/api/integrations/shopify/callback');
    expect(url.searchParams.get('state')).toBe('abc123');
    expect(url.searchParams.has('grant_options[]')).toBe(false); // çevrimdışı token
  });
  it('geçersiz shop → INVALID_STORE; env eksik → CONFIG_MISSING', () => {
    expect(() => installUrl('evil.com', 's', 'https://x/cb')).toThrowError(CommerceError);
    delete process.env.SHOPIFY_API_SECRET;
    try {
      shopifyEnv();
      expect.unreachable();
    } catch (err) {
      expect((err as CommerceError).code).toBe('CONFIG_MISSING');
    }
  });
  it('SHOPIFY_SCOPES boşluklarını temizler', () => {
    process.env.SHOPIFY_SCOPES = ' read_products , read_product_listings ';
    expect(shopifyEnv().scopes).toBe('read_products,read_product_listings');
  });
});

describe('geri dönüş HMAC doğrulaması', () => {
  function signed(params: Record<string, string>): URLSearchParams {
    const message = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const hmac = createHmac('sha256', SECRET).update(message).digest('hex');
    return new URLSearchParams({ ...params, hmac });
  }
  const base = {
    code: '0907a61c0c8d55e99db179b68161bc00',
    shop: 'acme.myshopify.com',
    state: 'nonce123',
    timestamp: '1337178173',
    host: 'YWRtaW4uc2hvcGlmeS5jb20vc3RvcmUvYWNtZQ',
  };

  it('doğru imza geçer (parametre sırası bağımsız)', () => {
    const sp = signed(base);
    expect(verifyCallbackHmac(sp, SECRET)).toBe(true);
    const shuffled = new URLSearchParams();
    for (const k of ['timestamp', 'hmac', 'state', 'host', 'code', 'shop']) shuffled.set(k, sp.get(k)!);
    expect(verifyCallbackHmac(shuffled, SECRET)).toBe(true);
  });
  it('değiştirilmiş parametre / yanlış secret / eksik hmac / farklı uzunluk reddedilir', () => {
    const sp = signed(base);
    const tampered = new URLSearchParams(sp);
    tampered.set('shop', 'evil.myshopify.com');
    expect(verifyCallbackHmac(tampered, SECRET)).toBe(false);
    expect(verifyCallbackHmac(sp, 'other-secret')).toBe(false);
    const missing = new URLSearchParams(sp);
    missing.delete('hmac');
    expect(verifyCallbackHmac(missing, SECRET)).toBe(false);
    const short = new URLSearchParams(sp);
    short.set('hmac', 'abcd');
    expect(verifyCallbackHmac(short, SECRET)).toBe(false);
    const nonHex = new URLSearchParams(sp);
    nonHex.set('hmac', 'z'.repeat(64));
    expect(verifyCallbackHmac(nonHex, SECRET)).toBe(false);
  });
  it('büyük harfli hex imza da kabul edilir', () => {
    const sp = signed(base);
    sp.set('hmac', sp.get('hmac')!.toUpperCase());
    expect(verifyCallbackHmac(sp, SECRET)).toBe(true);
  });
});

describe('state çerezi', () => {
  it('imzalı çerez çözülür; bozulmuş çerez veya farklı connectionId reddedilir', () => {
    const state = makeState();
    expect(state).toMatch(/^[a-f0-9]{64}$/);
    const cookie = makeStateCookie(state, 'clx123abc');
    expect(parseStateCookie(cookie)).toEqual({ state, connectionId: 'clx123abc' });
    const [s, , sig] = cookie.split('|');
    expect(parseStateCookie(`${s}|otherconn|${sig}`)).toBeNull();
    expect(parseStateCookie(`${cookie}x`)).toBeNull();
    expect(parseStateCookie('')).toBeNull();
    expect(parseStateCookie(undefined)).toBeNull();
  });
  it('statesMatch sabit uzunluk + eşitlik ister', () => {
    expect(statesMatch('abc', 'abc')).toBe(true);
    expect(statesMatch('abc', 'abd')).toBe(false);
    expect(statesMatch('abc', 'ab')).toBe(false);
    expect(statesMatch('abc', null)).toBe(false);
  });
});

describe('webhook HMAC (base64, ham gövde)', () => {
  const body = JSON.stringify({ id: 1, admin_graphql_api_id: 'gid://shopify/Product/1', title: 'Ürün — ğüşiöç' });
  it('doğru imza geçer', () => {
    const header = createHmac('sha256', SECRET).update(body).digest('base64');
    expect(signWebhookBody(body, SECRET)).toBe(header);
    expect(verifyWebhookHmac(body, header, SECRET)).toBe(true);
    expect(verifyWebhookHmac(Buffer.from(body), ` ${header} `, SECRET)).toBe(true);
  });
  it('gövde değişirse, secret farklıysa, başlık yoksa veya kısa ise reddedilir', () => {
    const header = signWebhookBody(body, SECRET);
    expect(verifyWebhookHmac(body + ' ', header, SECRET)).toBe(false);
    expect(verifyWebhookHmac(body, header, 'x')).toBe(false);
    expect(verifyWebhookHmac(body, null, SECRET)).toBe(false);
    expect(verifyWebhookHmac(body, '', SECRET)).toBe(false);
    expect(verifyWebhookHmac(body, 'AAAA', SECRET)).toBe(false);
    expect(verifyWebhookHmac(body, header, '')).toBe(false);
  });
});

describe('token takası', () => {
  it('geçersiz shop için ağ isteği yapmadan INVALID_STORE fırlatır', async () => {
    await expect(exchangeToken('evil.com', 'code')).rejects.toMatchObject({ code: 'INVALID_STORE' });
  });
  it('boş kod → AUTH_INVALID', async () => {
    await expect(exchangeToken('acme.myshopify.com', '')).rejects.toMatchObject({ code: 'AUTH_INVALID' });
  });
});
