/**
 * İletişim formu doğrulaması — KVKK zorunlu/ayrı, İYS opsiyonel, telefon normalize, web sitesi → hostname,
 * honeypot, e-posta şablonu kaçırma. DB yok.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/prisma', () => ({ prisma: {} }));

import { ClientError } from '@/server/errors';
import { signReportToken } from '@/server/report-token';
import {
  contactEmailTemplate,
  esc,
  isHoneypotFilled,
  leadUtmOf,
  normalizePhone,
  validateContact,
} from '@/server/contact';

const base = {
  name: 'Ayşe Yılmaz',
  email: 'Ayse@Example.com',
  message: 'Merhaba, raporu birlikte değerlendirmek istiyorum.',
  kvkk: true,
};

describe('validateContact', () => {
  it('mutlu yol: e-posta küçültülür, site hostname olur, konu varsayılan satis, İYS false', () => {
    const v = validateContact({ ...base, website: 'https://Firma-Test.example/urunler?utm_source=x' });
    expect(v.email).toBe('ayse@example.com');
    expect(v.hostname).toBe('firma-test.example');
    expect(v.website).toBe('https://firma-test.example/urunler');
    expect(v.topic).toBe('satis');
    expect(v.iys).toBe(false);
    expect(v.kvkk).toBe(true);
    expect(v.phone).toBeNull();
    expect(v.utm).toBeNull();
  });

  it('KVKK işaretsiz → ClientError (diğer alanlar geçerliyken)', () => {
    expect(() => validateContact({ ...base, kvkk: false })).toThrow(ClientError);
    expect(() => validateContact({ ...base, kvkk: 'true' })).toThrow(/KVKK/);
    expect(() => validateContact({ ...base, kvkk: undefined })).toThrow(/KVKK/);
  });

  it('İYS tek başına KVKK yerine geçmez', () => {
    expect(() => validateContact({ ...base, kvkk: false, iys: true })).toThrow(/KVKK/);
  });

  it.each([
    ['ad kısa', { ...base, name: 'A' }, /Ad soyad/],
    ['ad uzun', { ...base, name: 'x'.repeat(81) }, /Ad soyad/],
    ['e-posta bozuk', { ...base, email: 'ayse@' }, /e-posta/],
    ['e-posta boş', { ...base, email: '' }, /e-posta/],
    ['mesaj boş', { ...base, message: '   ' }, /Mesaj/],
    ['mesaj uzun', { ...base, message: 'm'.repeat(2001) }, /2000/],
    ['konu geçersiz', { ...base, topic: 'reklam' }, /Konu/],
    ['site geçersiz (SSRF)', { ...base, website: 'http://127.0.0.1/' }, /Web sitesi/],
    ['site geçersiz (tek etiket)', { ...base, website: 'localhost' }, /Web sitesi/],
    ['telefon geçersiz', { ...base, phone: '12' }, /Telefon/],
    ['şirket uzun', { ...base, company: 'ş'.repeat(121) }, /Şirket/],
    ['gövde yok', null, /geçersiz/],
  ])('%s → 400', (_label, body, re) => {
    expect(() => validateContact(body)).toThrow(re);
    expect(() => validateContact(body)).toThrow(ClientError);
  });

  it('src/sektor/token/utm: yalnız geçerli değerler taşınır', () => {
    const token = signReportToken('cm1abc2def3ghi4jkl5mno6p');
    const v = validateContact({
      ...base,
      src: 'Rapor',
      sektor: 'klinik',
      token,
      utm_source: 'linkedin',
      utm_medium: 'post',
      utm_campaign: 'eylul',
    });
    expect(v.src).toBe('rapor');
    expect(v.sector).toBe('klinik');
    expect(v.reportToken).toBe(token);
    expect(v.utm).toEqual({ source: 'linkedin', medium: 'post', campaign: 'eylul' });
    expect(leadUtmOf(v)).toEqual({
      src: 'rapor',
      sektor: 'klinik',
      token,
      source: 'linkedin',
      medium: 'post',
      campaign: 'eylul',
    });
  });

  it('geçersiz src/sektor/token sessizce atılır', () => {
    const v = validateContact({ ...base, src: 'bad src!', sektor: 'olmayan', token: 'kurcalanmış-token-123' });
    expect(v.src).toBeNull();
    expect(v.sector).toBeNull();
    expect(v.reportToken).toBeNull();
    expect(leadUtmOf(v)).toBeNull();
  });

  it('fazla alanlar yok sayılır; kvkk true ile iys true ayrı okunur', () => {
    const v = validateContact({ ...base, iys: true, isSuperAdmin: true, tenantId: 'x' });
    expect(v.iys).toBe(true);
    expect((v as unknown as Record<string, unknown>).isSuperAdmin).toBeUndefined();
  });
});

describe('normalizePhone', () => {
  it.each([
    ['0532 000 00 00', '+905320000000'],
    ['05320000000', '+905320000000'],
    ['532 000 00 00', '+905320000000'],
    ['+90 532 000 00 00', '+905320000000'],
    ['90 532 000 00 00', '+905320000000'],
    ['0090 532 000 00 00', '+905320000000'],
    ['+44 20 7946 0958', '+442079460958'],
    ['', null],
    ['   ', null],
    [undefined, null],
  ])('%s → %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });
  it('7 haneden az / 15 haneden çok → 400', () => {
    expect(() => normalizePhone('12345')).toThrow(ClientError);
    expect(() => normalizePhone('1'.repeat(16))).toThrow(ClientError);
  });
});

describe('honeypot', () => {
  it.each([
    [{ website_confirm: 'http://spam.example' }, true],
    [{ website_confirm: '  x ' }, true],
    [{ website_confirm: '' }, false],
    [{ website_confirm: '   ' }, false],
    [{}, false],
    [null, false],
  ])('%j → %s', (body, expected) => {
    expect(isHoneypotFilled(body)).toBe(expected);
  });
});

describe('e-posta şablonu', () => {
  it('esc her özel karakteri kaçırır', () => {
    expect(esc(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;',
    );
    expect(esc(null)).toBe('');
  });
  it('HTML gövdesinde kullanıcı girdisi ham geçmez; konu ve alanlar var; kullanıcıya kopya yok', () => {
    const v = validateContact({
      ...base,
      name: '<script>alert(1)</script>',
      company: 'Firma & Ortakları',
      website: 'firma.example',
      topic: 'ajans',
      iys: false,
      message: 'Satır 1\n<b>kalın</b>',
    });
    const tpl = contactEmailTemplate(v, {
      leadId: 'lead_1',
      reportUrl: 'https://x/rapor/t',
      adminLeadPath: '/admin/leads/lead_1',
    });
    expect(tpl.subject).toBe('Yeni lead: Firma & Ortakları · Yanıt Agency (uygulama hizmeti)');
    expect(tpl.html).not.toContain('<script>');
    expect(tpl.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(tpl.html).not.toContain('<b>kalın</b>');
    expect(tpl.html).toContain('Firma &amp; Ortakları');
    expect(tpl.html).toContain('https://x/rapor/t');
    expect(tpl.html).toContain('/admin/leads/lead_1');
    expect(tpl.html).toContain('yalnız bu talebe yanıt verin');
    expect(tpl.text).toContain('E-posta: ayse@example.com');
    expect(tpl.text).not.toMatch(/\d+ saat içinde|24 saat/);
  });
  it('şirket yoksa hostname, o da yoksa ad konuya girer', () => {
    const a = validateContact({ ...base, website: 'firma.example' });
    expect(contactEmailTemplate(a, { leadId: 'l' }).subject).toContain('Yeni lead: firma.example');
    const b = validateContact(base);
    expect(contactEmailTemplate(b, { leadId: 'l' }).subject).toContain('Yeni lead: Ayşe Yılmaz');
  });
});
