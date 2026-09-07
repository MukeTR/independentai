/**
 * Ajans alanı — hesap oluşturma, üyelik/koltuk, müşteri çalışma alanları, atama, davet, bağlama
 * isteği, portföy toplulaştırması. Tüm çok-tablolu yazımlar transaction; limitler server-side.
 */
import type { AgencyRole, WorkspaceStatus } from '@independentai/db';
import type { Prisma } from '@independentai/db';
import { visibilityOf, shareOfVoiceOf } from '@independentai/shared';
import { prisma } from './prisma';
import { ClientError, ConflictError, ForbiddenError, NotFoundError, PlanLimitError } from './errors';
import { cleanName, cleanWebsite, normalizeEmail, LIMITS as NLIMITS } from './normalize';
import { hashToken, randomToken } from './auth-tokens';
import { trialEnd } from './accounts';
import { computeAgencyEntitlement } from './entitlement';
import { agencyRoleToTenantRole, type Actor, type AgencyContext } from './authz';
import { publish, agencyTopic, tenantTopic } from './realtime';
import { audit } from './audit';

const INVITE_TTL_MS = 7 * 86_400_000;
const LINK_TTL_MS = 7 * 86_400_000;

// ───────────── Hesap ─────────────

/**
 * Mevcut (yeni kayıt olmuş, kurulumsuz) marka tenant'ını ajans ev tenant'ına dönüştürür ve
 * AgencyAccount + OWNER üyeliği oluşturur. Onboarding'de "ajans olarak çalışıyorum" seçimi.
 */
export async function convertTenantToAgency(userId: string, input: { name: unknown; website?: unknown }) {
  const name = cleanName(input.name, 'Ajans adı', NLIMITS.companyName);
  const website = cleanWebsite(input.website);
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, include: { tenant: true } });
    if (user.role !== 'OWNER') throw new ForbiddenError('Yalnızca hesap sahibi ajans hesabına dönüştürebilir');
    if (user.tenant.kind === 'AGENCY') {
      const existing = await tx.agencyAccount.findUniqueOrThrow({ where: { tenantId: user.tenantId } });
      return { agencyId: existing.id, alreadyAgency: true as const };
    }
    const [brands, prompts, others] = await Promise.all([
      tx.brand.count({ where: { tenantId: user.tenantId } }),
      tx.prompt.count({ where: { tenantId: user.tenantId } }),
      tx.user.count({ where: { tenantId: user.tenantId, id: { not: userId } } }),
    ]);
    if (brands > 0 || prompts > 0)
      throw new ConflictError('Marka verisi olan bir hesap ajansa dönüştürülemez; yeni bir ajans hesabı açın');
    if (others > 0) throw new ConflictError('Çok üyeli bir hesap ajansa dönüştürülemez');
    await tx.tenant.update({
      where: { id: user.tenantId },
      data: { kind: 'AGENCY', name, website, onboardingCompletedAt: new Date() },
    });
    const agency = await tx.agencyAccount.create({ data: { tenantId: user.tenantId, name, website } });
    await tx.agencyMembership.create({ data: { agencyId: agency.id, userId, role: 'OWNER', allClients: true } });
    return { agencyId: agency.id, alreadyAgency: false as const };
  });
}

// ───────────── Müşteri çalışma alanları ─────────────

export type ClientCard = {
  workspaceId: string;
  tenantId: string;
  name: string;
  website: string | null;
  status: WorkspaceStatus;
  label: string | null;
  tags: string[];
  ownerMemberId: string | null;
  ownerEmail: string | null;
  platform: string | null;
  visibility: number;
  sov: number;
  visibilityDelta7: number;
  visibilityDelta30: number;
  lastRunAt: string | null;
  lastSyncAt: string | null;
  failedRuns7d: number;
  syncError: string | null;
  health: 'good' | 'warn' | 'critical' | 'idle';
  criticalFindings: number;
  hallucinations: number;
};

async function accessibleWorkspaceWhere(agency: AgencyContext): Promise<Prisma.AgencyWorkspaceWhereInput> {
  return agency.allClients
    ? { agencyId: agency.id }
    : { agencyId: agency.id, access: { some: { membershipId: agency.membershipId } } };
}

