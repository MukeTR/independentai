/**
 * Lead paneli — admin tarafı yardımcıları (durum aksiyonları, e-posta maskeleme, CSV).
 *
 * KVKK: e-posta/telefon listelerde maskeli döner; tam değer yalnız `?reveal=1` ile ve `admin.lead_reveal_email`
 * audit satırıyla. CSV'de e-posta yalnız `consentAt` dolu satırlarda yazılır. Bu dosya `@independentai/ai` import ETMEZ.
 */
import type { LeadSource, LeadStatus, Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { ClientError } from './errors';
import { maskEmail } from './logger';
import { LEAD_SOURCE_LABELS, LEAD_STATUS_LABELS, logLeadActivity, type LeadActivity } from './leads';

export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'] as const satisfies readonly LeadStatus[];
export const LEAD_SOURCES = [
  'TOOL',
  'CONTACT',
  'ONBOARDING',
  'RANK_CHECK',
  'ADMIN',
] as const satisfies readonly LeadSource[];

export function isLeadStatus(x: unknown): x is LeadStatus {
  return typeof x === 'string' && (LEAD_STATUSES as readonly string[]).includes(x);
}
export function isLeadSource(x: unknown): x is LeadSource {
  return typeof x === 'string' && (LEAD_SOURCES as readonly string[]).includes(x);
}

/** LeadCard aksiyon düğmeleri → aktivite anahtarı + (varsa) yeni durum. Kârmatik STAGES/logLead deseni. */
export const LEAD_ACTIONS = {
  called: { label: 'Arandı', status: 'CONTACTED' },
  emailed: { label: 'Mail atıldı', status: 'CONTACTED' },
  proposal: { label: 'Teklif iletildi', status: 'QUALIFIED' },
  won: { label: 'Kazanıldı', status: 'WON' },
  lost: { label: 'Kaybedildi', status: 'LOST' },
  reopen: { label: 'Yeniden açıldı', status: 'NEW' },
  note: { label: 'Not', status: null },
  owner: { label: 'Sahip atandı', status: null },
} as const satisfies Record<string, { label: string; status: LeadStatus | null }>;

export type LeadActionKey = keyof typeof LEAD_ACTIONS;

export function isLeadAction(x: unknown): x is LeadActionKey {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(LEAD_ACTIONS, x);
}

/** Aktivite satırı etiketi (status:X ve aksiyon anahtarları için Türkçe). */
export function activityLabel(action: string): string {
  if (isLeadAction(action)) return LEAD_ACTIONS[action].label;
  if (action.startsWith('status:')) {
    const s = action.slice(7);
    return isLeadStatus(s) ? `Durum: ${LEAD_STATUS_LABELS[s]}` : action;
  }
  if (action === 'contact') return 'Form dolduruldu';
  if (action === 'rescan') return 'Tekrar tarama';
  return action;
}

export type LeadPatchInput = {
  action?: LeadActionKey;
  status?: LeadStatus;
  note?: string;
  ownerUserId?: string | null;
  notes?: string | null;
};

/** PATCH gövdesini doğrular; en az bir alan şart. */
export function parseLeadPatch(body: unknown): LeadPatchInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ClientError('Geçersiz gövde');
  const b = body as Record<string, unknown>;
  const out: LeadPatchInput = {};
  if (b.action !== undefined) {
    if (!isLeadAction(b.action)) throw new ClientError('Geçersiz aksiyon');
    out.action = b.action;
  }
  if (b.status !== undefined) {
    if (!isLeadStatus(b.status)) throw new ClientError('Geçersiz durum (NEW, CONTACTED, QUALIFIED, WON, LOST)');
    out.status = b.status;
  }
  if (b.note !== undefined) {
    if (typeof b.note !== 'string') throw new ClientError('Not metin olmalı');
    const note = b.note.trim();
    if (note.length > 2000) throw new ClientError('Not en fazla 2000 karakter olabilir');
    if (note) out.note = note;
  }
  if (b.ownerUserId !== undefined) {
    if (b.ownerUserId !== null && (typeof b.ownerUserId !== 'string' || !/^[A-Za-z0-9_-]{5,64}$/.test(b.ownerUserId)))
      throw new ClientError('Geçersiz sahip');
    out.ownerUserId = b.ownerUserId;
  }
  if (b.notes !== undefined) {
    if (b.notes !== null && typeof b.notes !== 'string') throw new ClientError('Notlar metin olmalı');
    if (typeof b.notes === 'string' && b.notes.length > 5000) throw new ClientError('Notlar en fazla 5000 karakter');
    out.notes = b.notes;
  }
  if (out.action === 'note' && !out.note) throw new ClientError('Not boş olamaz');
  if (Object.keys(out).length === 0) throw new ClientError('Güncellenecek alan yok');
  return out;
}

/**
 * Aksiyonu uygular: durum geçişi + activity.push({at, action, status?, note, byUserId}) (sıra korunur).
 * `action`: aksiyon anahtarı (called/emailed/…) ya da doğrudan durumda `status:<DURUM>`; durum değişen her satırda
 * ayrıca `status` alanı yazılır (durum geçmişi bu alandan türetilir — bkz. docs/ADMIN.md).
 * Sahip verildiyse kullanıcının varlığı doğrulanır (yoksa 400). Lead yoksa false.
 */
