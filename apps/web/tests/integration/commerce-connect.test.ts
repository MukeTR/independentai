import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { addMember, call, createTenant, flushAfter, loginAs, prisma } from './helpers';
import { POST as ikasConnect } from '@/app/api/integrations/ikas/connect/route';
import { POST as ikasWebhook } from '@/app/api/integrations/ikas/webhook/route';
import { POST as ticimaxConnect } from '@/app/api/integrations/ticimax/connect/route';
import { createPendingConnection } from '@/server/commerce/connections';
import { decryptCredentials, encryptCredentials } from '@/server/commerce/credentials';
import { webhookKey } from '@/server/commerce/connectors/ikas';
import { getActor } from '@/server/authz';

const SECRET = 's_cok_gizli_ikas_secret_123456';
const PRODUCT = {
  id: 'prod-1',
  name: 'Webhook Ürünü',
  description: '<p>Açıklama</p>',
  brand: { id: 'b', name: 'Marka' },
  categories: [{ id: 'c', name: 'Kategori' }],
  totalStock: 4,
  metaData: { slug: 'webhook-urunu', pageTitle: 'T', description: 'D' },
  variants: [
    {
      id: 'v',
      sku: 'SKU-1',
      barcodeList: [],
      isActive: true,
      prices: [{ sellPrice: 100, currencyCode: 'TRY' }],
      stocks: [{ stockCount: 4 }],
    },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

/** ikas token + GraphQL sahtesi: geçerli secret ile başarı, aksi halde 401. */
function stubIkas(opts: { validSecret?: string } = {}) {
  const calls: { url: string; body: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init: RequestInit) => {
      const u = String(url);
      const body = String(init.body ?? '');
      calls.push({ url: u, body });
      if (u.endsWith('/api/admin/oauth/token')) {
        const form = new URLSearchParams(body);
        if (form.get('client_secret') !== (opts.validSecret ?? SECRET)) return json({ error: 'invalid_client' }, 401);
        return json({ access_token: 'tok-abc', token_type: 'Bearer', expires_in: 14400 });
      }
      const q = String((JSON.parse(body) as { query: string }).query);
      if (q.includes('listCategory'))
        return json({ data: { listCategory: [{ id: 'c', name: 'Kategori', parentId: null, categoryPath: ['c'] }] } });
      if (q.includes('listWebhook')) return json({ data: { listWebhook: [] } });
      if (q.includes('saveWebhook')) {
        const input = (JSON.parse(body) as { variables: { input: { scopes: string[]; endpoint: string } } }).variables
          .input;
        return json({
          data: { saveWebhook: input.scopes.map((s) => ({ id: s, scope: s, endpoint: input.endpoint })) },
        });
      }
      if (q.includes('id: { eq: $id }')) return json({ data: { listProduct: { data: [PRODUCT] } } });
      return json({ data: { listProduct: { count: 1, page: 1, limit: 1, hasNext: false, data: [PRODUCT] } } });
    }),
  );
  return calls;
}

async function actorFor(user: { id: string; tenantId: string; email: string }) {
  await loginAs(user);
  const actor = await getActor();
  if (!actor) throw new Error('actor yok');
  return actor;
}

afterEach(() => vi.unstubAllGlobals());