/** Portföy: erişilebilir tüm müşteriler için kart verisi (tek geçiş, tenant başına sınırlı sorgu). */
export async function listClientCards(
  agency: AgencyContext,
  opts: { includeArchived?: boolean } = {},
): Promise<ClientCard[]> {
  const where = await accessibleWorkspaceWhere(agency);
  const workspaces = await prisma.agencyWorkspace.findMany({
    where: { ...where, ...(opts.includeArchived ? {} : { status: { not: 'ARCHIVED' } }) },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          website: true,
          storeConnections: {
            select: { provider: true, status: true, lastSyncAt: true, lastErrorCode: true },
            take: 3,
          },
        },
      },
      ownerMember: { include: { user: { select: { email: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  if (!workspaces.length) return [];
  const tenantIds = workspaces.map((w) => w.tenantId);
  const now = Date.now();
  const since30 = new Date(now - 30 * 86_400_000);
  const since60 = new Date(now - 60 * 86_400_000);

  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId: { in: tenantIds } }, runDate: { gte: since60 }, status: { in: ['SUCCESS', 'ERROR'] } },
    select: {
      status: true,
      runDate: true,
      prompt: { select: { tenantId: true } },
      mentions: { select: { isOwnBrand: true, isCompetitor: true, mentionName: true } },
    },
    take: 20000,
  });
  const audits = await prisma.audit.findMany({
    where: { tenantId: { in: tenantIds }, createdAt: { gte: since30 }, kind: { in: ['GEO', 'COMMERCE'] } },
    select: { tenantId: true, findings: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const byTenant = new Map<string, typeof runs>();
  for (const r of runs) {
    const arr = byTenant.get(r.prompt.tenantId) ?? [];
    arr.push(r);
    byTenant.set(r.prompt.tenantId, arr);
  }
  const latestAudit = new Map<string, number>();
  for (const a of audits) {
    if (latestAudit.has(a.tenantId!)) continue;
    const findings = Array.isArray(a.findings) ? (a.findings as { status?: string }[]) : [];
    latestAudit.set(a.tenantId!, findings.filter((f) => f.status === 'fail').length);
  }

  return workspaces.map((w) => {
    const rs = byTenant.get(w.tenantId) ?? [];
    const win = (from: number, to: number) =>
      rs.filter((r) => r.runDate.getTime() <= now - to * 86_400_000 && r.runDate.getTime() > now - from * 86_400_000);
    const last7 = win(7, 0);
    const prev7 = win(14, 7);
    const last30 = win(30, 0);
    const prev30 = win(60, 30);
    const vis30 = visibilityOf(last30);
    const failed7 = last7.filter((r) => r.status === 'ERROR').length;
    const lastRun = rs.reduce<Date | null>((m, r) => (!m || r.runDate > m ? r.runDate : m), null);
    const conn = w.tenant.storeConnections[0] ?? null;
    const criticalFindings = latestAudit.get(w.tenantId) ?? 0;
    const delta7 = prev7.length >= 3 ? visibilityOf(last7) - visibilityOf(prev7) : 0;
    let health: ClientCard['health'] = 'good';
    if (!rs.length) health = 'idle';
    else if (failed7 >= 3 || conn?.status === 'ERROR' || delta7 <= -15) health = 'critical';
    else if (failed7 > 0 || delta7 <= -5 || criticalFindings >= 3) health = 'warn';
    return {
      workspaceId: w.id,
      tenantId: w.tenantId,
      name: w.tenant.name,
      website: w.tenant.website,
      status: w.status,
      label: w.label,
      tags: w.tags,
      ownerMemberId: w.ownerMemberId,
      ownerEmail: w.ownerMember?.user.email ?? null,
      platform: conn?.provider ?? null,
      visibility: vis30,
      sov: shareOfVoiceOf(last30),
      visibilityDelta7: delta7,
      visibilityDelta30: prev30.length >= 3 ? vis30 - visibilityOf(prev30) : 0,
      lastRunAt: lastRun ? lastRun.toISOString() : null,
      lastSyncAt: conn?.lastSyncAt ? conn.lastSyncAt.toISOString() : null,
      failedRuns7d: failed7,
      syncError: conn?.lastErrorCode ?? null,
      health,
      criticalFindings,
      hallucinations: 0,
    };
  });
}

/**
 * Portföy özeti. Ortalama = müşteri başına eşit ağırlıklı (büyük müşteri baskın olmasın);
 * her müşteri değeri docs/METRICS.md formülüyle hesaplanır. UI tooltip'i bunu belirtir.
 */
export function summarizePortfolio(cards: ClientCard[]) {
  const withData = cards.filter((c) => c.health !== 'idle');
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : 0);
  return {
    clients: cards.length,
    active: cards.filter((c) => c.status === 'ACTIVE').length,
    paused: cards.filter((c) => c.status === 'PAUSED').length,
    avgVisibility: avg(withData.map((c) => c.visibility)),
    avgSov: avg(withData.map((c) => c.sov)),
    rising: cards.filter((c) => c.visibilityDelta7 >= 5).length,
    falling: cards.filter((c) => c.visibilityDelta7 <= -5).length,
    critical: cards.filter((c) => c.health === 'critical').length,
    needsAction: cards
      .filter((c) => c.health === 'critical' || c.health === 'warn' || c.status === 'PAUSED')
      .map((c) => c.tenantId),
    failedRuns7d: cards.reduce((s, c) => s + c.failedRuns7d, 0),
    syncIssues: cards.filter((c) => !!c.syncError).length,
    aggregation:
      'Müşteri başına eşit ağırlıklı ortalama; her müşteri değeri METRICS.md görünürlük/SoV formülüyle hesaplanır.',
  };
}

export async function createClientWorkspace(
  actor: Actor & { agency: AgencyContext },
  input: { name: unknown; website?: unknown; label?: unknown; tags?: unknown; ownerMemberId?: unknown },
) {
  const name = cleanName(input.name, 'Müşteri adı', NLIMITS.companyName);
  const website = cleanWebsite(input.website);
  const label = typeof input.label === 'string' ? input.label.trim().slice(0, 80) : null;
  const tags = Array.isArray(input.tags)
    ? [
        ...new Set(
          input.tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim().slice(0, 30))
            .filter(Boolean),
        ),
      ].slice(0, 10)
    : [];
  return prisma.$transaction(async (tx) => {
    // Eşzamanlı isteklerde limit aşımını önlemek için ajans satırını kilitle.
    await tx.$queryRaw`SELECT id FROM "AgencyAccount" WHERE id = ${actor.agency.id} FOR UPDATE`;
    const [clients, agency] = await Promise.all([
      tx.agencyWorkspace.count({ where: { agencyId: actor.agency.id, status: { not: 'ARCHIVED' } } }),
      tx.agencyAccount.findUniqueOrThrow({
        where: { id: actor.agency.id },
        include: { tenant: { select: { trialEndsAt: true } } },
      }),
    ]);
    const ent = computeAgencyEntitlement({
      plan: agency.plan,
      trialEndsAt: agency.tenant.trialEndsAt,
      seats: 0,
      clients,
    });
    if (ent.clientsLeft <= 0) throw new PlanLimitError(`Müşteri sınırı (${ent.limits.clients}) doldu`);
    if (input.ownerMemberId) {
      const m = await tx.agencyMembership.findFirst({
        where: { id: String(input.ownerMemberId), agencyId: actor.agency.id },
      });
      if (!m) throw new ClientError('Sorumlu üye bulunamadı');
    }
    const tenant = await tx.tenant.create({
      data: { name, website, trialEndsAt: trialEnd(), kind: 'BRAND', onboardingCompletedAt: new Date() },
    });
    await tx.alertConfig.create({ data: { tenantId: tenant.id, emailEnabled: false, weeklyReportEnabled: false } });
    const ws = await tx.agencyWorkspace.create({
      data: {
        agencyId: actor.agency.id,
        tenantId: tenant.id,
        label,
        tags,
        ownerMemberId: input.ownerMemberId ? String(input.ownerMemberId) : null,
      },
    });
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'agency.changed', entityId: ws.id, status: 'client_created', summary: name },
      tx,
    );
    return { workspaceId: ws.id, tenantId: tenant.id };
  });
}

