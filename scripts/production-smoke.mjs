#!/usr/bin/env node
/**
 * Canlı smoke testi — salt-okunur + (opsiyonel) tek kullanımlık "production-smoke-*" hesabı.
 *
 *   SMOKE_BASE_URL=https://independentai.space node scripts/production-smoke.mjs
 *   SMOKE_WRITE=1  → kayıt/onboarding/soru/ekip/ajans akışını gerçek hesapla dener ve hesabı SİLER
 *   SMOKE_CRON_SECRET=... → /api/cron/daily-run?dry=1 yetki kontrolü (401 beklenir yanlış anahtarla)
 *
 * Çıktı: her kontrol için PASS/FAIL ve toplam; herhangi bir FAIL → çıkış kodu 1 (NO-GO sinyali).
 * Gizli değer yazmaz. Üretim verisini değiştirmez (SMOKE_WRITE yalnızca kendi oluşturduğu hesabı siler).
 */
const base = (process.env.SMOKE_BASE_URL || 'https://independentai.space').replace(/\/$/, '');
const write = process.env.SMOKE_WRITE === '1';
const results = [];
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}
function storeCookies(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const c of raw) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    if (v === '' || /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k.trim());
    else jar.set(k.trim(), v);
  }
}
async function req(method, path, body, extra = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(jar.size ? { cookie: cookieHeader() } : {}),
      ...(extra.headers ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
    signal: AbortSignal.timeout(extra.timeout ?? 30_000),
  });
  storeCookies(res);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, headers: res.headers, text, json };
}
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

// ── Salt-okunur kontroller ──
{
  const r = await req('GET', '/api/health');
  check('health 200 + db ok', r.status === 200 && r.json?.db !== 'down', `status ${r.status}`);
  check('health sır sızdırmıyor', !/postgres:\/\/|sk-|secret/i.test(r.text));
}
for (const p of [
  '/',
  '/login',
  '/register',
  '/pricing',
  '/features',
  '/solutions/ecommerce',
  '/solutions/shopify',
  '/solutions/ikas',
  '/solutions/ticimax',
  '/solutions/agencies',
  '/arac/e-ticaret-ai-gorunurluk-testi',
  '/arac/urun-sayfasi-testi',
  '/arac/ai-crawler-testi',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
]) {
  const r = await req('GET', p);
  check(`GET ${p} → 200`, r.status === 200, `status ${r.status}`);
}
{
  const r = await req('GET', '/');
  const h = r.headers;
  check('CSP başlığı var', !!h.get('content-security-policy'));
  check('HSTS var', /max-age/.test(h.get('strict-transport-security') ?? ''));
  check(
    'X-Frame-Options / frame-ancestors',
    !!h.get('x-frame-options') || /frame-ancestors/.test(h.get('content-security-policy') ?? ''),
  );
  check('nosniff', h.get('x-content-type-options') === 'nosniff');
  check('Referrer-Policy', !!h.get('referrer-policy'));
}
{
  const r = await req('GET', '/dashboard');
  check(
    'oturumsuz /dashboard → login yönlendirmesi',
    r.status >= 300 && r.status < 400 && /login/.test(r.headers.get('location') ?? ''),
    `status ${r.status}`,
  );
  const a = await req('GET', '/api/prompts');
  check('oturumsuz /api/prompts → 401', a.status === 401, `status ${a.status}`);
  const t = await req('GET', '/api/realtime/token');
  check('oturumsuz /api/realtime/token → 401', t.status === 401, `status ${t.status}`);
  const c = await req('GET', '/api/cron/daily-run', undefined, {
    headers: { authorization: 'Bearer wrong-secret-for-smoke' },
  });
  check('cron yanlış anahtar → 401', c.status === 401, `status ${c.status}`);
  const w = await req(
    'POST',
    '/api/integrations/shopify/webhook',
    { id: 1 },
    {
      headers: {
        'x-shopify-hmac-sha256': 'aW52YWxpZA==',
        'x-shopify-topic': 'products/update',
        'x-shopify-shop-domain': 'smoke.myshopify.com',
        'x-shopify-webhook-id': 'smoke-1',
      },
    },
  );
  check('shopify webhook geçersiz HMAC → 401', w.status === 401, `status ${w.status}`);
}
// ── AI Discovery Sensor (salt-okunur; hiçbir olay yazılmaz) ──
{
  const js = await req('GET', '/sensor/v1.js');
  check('sensor SDK 200', js.status === 200, `status ${js.status}`);
  check(
    'sensor SDK doğru content-type + nosniff',
    /javascript/i.test(js.headers.get('content-type') ?? '') && js.headers.get('x-content-type-options') === 'nosniff',
    js.headers.get('content-type') ?? 'yok',
  );
  check('sensor SDK çerez kullanmıyor', !/document\.cookie/.test(js.text));

  const badKey = await req(
    'POST',
    '/api/collect/v1/event',
    { k: 'iais_gecersiz_anahtar_smoke_xxxxx', e: [{ id: 'smoke-12345678', sid: 'smoke-1234567', t: 'page_view' }] },
    { headers: { origin: 'https://smoke.example' } },
  );
  check('collector geçersiz anahtar → 401', badKey.status === 401, `status ${badKey.status}`);

  const noSig = await req('POST', '/api/collect/v1/server', { hits: [] }, { headers: { 'x-iai-key': 'iais_x' } });
  check('sunucu collector imzasız → 401', noSig.status === 401, `status ${noSig.status}`);
}

