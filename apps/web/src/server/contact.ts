/**
 * İletişim formu — doğrulama + satış e-postası şablonu.
 *
 *  - Doğrulama hataları `ClientError` (400, Türkçe, tam cümle). KVKK aydınlatma onayı ZORUNLU ve ayrı;
 *    İYS ticari ileti izni AYRI ve opsiyonel (tek "kabul ediyorum" kutusu yok — D.3).
 *  - Honeypot: `website_confirm` doluysa çağıran 200 ile sessizce döner (bu dosya yalnız tespit eder).
 *  - Web sitesi `normalizeScanUrl` ile hostname'e indirgenir (Lead anahtarı); geçersizse 400, tarama yapılmaz.
 *  - E-posta şablonu her alanı `esc()` ile kaçırır; lead verisi hiçbir LLM'e gitmez (leads.ts sözleşmesi).
 *  - Kullanıcıya otomatik e-posta YOK; süre taahhüdü YOK.
 */
import { ClientError } from './errors';
import { normalizeScanUrl } from './commerce/public-scan';
import { verifyReportToken } from './report-token';
import { isSectorSlug, type SectorSlug } from '@/lib/tool-registry';

export const CONTACT_TOPICS = ['satis', 'ajans', 'destek', 'basin', 'ortaklik'] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_TOPIC_LABELS: Record<ContactTopic, string> = {
  satis: 'Satış görüşmesi',
  ajans: 'Yanıt Agency (uygulama hizmeti)',
  destek: 'Destek ve sorular',
  basin: 'Basın ve medya',
  ortaklik: 'Ajans ortaklığı',
};

export function isContactTopic(x: unknown): x is ContactTopic {
  return typeof x === 'string' && (CONTACT_TOPICS as readonly string[]).includes(x);
}