export async function updateWorkspace(
  actor: Actor & { agency: AgencyContext },
  workspaceId: string,
  patch: { status?: unknown; label?: unknown; tags?: unknown; ownerMemberId?: unknown },
) {
  const ws = await prisma.agencyWorkspace.findFirst({ where: { id: workspaceId, agencyId: actor.agency.id } });
  if (!ws) throw new NotFoundError('Müşteri bulunamadı');
  const data: Prisma.AgencyWorkspaceUpdateInput = {};
  if (patch.status !== undefined) {
    if (patch.status !== 'ACTIVE' && patch.status !== 'PAUSED' && patch.status !== 'ARCHIVED')
      throw new ClientError('Geçersiz durum');
    data.status = patch.status;
  }
  if (patch.label !== undefined)
    data.label = patch.label === null || patch.label === '' ? null : String(patch.label).trim().slice(0, 80);
  if (patch.tags !== undefined)
    data.tags = Array.isArray(patch.tags)
      ? [
          ...new Set(
            patch.tags
              .filter((t): t is string => typeof t === 'string')
              .map((t) => t.trim().slice(0, 30))
              .filter(Boolean),
          ),
        ].slice(0, 10)
      : [];
  if (patch.ownerMemberId !== undefined) {
    if (patch.ownerMemberId === null || patch.ownerMemberId === '') data.ownerMember = { disconnect: true };
    else {
      const m = await prisma.agencyMembership.findFirst({
        where: { id: String(patch.ownerMemberId), agencyId: actor.agency.id },
      });
      if (!m) throw new ClientError('Sorumlu üye bulunamadı');
      data.ownerMember = { connect: { id: m.id } };
    }
  }
  const updated = await prisma.agencyWorkspace.update({ where: { id: ws.id }, data });
  await publish(agencyTopic(actor.agency.id), {
    event: 'agency.changed',
    entityId: ws.id,
    status: `workspace_${updated.status.toLowerCase()}`,
  });
  return updated;
}