export async function applyLeadPatch(id: string, input: LeadPatchInput, byUserId: string): Promise<boolean> {
  const exists = await prisma.lead.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return false;
  if (typeof input.ownerUserId === 'string') {
    const owner = await prisma.user.findUnique({ where: { id: input.ownerUserId }, select: { id: true } });
    if (!owner) throw new ClientError('Sahip olarak atanacak kullanıcı bulunamadı');
  }
  const nextStatus: LeadStatus | undefined =
    input.status ?? (input.action ? (LEAD_ACTIONS[input.action].status ?? undefined) : undefined);
  const actionKey =
    input.action ??
    (nextStatus ? `status:${nextStatus}` : input.ownerUserId !== undefined ? 'owner' : input.note ? 'note' : 'update');
  const entry: { action: string; status?: LeadStatus; note?: string; byUserId: string } = {
    action: actionKey,
    ...(nextStatus ? { status: nextStatus } : {}),
    ...(input.note ? { note: input.note } : {}),
    byUserId,
  };
  await logLeadActivity(id, entry, {
    ...(nextStatus ? { status: nextStatus } : {}),
    ...(input.ownerUserId !== undefined ? { ownerUserId: input.ownerUserId } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  });
  return true;
}

/** Telefon maskesi: son 2 hane açık. */
export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `${'*'.repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`;
}

export const LEAD_DETAIL_SELECT = {
  id: true,
  hostname: true,
  status: true,
  source: true,
  scanCount: true,
  lastScore: true,
  bestScore: true,
  kinds: true,
  platform: true,
  sector: true,
  tenantId: true,
  ownerUserId: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  company: true,
  message: true,
  topic: true,
  consentAt: true,
  iysConsentAt: true,
  utm: true,
  lastReportToken: true,
  notes: true,
  activity: true,
  firstSeenAt: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LeadSelect;

export type LeadDetailRow = Prisma.LeadGetPayload<{ select: typeof LEAD_DETAIL_SELECT }>;

export type LeadDetailDto = Omit<LeadDetailRow, 'activity' | 'utm'> & {
  activity: LeadActivity[];
  utm: Record<string, unknown> | null;
  /** E-posta/telefon maskeli mi (reveal olmadan true) */
  masked: boolean;
};

/** Detay DTO: varsayılan maskeli; `reveal` ile tam e-posta/telefon (çağıran audit yazar). */
export function toLeadDetailDto(row: LeadDetailRow, opts: { reveal?: boolean } = {}): LeadDetailDto {
  const reveal = !!opts.reveal;
  return {
    ...row,
    contactEmail: reveal ? row.contactEmail : maskEmail(row.contactEmail),
    contactPhone: reveal ? row.contactPhone : maskPhone(row.contactPhone),
    activity: Array.isArray(row.activity) ? (row.activity as LeadActivity[]) : [],
    utm:
      row.utm && typeof row.utm === 'object' && !Array.isArray(row.utm) ? (row.utm as Record<string, unknown>) : null,
    masked: !reveal,
  };
}

// ── CSV ──

const CSV_COLUMNS = [
  'id',
  'hostname',
  'status',
  'statusLabel',
  'source',
  'sourceLabel',
  'scanCount',
  'lastScore',
  'bestScore',
  'platform',
  'sector',
  'contactName',
  'contactEmail',
  'company',
  'topic',
  'consentAt',
  'firstSeenAt',
  'lastSeenAt',
] as const;

/** Hücre: tırnaklama + formül enjeksiyonu koruması (=, +, -, @ ile başlayanlara ' öneki). */
export function csvCell(v: unknown): string {
  if (v == null) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type LeadCsvRow = {
  id: string;
  hostname: string | null;
  status: LeadStatus;
  source: LeadSource;
  scanCount: number;
  lastScore: number | null;
  bestScore: number | null;
  platform: string | null;
  sector: string | null;
  contactName: string | null;
  contactEmail: string | null;
  company: string | null;
  topic: string | null;
  consentAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
};

const BOM = String.fromCharCode(0xfeff);

/** UTF-8 BOM + başlık + satırlar; e-posta yalnız consentAt dolu satırlarda. */
export function leadsToCsv(rows: LeadCsvRow[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const r of rows) {
    const cells: Record<(typeof CSV_COLUMNS)[number], unknown> = {
      id: r.id,
      hostname: r.hostname,
      status: r.status,
      statusLabel: LEAD_STATUS_LABELS[r.status],
      source: r.source,
      sourceLabel: LEAD_SOURCE_LABELS[r.source],
      scanCount: r.scanCount,
      lastScore: r.lastScore,
      bestScore: r.bestScore,
      platform: r.platform,
      sector: r.sector,
      contactName: r.consentAt ? r.contactName : null,
      contactEmail: r.consentAt ? r.contactEmail : null,
      company: r.company,
      topic: r.topic,
      consentAt: r.consentAt,
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
    };
    lines.push(CSV_COLUMNS.map((c) => csvCell(cells[c])).join(','));
  }
  return `${BOM}${lines.join('\r\n')}\r\n`;
}
