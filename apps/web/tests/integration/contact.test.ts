/**
 * POST /api/contact — mutlu yol (Lead + NotificationLog + AuditLog + satış e-postası), KVKK yok 400,
 * honeypot 200 sessiz, 6. istek 429, yasaklı web sitesi 200 {blocked} ve Lead yok, SALES_EMAIL yoksa
 * NotificationLog skipped, mevcut araç lead'iyle birleşme, e-posta ile tekilleştirme, geçersiz gövdeler.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { call, prisma } from './helpers';
import { POST as contact } from '@/app/api/contact/route';
import { drainOutbox } from '@/server/mailer';
import { clearBlocklistCache } from '@/server/blocklist';
import { signReportToken } from '@/server/report-token';

const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const BASE = {
  name: 'Ayşe Yılmaz',
  email: 'ayse@example.com',
  message: 'Merhaba, raporu birlikte değerlendirmek istiyorum.',
  kvkk: true,
};

let ipSeq = 20;
const nextIp = () => `198.51.100.${(ipSeq += 1)}`;

function post(body: unknown, ip = nextIp()) {
  return call(contact, { method: 'POST', body, headers: { 'x-forwarded-for': ip } });
}

beforeEach(() => {
  drainOutbox();
  clearBlocklistCache();
  process.env.SALES_EMAIL = 'satis@test.local';
});

describe('POST /api/contact', () => {
  it('mutlu yol: 201, Lead (CONTACT, consentAt, iysConsentAt, utm, token), NotificationLog, satış e-postası, audit', async () => {
    const token = signReportToken('cm1abc2def3ghi4jkl5mno6p');
    const r = await post({
      ...BASE,
      phone: '0532 000 00 00',
      company: 'Firma Test A.Ş.',
      website: 'https://Firma-Test.example/',
      topic: 'ajans',
      iys: true,
      src: 'rapor',
      sektor: 'klinik',
      token,
      utm_source: 'whatsapp',
    });
    expect(r.status).toBe(201);
    expect((r.json as { ok?: boolean }).ok).toBe(true);
    expect(r.text).not.toMatch(/passwordHash|secret|sk-|visitorHash|leadId/i);

    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'firma-test.example' } });
    expect(lead.source).toBe('CONTACT');
    expect(lead.contactName).toBe('Ayşe Yılmaz');
    expect(lead.contactEmail).toBe('ayse@example.com');
    expect(lead.contactPhone).toBe('+905320000000');
    expect(lead.company).toBe('Firma Test A.Ş.');
    expect(lead.topic).toBe('ajans');
    expect(lead.sector).toBe('klinik');
    expect(lead.consentAt).not.toBeNull();
    expect(lead.iysConsentAt).not.toBeNull();
    expect(lead.lastReportToken).toBe(token);
    expect(lead.utm).toEqual({ src: 'rapor', sektor: 'klinik', token, source: 'whatsapp' });
    const activity = lead.activity as { action: string }[];
    expect(activity.some((a) => a.action === 'contact')).toBe(true);

    const logs = await prisma.notificationLog.findMany({ where: { kind: 'contact' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.channel).toBe('email');
    expect(logs[0]!.status).toBe('sent');
    expect(logs[0]!.recipient).not.toBe('satis@test.local'); // maskelenmiş alıcı

    const out = drainOutbox();
    expect(out).toHaveLength(1);
    expect(out[0]!.to).toBe('satis@test.local');
    expect(out[0]!.subject).toBe('Yeni lead: Firma Test A.Ş. · Yanıt Agency (uygulama hizmeti)');
    expect(out[0]!.body).toContain('/rapor/');
    expect(out[0]!.body).toContain('/admin/leads/');
    expect(out[0]!.kind).toBe('contact');
    // Kullanıcıya kopya gitmez
    expect(out.some((m) => m.to === 'ayse@example.com')).toBe(false);

    const audits = await prisma.auditLog.findMany({ where: { action: 'contact.submitted' } });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.targetId).toBe(lead.id);
    expect((audits[0]!.meta as { topic?: string }).topic).toBe('ajans');
  });

  it('KVKK işaretsiz → 400, Lead yazılmaz, e-posta gitmez', async () => {
    const r = await post({ ...BASE, kvkk: false, website: 'kvkk-yok.example' });
    expect(r.status).toBe(400);
    expect((r.json as { message?: string }).message).toMatch(/KVKK/);
    expect(await prisma.lead.count()).toBe(0);
    expect(drainOutbox()).toHaveLength(0);
    expect(await prisma.notificationLog.count({ where: { kind: 'contact' } })).toBe(0);
  });

  it('İYS işaretli ama KVKK işaretsiz → yine 400 (kutular ayrı)', async () => {
    const r = await post({ ...BASE, kvkk: false, iys: true });
    expect(r.status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it('honeypot dolu → 200 sessiz; Lead/NotificationLog/audit yok', async () => {
    const r = await post({ ...BASE, website_confirm: 'http://spam.example' });
    expect(r.status).toBe(200);
    expect((r.json as { ok?: boolean }).ok).toBe(true);
    expect(await prisma.lead.count()).toBe(0);
    expect(await prisma.notificationLog.count()).toBe(0);
    expect(await prisma.auditLog.count({ where: { action: 'contact.submitted' } })).toBe(0);
    expect(drainOutbox()).toHaveLength(0);
  });

  it('aynı IP’den 6. istek 429 + Retry-After', async () => {
    const ip = nextIp();
    for (let i = 0; i < 5; i += 1) {
      const r = await post({ ...BASE, email: `kisi${i}@example.com` }, ip);
      expect(r.status).toBe(201);
    }
    const last = await post({ ...BASE, email: 'kisi6@example.com' }, ip);
    expect(last.status).toBe(429);
    expect(Number(last.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(await prisma.lead.count()).toBe(5);
  });

  it('yasaklı web sitesi → 200 {blocked, redirectUrl}; Lead yok, e-posta yok, hits++', async () => {
    const row = await prisma.blockedSite.create({ data: { hostname: 'yasakli.example', redirectUrl: YT } });
    const r = await post({ ...BASE, website: 'https://www.Yasakli.example/iletisim' });
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ blocked: true, redirectUrl: YT });
    expect(await prisma.lead.count()).toBe(0);
    expect(drainOutbox()).toHaveLength(0);
    expect(await prisma.auditLog.count({ where: { action: 'contact.submitted' } })).toBe(0);
    const after = await prisma.blockedSite.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.hits).toBe(1);
  });

  it('alt alan adı da yasaklıdır (shop.yasakli.example)', async () => {
    await prisma.blockedSite.create({ data: { hostname: 'yasakli.example', redirectUrl: YT } });
    const r = await post({ ...BASE, website: 'shop.yasakli.example' });
    expect(r.status).toBe(200);
    expect((r.json as { blocked?: boolean }).blocked).toBe(true);
    expect(await prisma.lead.count()).toBe(0);
  });

  it('SALES_EMAIL yoksa NotificationLog {kind:contact, status:skipped}; Lead yine yazılır', async () => {
    process.env.SALES_EMAIL = '';
    const r = await post(BASE);
    expect(r.status).toBe(201);
    const logs = await prisma.notificationLog.findMany({ where: { kind: 'contact' } });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.status).toBe('skipped');
    expect(logs[0]!.error).toMatch(/SALES_EMAIL/);
    expect(drainOutbox()).toHaveLength(0);
    expect(await prisma.lead.count({ where: { contactEmail: 'ayse@example.com' } })).toBe(1);
  });

  it('araç taramasından gelen mevcut lead CONTACT ile birleşir (scanCount korunur, id aynı)', async () => {
    const existing = await prisma.lead.create({
      data: {
        hostname: 'eski.example',
        scanCount: 2,
        lastScore: 40,
        bestScore: 40,
        kinds: ['CRAWLER'],
        source: 'TOOL',
      },
    });
    const r = await post({ ...BASE, website: 'eski.example' });
    expect(r.status).toBe(201);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { hostname: 'eski.example' } });
    expect(lead.id).toBe(existing.id);
    expect(lead.source).toBe('CONTACT');
    expect(lead.scanCount).toBe(2);
    expect(lead.kinds).toEqual(['CRAWLER']);
    expect(lead.contactEmail).toBe('ayse@example.com');
    expect(lead.consentAt).not.toBeNull();
    expect(await prisma.lead.count()).toBe(1);
  });

  it('web sitesi yoksa e-posta ile tekilleştirilir; ikinci mesaj aynı lead', async () => {
    const a = await post({ ...BASE, message: 'İlk mesaj' });
    const b = await post({ ...BASE, email: 'AYSE@example.com', message: 'İkinci mesaj' });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const leads = await prisma.lead.findMany({ where: { contactEmail: 'ayse@example.com' } });
    expect(leads).toHaveLength(1);
    expect(leads[0]!.hostname).toBeNull();
    expect(leads[0]!.message).toBe('İkinci mesaj');
    const activity = leads[0]!.activity as { action: string }[];
    expect(activity.filter((x) => x.action === 'contact')).toHaveLength(2);
  });

  it.each([
    ['e-posta bozuk', { ...BASE, email: 'ayse@' }],
    ['mesaj 2001 karakter', { ...BASE, message: 'm'.repeat(2001) }],
    ['web sitesi SSRF (127.0.0.1)', { ...BASE, website: 'http://127.0.0.1/' }],
    ['konu geçersiz', { ...BASE, topic: 'reklam' }],
  ])('%s → 400, Lead yok', async (_label, body) => {
    const r = await post(body);
    expect(r.status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it('gövde 16 KB’ı aşarsa 400', async () => {
    const r = await post({ ...BASE, message: 'x'.repeat(1900), company: 'y'.repeat(100), extra: 'z'.repeat(17_000) });
    expect(r.status).toBe(400);
    expect(await prisma.lead.count()).toBe(0);
  });

  it('geçersiz JSON → 400', async () => {
    const r = await call(contact, {
      method: 'POST',
      headers: { 'x-forwarded-for': nextIp(), 'content-type': 'application/json' },
      body: undefined,
    });
    expect(r.status).toBe(400);
  });
});