/** Portföyden çıkar: yalnızca ilişkiyi keser; tenant ve verisi silinmez (müşteri kendi hesabında kalır). */
export async function unlinkWorkspace(actor: Actor & { agency: AgencyContext }, workspaceId: string) {
  const ws = await prisma.agencyWorkspace.findFirst({
    where: { id: workspaceId, agencyId: actor.agency.id },
    include: { tenant: { select: { _count: { select: { users: true } } } } },
  });
  if (!ws) throw new NotFoundError('Müşteri bulunamadı');
  await prisma.$transaction(async (tx) => {
    await tx.agencyWorkspace.delete({ where: { id: ws.id } });
    // Ajansın oluşturduğu ve hiç kullanıcısı olmayan tenant erişilemez hale gelir; silinmez (arşiv).
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'agency.changed', entityId: ws.id, status: 'client_unlinked' },
      tx,
    );
  });
  return { tenantId: ws.tenantId, orphan: ws.tenant._count.users === 0 };
}

// ───────────── Atama ─────────────

export async function setAssignments(
  actor: Actor & { agency: AgencyContext },
  membershipId: string,
  workspaceIds: string[],
  roleOverride?: AgencyRole | null,
) {
  const member = await prisma.agencyMembership.findFirst({ where: { id: membershipId, agencyId: actor.agency.id } });
  if (!member) throw new NotFoundError('Üye bulunamadı');
  const wss = await prisma.agencyWorkspace.findMany({
    where: { agencyId: actor.agency.id, id: { in: workspaceIds } },
    select: { id: true },
  });
  if (wss.length !== new Set(workspaceIds).size) throw new ClientError('Bir veya daha fazla müşteri bulunamadı');
  await prisma.$transaction(async (tx) => {
    await tx.workspaceAccess.deleteMany({ where: { membershipId } });
    if (wss.length)
      await tx.workspaceAccess.createMany({
        data: wss.map((w) => ({ membershipId, workspaceId: w.id, roleOverride: roleOverride ?? null })),
      });
    // Erişim değişti → eski Realtime tokenlar/oturumlar yeniden doğrulansın
    await tx.user.update({ where: { id: member.userId }, data: { sessionVersion: { increment: 1 } } });
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'agency.changed', entityId: membershipId, status: 'assignment_changed' },
      tx,
    );
  });
}

export async function setMemberScope(
  actor: Actor & { agency: AgencyContext },
  membershipId: string,
  patch: { role?: unknown; allClients?: unknown; status?: unknown },
) {
  if (actor.agency.role !== 'OWNER' && actor.agency.role !== 'ADMIN')
    throw new ForbiddenError('Ekip yönetimi Owner/Admin gerektirir');
  const member = await prisma.agencyMembership.findFirst({ where: { id: membershipId, agencyId: actor.agency.id } });
  if (!member) throw new NotFoundError('Üye bulunamadı');
  const data: Prisma.AgencyMembershipUpdateInput = {};
  if (patch.role !== undefined) {
    const r = patch.role;
    if (r !== 'OWNER' && r !== 'ADMIN' && r !== 'STRATEGIST' && r !== 'ANALYST') throw new ClientError('Geçersiz rol');
    if (r === 'OWNER' && actor.agency.role !== 'OWNER')
      throw new ForbiddenError('Owner atama yalnızca Owner tarafından yapılabilir');
    if (member.role === 'OWNER' && r !== 'OWNER') {
      const owners = await prisma.agencyMembership.count({
        where: { agencyId: actor.agency.id, role: 'OWNER', status: 'ACTIVE' },
      });
      if (owners <= 1) throw new ConflictError('Ajansın en az bir sahibi olmalı');
    }
    data.role = r;
    if (r === 'OWNER' || r === 'ADMIN') data.allClients = true;
  }
  if (patch.allClients !== undefined) data.allClients = patch.allClients === true;
  if (patch.status !== undefined) {
    if (patch.status !== 'ACTIVE' && patch.status !== 'SUSPENDED') throw new ClientError('Geçersiz durum');
    if (member.role === 'OWNER' && patch.status === 'SUSPENDED') throw new ConflictError('Sahip askıya alınamaz');
    data.status = patch.status;
  }
  await prisma.$transaction(async (tx) => {
    await tx.agencyMembership.update({ where: { id: member.id }, data });
    await tx.user.update({ where: { id: member.userId }, data: { sessionVersion: { increment: 1 } } });
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'team.changed', entityId: member.id, status: 'member_updated' },
      tx,
    );
  });
}

