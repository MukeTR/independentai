/**
 * Lead deposu — araç taramaları (yalnız hostname + skor; PII yok) ve iletişim formu (PII, yalnız consentAt ile).
 *
 * SÖZLEŞME: Bu dosya `@independentai/ai` import ETMEZ ve lead verisi hiçbir LLM çağrısına gitmez
 * (tests/unit/leads-no-llm.test.ts kaynak grep'iyle doğrulanır). Yazma hataları çağıranı durdurmaz (try/catch dışarıda).
 */
import type { AuditKind, LeadSource, LeadStatus, Prisma } from '@independentai/db';
import { prisma } from './prisma';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Yeni',
  CONTACTED: 'İletişime geçildi',
  QUALIFIED: 'Nitelikli',
  WON: 'Kazanıldı',
  LOST: 'Kaybedildi',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  TOOL: 'Araç',
  CONTACT: 'İletişim formu',
  ONBOARDING: 'Kayıt',
  RANK_CHECK: 'Rank checker',
  ADMIN: 'Elle',
};

export type LeadActivity = { at: string; action: string; note?: string; byUserId?: string };

function activityOf(raw: unknown): LeadActivity[] {
  return Array.isArray(raw) ? (raw as LeadActivity[]) : [];
}

function pushActivity(raw: unknown, entry: Omit<LeadActivity, 'at'>): Prisma.InputJsonValue {
  const list = activityOf(raw);
  list.push({ at: new Date().toISOString(), ...entry });
  return list.slice(-100) as unknown as Prisma.InputJsonValue;
}

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002';
}

export type ScanLeadInput = {
  hostname: string;
  kind: AuditKind;
  score?: number | null;
  platform?: string | null;
  sector?: string | null;
  tenantId?: string | null;
  reportToken?: string | null;
  source?: LeadSource;
};

/**
 * Tarama → lead: scanCount atomik `{increment:1}`, lastScore, bestScore yalnız büyükse (koşullu updateMany),
 * kinds birleşimi koşullu updateMany (`NOT kinds has kind` → `push`; koşul DB'de — eşzamanlı ilk taramalar çift
 * kayıt üretmez), 3+ taramada "Tekrar tarama ×N" aktivitesi. Platform/sektör/tenant yalnız verildiğinde güncellenir
 * (boşla ezilmez). Sayaç/skor/kinds için okuma-yazma yarışı yok; `activity` JSON'u okuma-yazma ile eklenir — eşzamanlı
 * iki tekrar taramada bir "rescan" satırı kaybolabilir, kabul edilebilir (bilgi amaçlı günlük, sayaç değil).
 */
export async function upsertLeadFromScan(input: ScanLeadInput): Promise<{ id: string; scanCount: number }> {
  const hostname = input.hostname.toLowerCase();
  const score = typeof input.score === 'number' && Number.isFinite(input.score) ? Math.round(input.score) : null;
  const now = new Date();

  const update = async () => {
    const cur = await prisma.lead.findUnique({ where: { hostname }, select: { id: true } });
    if (!cur) return null;
    const data: Prisma.LeadUpdateInput = {
      scanCount: { increment: 1 },
      lastSeenAt: now,
      ...(score != null ? { lastScore: score } : {}),
      ...(input.platform ? { platform: input.platform } : {}),
      ...(input.sector ? { sector: input.sector } : {}),
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
      ...(input.reportToken ? { lastReportToken: input.reportToken } : {}),
    };
    const row = await prisma.lead.update({
      where: { id: cur.id },
      data,
      select: { id: true, scanCount: true, activity: true },
    });
    // kinds birleşimi: koşul DB'de (aynı kind ile eşzamanlı iki tarama çift kayıt üretmez)
    await prisma.lead.updateMany({
      where: { id: cur.id, NOT: { kinds: { has: input.kind } } },
      data: { kinds: { push: input.kind } },
    });
    if (score != null) {
      // bestScore yalnız büyükse (ya da boşsa) — koşul DB'de değerlendirilir, eski değer ezilmez
      await prisma.lead.updateMany({
        where: { id: cur.id, OR: [{ bestScore: null }, { bestScore: { lt: score } }] },
        data: { bestScore: score },
      });
    }
    if (row.scanCount >= 3) {
      await prisma.lead.update({
        where: { id: cur.id },
        data: { activity: pushActivity(row.activity, { action: 'rescan', note: `Tekrar tarama ×${row.scanCount}` }) },
        select: { id: true },
      });
    }
    return { id: row.id, scanCount: row.scanCount };
  };

  const existing = await update();
  if (existing) return existing;
  try {
    return await prisma.lead.create({
      data: {
        hostname,
        firstSeenAt: now,
        lastSeenAt: now,
        scanCount: 1,
        lastScore: score,
        bestScore: score,
        kinds: [input.kind],
        platform: input.platform ?? null,
        sector: input.sector ?? null,
        tenantId: input.tenantId ?? null,
        lastReportToken: input.reportToken ?? null,
        source: input.source ?? 'TOOL',
      },
      select: { id: true, scanCount: true },
    });
  } catch (err) {
    // Yarış: aynı anda iki tarama aynı hostname'i yarattı → güncellemeyle devam.
    if (!isUniqueViolation(err)) throw err;
    const retried = await update();
    if (!retried) throw err;
    return retried;
  }
}