export const CONTACT_LIMITS = {
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  companyMax: 120,
  messageMax: 2000,
  srcMax: 40,
  utmMax: 100,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SRC_RE = /^[a-z0-9_-]{1,40}$/i;

export type ContactInput = {
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  hostname: string | null;
  topic: ContactTopic;
  message: string;
  kvkk: true;
  iys: boolean;
  src: string | null;
  sector: SectorSlug | null;
  reportToken: string | null;
  utm: { source?: string; medium?: string; campaign?: string } | null;
};

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function optional(v: unknown, max: number, label: string): string | null {
  const s = str(v);
  if (!s) return null;
  if (s.length > max) throw new ClientError(`${label} en fazla ${max} karakter olabilir`);
  return s;
}

/** Honeypot: gerçek kullanıcı görmez; bot doldurur. Doluysa true. */
export function isHoneypotFilled(body: unknown): boolean {
  if (!body || typeof body !== 'object') return false;
  const v = (body as Record<string, unknown>).website_confirm;
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Telefon normalize: yalnız rakamlar; 0 ile başlayan 11 hane ve 10 hane → +90; "00" → "+"; "+" korunur.
 * 7–15 hane dışı → 400. Boş → null.
 */
export function normalizePhone(raw: unknown): string | null {
  const s = str(raw);
  if (!s) return null;
  const plus = s.startsWith('+');
  let digits = s.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (!/^\d{7,15}$/.test(digits)) throw new ClientError('Telefon numarası geçersiz görünüyor; örn. 0532 000 00 00');
  if (plus || digits.startsWith('90')) {
    if (digits.startsWith('90') && digits.length === 12) return `+${digits}`;
    if (plus) return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) return `+90${digits.slice(1)}`;
  if (digits.length === 10) return `+90${digits}`;
  return `+${digits}`;
}

/** Form gövdesini doğrular; geçersizde ClientError. Fazla alanlar yok sayılır. */
export function validateContact(body: unknown): ContactInput {
  if (!body || typeof body !== 'object') throw new ClientError('İstek gövdesi geçersiz');
  const b = body as Record<string, unknown>;

  const name = str(b.name);
  if (name.length < CONTACT_LIMITS.nameMin || name.length > CONTACT_LIMITS.nameMax)
    throw new ClientError(`Ad soyad ${CONTACT_LIMITS.nameMin}–${CONTACT_LIMITS.nameMax} karakter olmalı`);

  const email = str(b.email).toLowerCase();
  if (!email || email.length > CONTACT_LIMITS.emailMax || !EMAIL_RE.test(email))
    throw new ClientError('Geçerli bir e-posta adresi yazın');

  const phone = normalizePhone(b.phone);
  const company = optional(b.company, CONTACT_LIMITS.companyMax, 'Şirket adı');

  let website: string | null = null;
  let hostname: string | null = null;
  const rawSite = str(b.website);
  if (rawSite) {
    try {
      const n = normalizeScanUrl(rawSite);
      website = n.url;
      hostname = n.hostname;
    } catch {
      throw new ClientError('Web sitesi adresi geçersiz görünüyor; örn. firma.com');
    }
  }

  const topicRaw = str(b.topic) || 'satis';
  if (!isContactTopic(topicRaw)) throw new ClientError('Konu geçersiz');

  const message = str(b.message);
  if (!message) throw new ClientError('Mesajınızı yazın');
  if (message.length > CONTACT_LIMITS.messageMax)
    throw new ClientError(`Mesaj en fazla ${CONTACT_LIMITS.messageMax} karakter olabilir`);

  if (b.kvkk !== true)
    throw new ClientError('Devam etmek için KVKK aydınlatma metnini okuduğunuzu onaylamanız gerekir');
  const iys = b.iys === true;

  const srcRaw = str(b.src);
  const src = srcRaw && SRC_RE.test(srcRaw) ? srcRaw.toLowerCase() : null;
  const sektor = str(b.sektor);
  const sector = isSectorSlug(sektor) ? sektor : null;
  const tokenRaw = str(b.token);
  const reportToken = tokenRaw && verifyReportToken(tokenRaw) ? tokenRaw : null;

  const utm: NonNullable<ContactInput['utm']> = {};
  const us = optional(b.utm_source, CONTACT_LIMITS.utmMax, 'utm_source');
  const um = optional(b.utm_medium, CONTACT_LIMITS.utmMax, 'utm_medium');
  const uc = optional(b.utm_campaign, CONTACT_LIMITS.utmMax, 'utm_campaign');
  if (us) utm.source = us;
  if (um) utm.medium = um;
  if (uc) utm.campaign = uc;

  return {
    name,
    email,
    phone,
    company,
    website,
    hostname,
    topic: topicRaw,
    message,
    kvkk: true,
    iys,
    src,
    sector,
    reportToken,
    utm: Object.keys(utm).length ? utm : null,
  };
}

/** Lead.utm alanı: src/sektor/token + utm_* tek nesnede (admin "kaynak" görünümü). */
export function leadUtmOf(input: ContactInput): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  if (input.src) out.src = input.src;
  if (input.sector) out.sektor = input.sector;
  if (input.reportToken) out.token = input.reportToken;
  if (input.utm?.source) out.source = input.utm.source;
  if (input.utm?.medium) out.medium = input.utm.medium;
  if (input.utm?.campaign) out.campaign = input.utm.campaign;
  return Object.keys(out).length ? out : null;
}

/** HTML kaçırma — şablona giren her kullanıcı değeri buradan geçer. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Satış ekibine giden bildirim; alıcı SALES_EMAIL. Kullanıcıya kopya gitmez. */
export function contactEmailTemplate(
  input: ContactInput,
  ctx: { leadId: string; reportUrl?: string | null; adminLeadPath?: string | null },
): { subject: string; html: string; text: string } {
  const who = input.company ?? input.hostname ?? input.name;
  const subject = `Yeni lead: ${who} · ${CONTACT_TOPIC_LABELS[input.topic]}`;
  const rows: [string, string | null][] = [
    ['Ad soyad', input.name],
    ['E-posta', input.email],
    ['Telefon', input.phone],
    ['Şirket', input.company],
    ['Web sitesi', input.website],
    ['Konu', CONTACT_TOPIC_LABELS[input.topic]],
    ['Kaynak', input.src],
    ['Sektör', input.sector],
    ['Rapor', ctx.reportUrl ?? null],
    ['İYS izni', input.iys ? 'Evet (ticari ileti gönderilebilir)' : 'Hayır — yalnız bu talebe yanıt verin'],
    ['Lead', ctx.adminLeadPath ?? ctx.leadId],
  ];
  const trs = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 10px 4px 0;color:#9A968B;white-space:nowrap">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`,
    )
    .join('');
  const html = `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#14110D;line-height:1.6">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9A968B;margin-bottom:8px">Yanıt · iletişim formu</div>
    <h2 style="font-size:20px;margin:0 0 12px">${esc(subject)}</h2>
    <table style="font-size:14px;border-collapse:collapse">${trs}</table>
    <div style="font-size:14px;margin-top:16px;padding:12px;background:#F7F5EF;border-radius:8px;white-space:pre-wrap">${esc(input.message)}</div>
    <p style="font-size:12px;color:#9A968B;margin-top:20px">KVKK onayı alındı. Bu içerik yapay zekâ servislerine gönderilmez; yanıtı kendiniz yazın.</p>
  </div>`;
  const text = [
    subject,
    ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    '',
    input.message,
    '',
    'KVKK onayı alındı. Bu içerik yapay zekâ servislerine gönderilmez.',
  ].join('\n');
  return { subject, html, text };
}