/** Üyeyi ajanstan çıkarır: kullanıcı boş bir marka hesabına taşınır (hesabı kaybolmaz). */
export async function removeAgencyMember(actor: Actor & { agency: AgencyContext }, membershipId: string) {
  if (actor.agency.role !== 'OWNER' && actor.agency.role !== 'ADMIN')
    throw new ForbiddenError('Ekip yönetimi Owner/Admin gerektirir');
  const member = await prisma.agencyMembership.findFirst({
    where: { id: membershipId, agencyId: actor.agency.id },
    include: { user: true },
  });
  if (!member) throw new NotFoundError('Üye bulunamadı');
  if (member.userId === actor.userId) throw new ClientError('Kendinizi çıkaramazsınız');
  if (member.role === 'OWNER') {
    if (actor.agency.role !== 'OWNER') throw new ForbiddenError('Sahibi yalnızca başka bir sahip çıkarabilir');
    const owners = await prisma.agencyMembership.count({
      where: { agencyId: actor.agency.id, role: 'OWNER', status: 'ACTIVE' },
    });
    if (owners <= 1) throw new ConflictError('Ajansın en az bir sahibi olmalı');
  }
  await prisma.$transaction(async (tx) => {
    await tx.agencyMembership.delete({ where: { id: member.id } });
    const t = await tx.tenant.create({
      data: {
        name: member.user.name || member.user.email.split('@')[0] || 'Hesabım',
        trialEndsAt: new Date(),
        kind: 'BRAND',
      },
    });
    await tx.user.update({
      where: { id: member.userId },
      data: { tenantId: t.id, role: 'OWNER', sessionVersion: { increment: 1 } },
    });
    await tx.alertConfig.create({ data: { tenantId: t.id } });
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'team.changed', entityId: member.id, status: 'member_removed' },
      tx,
    );
  });
}

/** Ownership transfer: hedef üye OWNER olur, mevcut sahip ADMIN'e düşer, iki oturum da yenilenir. */
export async function transferAgencyOwnership(actor: Actor & { agency: AgencyContext }, targetMembershipId: string) {
  if (actor.agency.role !== 'OWNER') throw new ForbiddenError('Yalnızca sahip devredebilir');
  const target = await prisma.agencyMembership.findFirst({
    where: { id: targetMembershipId, agencyId: actor.agency.id, status: 'ACTIVE' },
  });
  if (!target) throw new NotFoundError('Üye bulunamadı');
  if (target.userId === actor.userId) throw new ClientError('Zaten sahipsiniz');
  await prisma.$transaction(async (tx) => {
    await tx.agencyMembership.update({ where: { id: target.id }, data: { role: 'OWNER', allClients: true } });
    await tx.agencyMembership.update({ where: { id: actor.agency.membershipId }, data: { role: 'ADMIN' } });
    await tx.user.updateMany({
      where: { id: { in: [target.userId, actor.userId] } },
      data: { sessionVersion: { increment: 1 } },
    });
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'team.changed', entityId: target.id, status: 'ownership_transferred' },
      tx,
    );
  });
  await audit({
    action: 'agency.ownership_transfer',
    agencyId: actor.agency.id,
    actorUserId: actor.userId,
    targetType: 'membership',
    targetId: target.id,
  });
}

// ───────────── Davet ─────────────

export async function createAgencyInvite(
  actor: Actor & { agency: AgencyContext },
  input: { email: unknown; role: unknown; allClients?: unknown; workspaceIds?: unknown },
) {
  if (actor.agency.role !== 'OWNER' && actor.agency.role !== 'ADMIN')
    throw new ForbiddenError('Davet Owner/Admin gerektirir');
  const email = normalizeEmail(input.email);
  const role = input.role === 'ADMIN' || input.role === 'STRATEGIST' || input.role === 'ANALYST' ? input.role : null;
  if (!role) throw new ClientError('Rol ADMIN, STRATEGIST veya ANALYST olmalı');
  if (email === actor.email) throw new ClientError('Kendinizi davet edemezsiniz');
  const allClients = role === 'ADMIN' ? true : input.allClients === true;
  const workspaceIds = Array.isArray(input.workspaceIds)
    ? input.workspaceIds.filter((x): x is string => typeof x === 'string').slice(0, 100)
    : [];
  if (workspaceIds.length) {
    const n = await prisma.agencyWorkspace.count({ where: { agencyId: actor.agency.id, id: { in: workspaceIds } } });
    if (n !== new Set(workspaceIds).size) throw new ClientError('Bir veya daha fazla müşteri bulunamadı');
  }
  const token = randomToken();
  const inv = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AgencyAccount" WHERE id = ${actor.agency.id} FOR UPDATE`;
    const [seats, pending, existing, agency] = await Promise.all([
      tx.agencyMembership.count({ where: { agencyId: actor.agency.id, status: 'ACTIVE' } }),
      tx.agencyInvite.count({
        where: { agencyId: actor.agency.id, acceptedAt: null, expiresAt: { gt: new Date() }, email: { not: email } },
      }),
      tx.agencyMembership.findFirst({ where: { agencyId: actor.agency.id, user: { email } } }),
      tx.agencyAccount.findUniqueOrThrow({
        where: { id: actor.agency.id },
        include: { tenant: { select: { trialEndsAt: true } } },
      }),
    ]);
    if (existing) throw new ConflictError('Bu e-posta zaten ekipte');
    const ent = computeAgencyEntitlement({
      plan: agency.plan,
      trialEndsAt: agency.tenant.trialEndsAt,
      seats: seats + pending,
      clients: 0,
    });
    if (ent.seatsLeft <= 0) throw new PlanLimitError(`Koltuk sınırı (${ent.limits.seats}) doldu`);
    await tx.agencyInvite.deleteMany({ where: { agencyId: actor.agency.id, email, acceptedAt: null } });
    return tx.agencyInvite.create({
      data: {
        agencyId: actor.agency.id,
        email,
        role,
        allClients,
        workspaceIds,
        tokenHash: hashToken(token),
        invitedById: actor.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  });
  await publish(agencyTopic(actor.agency.id), { event: 'team.changed', entityId: inv.id, status: 'invite_sent' });
  return { inviteId: inv.id, token, email, role };
}

export async function previewAgencyInvite(token: string) {
  const inv = await prisma.agencyInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agency: { select: { name: true } } },
  });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) return null;
  return { email: inv.email, role: inv.role, agencyName: inv.agency.name };
}