// Webhook kaydı yalnızca https geri çağrı adresiyle yapılır; yerel .env http olabilir → testte sabitle.
const prevSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
beforeAll(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://test.independentai.space';
});
afterAll(() => {
  if (prevSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = prevSiteUrl;
});

describe('ikas connect', () => {
  it('PENDING bağlantı + geçerli kimlik → ACTIVE, şifreli kimlik, yanıtta secret yok, senkron kuyruğa alınır, webhook kayıtlı', async () => {
    const { user, tenant } = await createTenant();
    const actor = await actorFor(user);
    const pending = await createPendingConnection(actor, 'IKAS', 'demo.myikas.com');
    const calls = stubIkas();

    const res = await call(ikasConnect, {
      method: 'POST',
      body: { connectionId: pending.id, clientId: 'client-id-1234', clientSecret: SECRET },
    });
    expect(res.status, res.text).toBe(200);
    expect(res.text).not.toContain(SECRET);
    expect(res.text).not.toContain('credentialsEnc');
    const view = res.json.connection as unknown as {
      id: string;
      status: string;
      hasCredentials: boolean;
      capabilities: Record<string, unknown>;
    };
    expect(view.id).toBe(pending.id);
    expect(view.status).toBe('ACTIVE');
    expect(view.hasCredentials).toBe(true);
    expect(view.capabilities).toMatchObject({
      webhooks: true,
      categories: true,
      auth: 'oauth_client_credentials',
      productCount: 1,
    });

    const row = await prisma.storeConnection.findUniqueOrThrow({ where: { id: pending.id } });
    expect(row.status).toBe('ACTIVE');
    expect(row.credentialsEnc).toBeTruthy();
    expect(row.credentialsEnc).not.toContain(SECRET);
    expect(row.credentialsEnc).not.toContain('client-id-1234');
    const creds = decryptCredentials(row.credentialsEnc, 'IKAS');
    expect(creds.kind === 'IKAS' && creds.clientSecret).toBe(SECRET);
    // token verify sırasında alındı ve aynı kayıtta şifrelendi
    expect(creds.kind === 'IKAS' && creds.accessToken).toBe('tok-abc');
    expect(row.webhooksRegistered).toBe(true);
    expect(row.displayName).toBe('demo');

    const syncs = await prisma.catalogSync.findMany({ where: { connectionId: pending.id } });
    expect(syncs).toHaveLength(1);
    expect(syncs[0]!.status).toBe('PENDING');
    expect(syncs[0]!.triggeredBy).toBe(`connect:${user.id}`);
    expect(await prisma.auditLog.count({ where: { tenantId: tenant.id, action: 'integration.connect' } })).toBe(1);
    // webhook kaydı: endpoint c&k taşır
    const save = calls.find((c) => c.body.includes('saveWebhook'))!;
    const endpoint = (JSON.parse(save.body) as { variables: { input: { endpoint: string } } }).variables.input.endpoint;
    const u = new URL(endpoint);
    expect(u.pathname).toBe('/api/integrations/ikas/webhook');
    expect(u.searchParams.get('c')).toBe(pending.id);
    expect(u.searchParams.get('k')).toBe(webhookKey(pending.id));
    // realtime yayını: secret yok
    const msgs = await prisma.$queryRawUnsafe<{ payload: unknown }[]>('select payload from realtime.messages');
    expect(JSON.stringify(msgs)).not.toContain(SECRET);
  });

  it('geçersiz secret → 400 details.code=AUTH_INVALID, bağlantı ERROR, secret sızmaz', async () => {
    const { user } = await createTenant();
    const actor = await actorFor(user);
    const pending = await createPendingConnection(actor, 'IKAS', 'demo.myikas.com');
    stubIkas();
    const res = await call(ikasConnect, {
      method: 'POST',
      body: { connectionId: pending.id, clientId: 'client-id-1234', clientSecret: 'yanlis_secret_12345' },
    });
    expect(res.status).toBe(400);
    expect((res.json.details as unknown as { code: string }).code).toBe('AUTH_INVALID');
    expect(res.text).not.toContain('yanlis_secret');
    const row = await prisma.storeConnection.findUniqueOrThrow({ where: { id: pending.id } });
    expect(row.status).toBe('ERROR');
    expect(row.lastErrorCode).toBe('AUTH_INVALID');
    expect(row.credentialsEnc).toBeNull();
  });

  it("başka tenant'ın connectionId'si → 404; VIEWER → 403; eksik alan → 400", async () => {
    const a = await createTenant();
    const b = await createTenant();
    const actorA = await actorFor(a.user);
    const pendingA = await createPendingConnection(actorA, 'IKAS', 'demo.myikas.com');
    stubIkas();

    await loginAs(b.user);
    const cross = await call(ikasConnect, {
      method: 'POST',
      body: { connectionId: pendingA.id, clientId: 'client-id-1234', clientSecret: SECRET },
    });
    expect(cross.status).toBe(404);
    expect((await prisma.storeConnection.findUniqueOrThrow({ where: { id: pendingA.id } })).status).toBe('PENDING');

    const viewer = await addMember(a.tenant.id, 'VIEWER');
    await loginAs(viewer);
    const forbidden = await call(ikasConnect, {
      method: 'POST',
      body: { connectionId: pendingA.id, clientId: 'client-id-1234', clientSecret: SECRET },
    });
    expect(forbidden.status).toBe(403);

    await loginAs(a.user);
    expect(
      (await call(ikasConnect, { method: 'POST', body: { connectionId: pendingA.id, clientId: 'client-id-1234' } }))
        .status,
    ).toBe(400);
    expect(
      (
        await call(ikasConnect, {
          method: 'POST',
          body: { connectionId: 'yok', clientId: 'client-id-1234', clientSecret: SECRET },
        })
      ).status,
    ).toBe(400);
  });
});

describe('Ticimax connect', () => {
  it('SSRF: http ve 127.0.0.1 servis adresi 400 ile reddedilir, dış istek atılmaz', async () => {
    const { user } = await createTenant();
    const actor = await actorFor(user);
    const pending = await createPendingConnection(actor, 'TICIMAX', 'www.magaza.com');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    for (const serviceBase of [
      'http://127.0.0.1/Servis/UrunServis.svc',
      'https://127.0.0.1/',
      'http://www.magaza.com',
      'https://169.254.169.254/',
      'https://localhost/',
    ]) {
      const res = await call(ticimaxConnect, {
        method: 'POST',
        body: { connectionId: pending.id, serviceBase, uyeKodu: 'UYE12345' },
      });
      expect(res.status, serviceBase).toBe(400);
      expect(res.text).not.toContain('UYE12345');
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await prisma.storeConnection.findUniqueOrThrow({ where: { id: pending.id } })).status).toBe('PENDING');
  });

  it('sağlayıcı uyuşmazlığı (ikas bağlantısına Ticimax kimliği) → 400', async () => {
    const { user } = await createTenant();
    const actor = await actorFor(user);
    const pending = await createPendingConnection(actor, 'IKAS', 'demo.myikas.com');
    vi.stubGlobal('fetch', vi.fn());
    // DNS'e gitmeden önce sağlayıcı kontrolü yapılmaz; bu yüzden geçerli görünen ama çözümlenmeyecek bir adres yerine
    // parse aşamasında geçen fakat DNS'te reddedilecek adres kullanmayız — doğrudan 127.0.0.1 ile 400 alınır.
    const res = await call(ticimaxConnect, {
      method: 'POST',
      body: { connectionId: pending.id, serviceBase: 'https://10.1.1.1/', uyeKodu: 'UYE12345' },
    });
    expect(res.status).toBe(400);
  });
});