{
  // Araç çağrısı Audit/PublicScan satırı yazar → yalnızca SMOKE_WRITE=1 ile (production'da "production-smoke" dışı veri yazılmaz).
  if (write) {
    const r = await req('POST', '/api/tools/ai-crawler', { url: 'https://example.com' }, { timeout: 45_000 });
    check('public ai-crawler aracı 200/429', r.status === 200 || r.status === 429, `status ${r.status}`);
  }
  const s = await req('POST', '/api/tools/geo-audit', { url: 'http://127.0.0.1/' });
  check('SSRF adresi reddedildi (400, fetch/yazma yok)', s.status === 400, `status ${s.status}`);
}

// ── Yazma akışı (yalnızca SMOKE_WRITE=1): kendi hesabını açar ve siler ──
if (write) {
  const stamp = Date.now().toString(36);
  const email = `production-smoke-${stamp}@smoke.independentai.space`;
  const password = `Smoke-${stamp}-Aa1!xyz`;
  const reg = await req('POST', '/api/auth/register', {
    email,
    password,
    companyName: `production-smoke-${stamp}`,
    website: 'https://example.com',
  });
  check('kayıt 201', reg.status === 201 || reg.status === 200, `status ${reg.status}`);
  const me = await req('GET', '/api/account/me');
  check('oturum kuruldu', me.status === 200, `status ${me.status}`);
  const ob = await req(
    'POST',
    '/api/onboarding',
    {
      brand: { name: `production-smoke-${stamp}`, website: 'https://example.com' },
      competitors: [],
      prompts: [{ text: 'production-smoke test sorusu nedir', language: 'tr' }],
    },
    { timeout: 60_000 },
  );
  check('onboarding 201', ob.status === 201, `status ${ob.status}`);
  const rt = await req('GET', '/api/realtime/token');
  check(
    'realtime token 200 (enabled true/false)',
    rt.status === 200 && typeof rt.json?.enabled === 'boolean',
    `enabled=${rt.json?.enabled}`,
  );
  const ig = await req('GET', '/api/integrations');
  check(
    'integrations listesi 200 + credentialsEnc yok',
    ig.status === 200 && !/credentialsEnc/.test(ig.text),
    `status ${ig.status}`,
  );
  const bad = await req('POST', '/api/integrations', { provider: 'TICIMAX', storeDomain: 'localhost' });
  check('geçersiz mağaza adresi 400', bad.status === 400, `status ${bad.status}`);
  const del = await req('POST', '/api/account/delete', { confirm: 'SİL' });
  check('smoke hesabı silindi', del.status === 200 || del.status === 204, `status ${del.status}`);
  const after = await req('GET', '/api/account/me');
  check('silme sonrası oturum geçersiz', after.status === 401, `status ${after.status}`);
}

const failed = results.filter((r) => !r.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} PASS${failed.length ? ` — ${failed.length} FAIL` : ''}`,
);
process.exit(failed.length ? 1 : 0);