/** Kabul: kullanıcının tek-kişilik, verisiz hesabı ajans ev tenant'ına taşınır; aksi halde 409. */
export async function acceptAgencyInvite(actor: Actor, token: string) {
  const inv = await prisma.agencyInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agency: true },
  });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date())
    throw new NotFoundError('Davet geçersiz veya süresi dolmuş');
  if (inv.email !== actor.email) throw new ForbiddenError('Bu davet başka bir e-posta adresine gönderilmiş');
  if (actor.agency) throw new ConflictError('Zaten bir ajans üyesisiniz');
  const [others, brands, prompts] = await Promise.all([
    prisma.user.count({ where: { tenantId: actor.homeTenantId, id: { not: actor.userId } } }),
    prisma.brand.count({ where: { tenantId: actor.homeTenantId } }),
    prisma.prompt.count({ where: { tenantId: actor.homeTenantId } }),
  ]);
  if (others > 0 || brands > 0 || prompts > 0) {
    throw new ConflictError(
      'Marka verisi veya başka üyesi olan bir hesapla ajansa katılınamaz. Yeni bir kullanıcı hesabıyla daveti kabul edin.',
    );
  }
  const oldTenantId = actor.homeTenantId;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.agencyInvite.updateMany({
      where: { id: inv.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ConflictError('Davet zaten kullanılmış');
    await tx.$queryRaw`SELECT id FROM "AgencyAccount" WHERE id = ${inv.agencyId} FOR UPDATE`;
    const seats = await tx.agencyMembership.count({ where: { agencyId: inv.agencyId, status: 'ACTIVE' } });
    const agency = await tx.agencyAccount.findUniqueOrThrow({
      where: { id: inv.agencyId },
      include: { tenant: { select: { trialEndsAt: true } } },
    });
    const ent = computeAgencyEntitlement({
      plan: agency.plan,
      trialEndsAt: agency.tenant.trialEndsAt,
      seats,
      clients: 0,
    });
    if (ent.seatsLeft <= 0) throw new PlanLimitError('Ajans koltuk sınırı dolu; davet kabul edilemedi');
    const membership = await tx.agencyMembership.create({
      data: { agencyId: inv.agencyId, userId: actor.userId, role: inv.role, allClients: inv.allClients },
    });
    if (inv.workspaceIds.length) {
      const wss = await tx.agencyWorkspace.findMany({
        where: { agencyId: inv.agencyId, id: { in: inv.workspaceIds } },
        select: { id: true },
      });
      if (wss.length)
        await tx.workspaceAccess.createMany({
          data: wss.map((w) => ({ membershipId: membership.id, workspaceId: w.id })),
        });
    }
    await tx.user.update({
      where: { id: actor.userId },
      data: {
        tenantId: inv.agency.tenantId,
        role: agencyRoleToTenantRole(inv.role),
        isSuperAdmin: false,
        sessionVersion: { increment: 1 },
        emailVerifiedAt: actor.emailVerified ? undefined : new Date(),
      },
    });
    await publish(
      agencyTopic(inv.agencyId),
      { event: 'team.changed', entityId: membership.id, status: 'member_joined' },
      tx,
    );
  });
  // Eski boş tenant temizlenir.
  await prisma.tenant.delete({ where: { id: oldTenantId } }).catch(() => undefined);
  return { agencyId: inv.agencyId };
}

// ───────────── Mevcut marka hesabını bağlama (owner onaylı) ─────────────