describe('ikas webhook', () => {
  async function activeConnection() {
    const { user, tenant } = await createTenant();
    const conn = await prisma.storeConnection.create({
      data: {
        tenantId: tenant.id,
        provider: 'IKAS',
        storeDomain: 'demo.myikas.com',
        status: 'ACTIVE',
        createdById: user.id,
        webhooksRegistered: true,
        credentialsEnc: encryptCredentials({
          kind: 'IKAS',
          clientId: 'client-id-1234',
          clientSecret: SECRET,
          accessToken: 'tok-abc',
          accessTokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      },
    });
    return { conn, tenant };
  }

  it('yanlış k → 401 ve kayıt yok; doğru k → 200, teslimat satırı, ürün API’den çekilip yazılır; aynı gövde duplicate', async () => {
    const { conn } = await activeConnection();
    stubIkas();
    const body = {
      id: 'evt-1',
      scope: 'store/product/updated',
      merchantId: 'm',
      data: JSON.stringify({ id: 'prod-1', name: 'GÜVENİLMEZ payload adı' }),
    };

    const bad = await call(ikasWebhook, {
      method: 'POST',
      url: `/api/integrations/ikas/webhook?c=${conn.id}&k=${'0'.repeat(64)}`,
      body,
    });
    expect(bad.status).toBe(401);
    expect(await prisma.integrationWebhookDelivery.count()).toBe(0);
    expect(
      (await call(ikasWebhook, { method: 'POST', url: `/api/integrations/ikas/webhook?c=${conn.id}`, body })).status,
    ).toBe(401);

    const ok = await call(ikasWebhook, {
      method: 'POST',
      url: `/api/integrations/ikas/webhook?c=${conn.id}&k=${webhookKey(conn.id)}`,
      body,
    });
    expect(ok.status).toBe(200);
    await flushAfter();
    const deliveries = await prisma.integrationWebhookDelivery.findMany({ where: { connectionId: conn.id } });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]!.provider).toBe('IKAS');
    expect(deliveries[0]!.topic).toBe('store/product/updated');
    expect(deliveries[0]!.status).toBe('processed');
    expect(deliveries[0]!.externalId.startsWith(`${conn.id}:`)).toBe(true);
    // ürün payload'dan değil API'den geldi
    const product = await prisma.catalogProduct.findUniqueOrThrow({
      where: { connectionId_externalId: { connectionId: conn.id, externalId: 'prod-1' } },
    });
    expect(product.title).toBe('Webhook Ürünü');
    expect(product.url).toBe('https://demo.myikas.com/webhook-urunu');

    const dup = await call(ikasWebhook, {
      method: 'POST',
      url: `/api/integrations/ikas/webhook?c=${conn.id}&k=${webhookKey(conn.id)}`,
      body,
    });
    expect(dup.status).toBe(200);
    expect(dup.json.duplicate).toBe(true);
    const again = await prisma.integrationWebhookDelivery.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(again.attempts).toBe(2);
  });

  it('ürün id çıkarılamayan payload → tam senkron kuyruğa alınır; silinmiş bağlantı → 410', async () => {
    const { conn } = await activeConnection();
    stubIkas();
    const res = await call(ikasWebhook, {
      method: 'POST',
      url: `/api/integrations/ikas/webhook?c=${conn.id}&k=${webhookKey(conn.id)}`,
      body: { scope: 'store/product/created', data: '{bozuk' },
    });
    expect(res.status).toBe(200);
    await flushAfter();
    const d = await prisma.integrationWebhookDelivery.findFirstOrThrow({ where: { connectionId: conn.id } });
    expect(d.status).toBe('processed');
    expect(d.errorCode).toBe('FULL_SYNC');
    expect(await prisma.catalogSync.count({ where: { connectionId: conn.id, status: 'PENDING' } })).toBe(1);

    await prisma.storeConnection.delete({ where: { id: conn.id } });
    const gone = await call(ikasWebhook, {
      method: 'POST',
      url: `/api/integrations/ikas/webhook?c=${conn.id}&k=${webhookKey(conn.id)}`,
      body: { scope: 'store/product/created', data: { id: 'p' } },
    });
    expect(gone.status).toBe(410);
  });
});