export type ContactLeadInput = {
  hostname?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  company?: string | null;
  message: string;
  topic?: string | null;
  consentAt: Date;
  iysConsentAt?: Date | null;
  utm?: Record<string, unknown> | null;
  lastReportToken?: string | null;
  sector?: string | null;
  tenantId?: string | null;
};

/**
 * İletişim formu → lead: hostname varsa ona göre upsert; yoksa contactEmail ile bul → yoksa yarat.
 * consentAt zorunlu (KVKK aydınlatma onayı). Kaynak CONTACT olur; aktivite "Form dolduruldu".
 */
export async function upsertLeadFromContact(input: ContactLeadInput): Promise<{ id: string; created: boolean }> {
  const hostname = input.hostname ? input.hostname.toLowerCase() : null;
  const email = input.contactEmail.trim().toLowerCase();
  const existing = hostname
    ? await prisma.lead.findUnique({ where: { hostname }, select: { id: true, activity: true } })
    : await prisma.lead.findFirst({
        where: { contactEmail: email },
        orderBy: { lastSeenAt: 'desc' },
        select: { id: true, activity: true },
      });
  const contactFields = {
    contactName: input.contactName,
    contactEmail: email,
    contactPhone: input.contactPhone ?? null,
    company: input.company ?? null,
    message: input.message,
    topic: input.topic ?? null,
    consentAt: input.consentAt,
    iysConsentAt: input.iysConsentAt ?? null,
    utm: (input.utm ?? undefined) as Prisma.InputJsonValue | undefined,
    ...(input.lastReportToken ? { lastReportToken: input.lastReportToken } : {}),
    ...(input.sector ? { sector: input.sector } : {}),
    ...(input.tenantId ? { tenantId: input.tenantId } : {}),
  };
  if (existing) {
    await prisma.lead.update({
      where: { id: existing.id },
      data: {
        ...contactFields,
        source: 'CONTACT',
        lastSeenAt: new Date(),
        activity: pushActivity(existing.activity, { action: 'contact', note: 'Form dolduruldu' }),
      },
    });
    return { id: existing.id, created: false };
  }
  const row = await prisma.lead.create({
    data: {
      hostname,
      ...contactFields,
      source: 'CONTACT',
      activity: pushActivity(null, { action: 'contact', note: 'Form dolduruldu' }),
    },
    select: { id: true },
  });
  return { id: row.id, created: true };
}

/** Aktivite satırı ekler; isteğe bağlı durum/sahip/not güncellemesiyle birlikte (admin aksiyonları). */
export async function logLeadActivity(
  id: string,
  entry: { action: string; note?: string; byUserId?: string },
  patch: { status?: LeadStatus; ownerUserId?: string | null; notes?: string | null } = {},
): Promise<void> {
  const cur = await prisma.lead.findUnique({ where: { id }, select: { activity: true } });
  if (!cur) return;
  await prisma.lead.update({
    where: { id },
    data: {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.ownerUserId !== undefined ? { ownerUserId: patch.ownerUserId } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      activity: pushActivity(cur.activity, entry),
    },
  });
}

export type LeadListItem = {
  id: string;
  hostname: string | null;
  status: LeadStatus;
  source: LeadSource;
  scanCount: number;
  lastScore: number | null;
  bestScore: number | null;
  platform: string | null;
  sector: string | null;
  tenantId: string | null;
  ownerUserId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  company: string | null;
  topic: string | null;
  consentAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
};

/** Admin listesi — cursor sayfalama (lastSeenAt desc, id desc); `q` hostname/e-posta/şirket araması. */
export async function listLeads(
  opts: { status?: LeadStatus; source?: LeadSource; q?: string; cursor?: string | null; take?: number } = {},
): Promise<{ items: LeadListItem[]; nextCursor: string | null }> {
  const take = Math.max(1, Math.min(200, opts.take ?? 50));
  const q = opts.q?.trim();
  const where: Prisma.LeadWhereInput = {
    ...(opts.status ? { status: opts.status } : {}),
    ...(opts.source ? { source: opts.source } : {}),
    ...(q
      ? {
          OR: [
            { hostname: { contains: q.toLowerCase() } },
            { contactEmail: { contains: q.toLowerCase() } },
            { company: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const rows = await prisma.lead.findMany({
    where,
    orderBy: [{ lastSeenAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      hostname: true,
      status: true,
      source: true,
      scanCount: true,
      lastScore: true,
      bestScore: true,
      platform: true,
      sector: true,
      tenantId: true,
      ownerUserId: true,
      contactName: true,
      contactEmail: true,
      company: true,
      topic: true,
      consentAt: true,
      firstSeenAt: true,
      lastSeenAt: true,
      createdAt: true,
    },
  });
  const items = rows.slice(0, take);
  const nextCursor = rows.length > take ? (items[items.length - 1]?.id ?? null) : null;
  return { items, nextCursor };
}