export async function createLinkRequest(actor: Actor & { agency: AgencyContext }) {
  if (actor.agency.role !== 'OWNER' && actor.agency.role !== 'ADMIN')
    throw new ForbiddenError('Bağlama isteği Owner/Admin gerektirir');
  const token = randomToken();
  const req = await prisma.agencyLinkRequest.create({
    data: {
      agencyId: actor.agency.id,
      tokenHash: hashToken(token),
      createdById: actor.userId,
      expiresAt: new Date(Date.now() + LINK_TTL_MS),
    },
  });
  return { requestId: req.id, token };
}

export async function previewLinkRequest(token: string) {
  const req = await prisma.agencyLinkRequest.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { agency: { select: { name: true, website: true } } },
  });
  if (!req || req.status !== 'PENDING' || req.expiresAt < new Date()) return null;
  return { agencyName: req.agency.name, agencyWebsite: req.agency.website };
}

/** Marka tenant'ının OWNER'ı onaylar → AgencyWorkspace oluşur. Ajans veriyi sahiplenmez; erişim alır. */
export async function acceptLinkRequest(actor: Actor, token: string) {
  if (actor.viaAgency || actor.tenant.kind !== 'BRAND' || actor.homeRole !== 'OWNER')
    throw new ForbiddenError('Bağlantıyı yalnızca marka hesabının sahibi onaylayabilir');
  const req = await prisma.agencyLinkRequest.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!req || req.status !== 'PENDING' || req.expiresAt < new Date())
    throw new NotFoundError('Bağlantı isteği geçersiz veya süresi dolmuş');
  const existing = await prisma.agencyWorkspace.findUnique({ where: { tenantId: actor.tenantId } });
  if (existing) throw new ConflictError('Bu hesap zaten bir ajansa bağlı');
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "AgencyAccount" WHERE id = ${req.agencyId} FOR UPDATE`;
    const [clients, agency] = await Promise.all([
      tx.agencyWorkspace.count({ where: { agencyId: req.agencyId, status: { not: 'ARCHIVED' } } }),
      tx.agencyAccount.findUniqueOrThrow({
        where: { id: req.agencyId },
        include: { tenant: { select: { trialEndsAt: true } } },
      }),
    ]);
    const ent = computeAgencyEntitlement({
      plan: agency.plan,
      trialEndsAt: agency.tenant.trialEndsAt,
      seats: 0,
      clients,
    });
    if (ent.clientsLeft <= 0) throw new PlanLimitError('Ajansın müşteri sınırı dolu');
    const claimed = await tx.agencyLinkRequest.updateMany({
      where: { id: req.id, status: 'PENDING' },
      data: { status: 'ACCEPTED', tenantId: actor.tenantId, resolvedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ConflictError('İstek zaten kullanılmış');
    const ws = await tx.agencyWorkspace.create({ data: { agencyId: req.agencyId, tenantId: actor.tenantId } });
    await publish(
      agencyTopic(req.agencyId),
      { event: 'agency.changed', entityId: ws.id, status: 'client_linked', summary: actor.tenant.name },
      tx,
    );
    await publish(tenantTopic(actor.tenantId), { event: 'team.changed', status: 'agency_linked' }, tx);
  });
  return { agencyId: req.agencyId };
}

/** Ajans üyeleri listesi (portföy/ekip ekranı) */
export async function listAgencyMembers(agencyId: string) {
  const [members, invites] = await Promise.all([
    prisma.agencyMembership.findMany({
      where: { agencyId },
      include: {
        user: {
          select: { id: true, email: true, name: true, lastActiveAt: true, lastLoginAt: true, emailVerifiedAt: true },
        },
        access: { select: { workspaceId: true, roleOverride: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.agencyInvite.findMany({
      where: { agencyId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { members, invites };
}

// ───────────── Erişim çözümleme, profil, özet, davet yardımcıları (API katmanı) ─────────────

export type AccessibleWorkspace = {
  workspaceId: string;
  tenantId: string;
  name: string;
  label: string | null;
  status: WorkspaceStatus;
};

/** Üyenin erişebildiği (arşivlenmemiş) çalışma alanları — TopBar değiştiricisi ve çerez doğrulaması. */
export async function listAccessibleWorkspaces(agency: AgencyContext): Promise<AccessibleWorkspace[]> {
  const where = await accessibleWorkspaceWhere(agency);
  const rows = await prisma.agencyWorkspace.findMany({
    where: { ...where, status: { not: 'ARCHIVED' } },
    select: { id: true, tenantId: true, status: true, label: true, tenant: { select: { name: true } } },
    orderBy: { tenant: { name: 'asc' } },
    take: 200,
  });
  return rows.map((r) => ({
    workspaceId: r.id,
    tenantId: r.tenantId,
    name: r.tenant.name,
    label: r.label,
    status: r.status,
  }));
}

/**
 * Çerez yazılmadan ÖNCE doğrulama: tenantId bu ajansın erişilebilir ve arşivlenmemiş bir müşterisi mi?
 * Başka ajansın müşterisi / atanmamış müşteri → 404 (var/yok bilgisi sızdırılmaz).
 */
export async function resolveAccessibleWorkspace(
  agency: AgencyContext,
  tenantId: unknown,
): Promise<AccessibleWorkspace> {
  if (typeof tenantId !== 'string' || !/^[A-Za-z0-9_-]{5,64}$/.test(tenantId))
    throw new ClientError('Geçersiz çalışma alanı');
  const ws = await prisma.agencyWorkspace.findFirst({
    where: { tenantId, agencyId: agency.id, status: { not: 'ARCHIVED' } },
    include: { access: { where: { membershipId: agency.membershipId }, take: 1 }, tenant: { select: { name: true } } },
  });
  if (!ws || !(agency.allClients || ws.access.length > 0))
    throw new NotFoundError('Müşteri bulunamadı veya erişiminiz yok');
  return { workspaceId: ws.id, tenantId: ws.tenantId, name: ws.tenant.name, label: ws.label, status: ws.status };
}

/** Ajans adı / web sitesi (OWNER/ADMIN). Ev tenant'ının adı da eşitlenir. */
export async function updateAgencyProfile(
  actor: Actor & { agency: AgencyContext },
  patch: { name?: unknown; website?: unknown },
) {
  if (actor.agency.role !== 'OWNER' && actor.agency.role !== 'ADMIN')
    throw new ForbiddenError('Ajans ayarları Owner/Admin gerektirir');
  const data: Prisma.AgencyAccountUpdateInput = {};
  if (patch.name !== undefined) data.name = cleanName(patch.name, 'Ajans adı', NLIMITS.companyName);
  if (patch.website !== undefined) data.website = cleanWebsite(patch.website);
  if (Object.keys(data).length === 0) throw new ClientError('Değiştirilecek alan yok');
  return prisma.$transaction(async (tx) => {
    const a = await tx.agencyAccount.update({ where: { id: actor.agency.id }, data });
    await tx.tenant.update({
      where: { id: a.tenantId },
      data: {
        ...(patch.name !== undefined ? { name: a.name } : {}),
        ...(patch.website !== undefined ? { website: a.website } : {}),
      },
    });
    await publish(
      agencyTopic(actor.agency.id),
      { event: 'agency.changed', entityId: a.id, status: 'profile_updated' },
      tx,
    );
    return { id: a.id, name: a.name, website: a.website, plan: a.plan };
  });
}

/** Ajans özeti (portföy başlığı, ayarlar): profil + entitlement + sayımlar. */
export async function getAgencySummary(actor: Actor & { agency: AgencyContext }) {
  const [agency, members, clients, pendingInvites] = await Promise.all([
    prisma.agencyAccount.findUniqueOrThrow({
      where: { id: actor.agency.id },
      select: { id: true, name: true, website: true, plan: true, createdAt: true },
    }),
    prisma.agencyMembership.count({ where: { agencyId: actor.agency.id, status: 'ACTIVE' } }),
    prisma.agencyWorkspace.count({ where: { agencyId: actor.agency.id, status: { not: 'ARCHIVED' } } }),
    prisma.agencyInvite.count({
      where: { agencyId: actor.agency.id, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ]);
  return {
    agency: { ...agency, createdAt: agency.createdAt.toISOString() },
    entitlement: actor.agency.entitlement,
    members,
    clients,
    pendingInvites,
    me: { membershipId: actor.agency.membershipId, role: actor.agency.role, allClients: actor.agency.allClients },
  };
}

export async function revokeAgencyInvite(actor: Actor & { agency: AgencyContext }, inviteId: string): Promise<void> {
  if (actor.agency.role !== 'OWNER' && actor.agency.role !== 'ADMIN')
    throw new ForbiddenError('Davet yönetimi Owner/Admin gerektirir');
  const res = await prisma.agencyInvite.deleteMany({
    where: { id: inviteId, agencyId: actor.agency.id, acceptedAt: null },
  });
  if (res.count === 0) throw new NotFoundError('Davet bulunamadı');
  await publish(agencyTopic(actor.agency.id), { event: 'team.changed', entityId: inviteId, status: 'invite_revoked' });
}

/** Yeniden gönder: aynı e-posta/rol/kapsam ile yeni token; eski davet `createAgencyInvite` içinde silinir. */
export async function resendAgencyInvite(actor: Actor & { agency: AgencyContext }, inviteId: string) {
  const inv = await prisma.agencyInvite.findFirst({
    where: { id: inviteId, agencyId: actor.agency.id, acceptedAt: null },
  });
  if (!inv) throw new NotFoundError('Davet bulunamadı');
  return createAgencyInvite(actor, {
    email: inv.email,
    role: inv.role,
    allClients: inv.allClients,
    workspaceIds: inv.workspaceIds,
  });
}
