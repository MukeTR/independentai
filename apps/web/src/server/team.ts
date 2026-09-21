/**
 * Ekip yönetimi — üyeler, davetler, rol değişimi, sahiplik devri, son aktivite.
 * Kurallar:
 *  - OWNER: her şey. ADMIN: davet edebilir (ADMIN/VIEWER), üye çıkarabilir (OWNER hariç).
 *  - Son OWNER çıkarılamaz/düşürülemez. OWNER kendi rolünü düşüremez (sahipliği devretmeli).
 *    Kullanıcı kendini çıkaramaz (hesabı silme akışı ayrı).
 *  - Davet: e-posta + rol, 7 gün geçerli, tek kullanımlık hash'li token. Aynı e-postaya açık davet varsa yenilenir.
 *    Yeniden gönderim eski token'ı geçersiz kılar (tokenHash değişir), süre uzar.
 *  - Kabul: davetli e-postası ile giriş yapmış/kayıt olmuş kullanıcı, TEK-KİŞİLİK kendi tenant'ında
 *    ise (başka üye yok) tenant'ı davet edenin tenant'ına taşınır ve boş tenant silinir.
 *    Çok üyeli bir tenant'ın sahibi başka tenant'a katılamaz (veri kaybı riski) — 409.
 *  - Sahiplik devri: yalnızca doğrudan OWNER (ajans üzerinden yasak). Devreden ADMIN olur; iki tarafın
 *    sessionVersion'ı artar → eski çerezler/Realtime token'ları geçersizleşir.
 *  - Her mutasyon: `team.changed` Realtime yayını (mümkünse aynı transaction) + AuditLog satırı.
 *    Payload'a e-posta/IP girmez (entityId + status).
 */
import type { UserRole } from '@independentai/db';
import type { Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { ClientError, ConflictError, ForbiddenError, NotFoundError, PlanLimitError } from './errors';
import { normalizeEmail } from './normalize';
import { hashToken, randomToken } from './auth-tokens';
import type { Actor } from './authz';
import { deleteTenantCascade } from './accounts';
import { publish, tenantTopic } from './realtime';
import { audit } from './audit';
import { log } from './logger';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Süresi dolmuş davetler bu kadar süre listede kalır ("yeniden gönder" için). */
const EXPIRED_INVITE_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
/** lastActiveAt bu aralıktan daha sık yazılmaz (gürültü/yazma maliyeti). */
const ACTIVE_TOUCH_MS = 10 * 60 * 1000;

export type TeamOpts = { req?: Request };
type Tx = Prisma.TransactionClient | typeof prisma;

export type TeamChangeStatus =
  | 'invite_sent'
  | 'invite_resent'
  | 'invite_cancelled'
  | 'member_joined'
  | 'role_changed'
  | 'member_removed'
  | 'ownership_transferred';

async function teamChanged(tenantId: string, entityId: string, status: TeamChangeStatus, tx: Tx = prisma) {
  await publish(tenantTopic(tenantId), { event: 'team.changed', entityId, status }, tx);
}

export async function listMembers(tenantId: string) {
  const now = new Date();
  const [users, invites] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        lastActiveAt: true,
        createdAt: true,
        oauthProvider: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.teamInvite.findMany({
      where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date(now.getTime() - EXPIRED_INVITE_KEEP_MS) } },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    users,
    invites: invites.map((i) => ({ ...i, status: i.expiresAt > now ? ('pending' as const) : ('expired' as const) })),
  };
}

export async function createInvite(
  actor: Actor,
  input: { email?: unknown; role?: unknown },
  opts: TeamOpts = {},
): Promise<{ inviteId: string; token: string; email: string; role: UserRole }> {
  const email = normalizeEmail(input.email);
  const role = input.role === 'ADMIN' ? 'ADMIN' : input.role === 'VIEWER' ? 'VIEWER' : null;
  if (!role) throw new ClientError('Rol ADMIN veya VIEWER olmalı');
  if (email === actor.email) throw new ClientError('Kendinizi davet edemezsiniz');

  const [memberCount, pendingCount, existingMember] = await Promise.all([
    prisma.user.count({ where: { tenantId: actor.tenantId } }),
    prisma.teamInvite.count({ where: { tenantId: actor.tenantId, acceptedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.user.findFirst({ where: { tenantId: actor.tenantId, email } }),
  ]);
  if (existingMember) throw new ConflictError('Bu e-posta zaten ekipte');
  if (memberCount + pendingCount >= actor.entitlement.limits.members) {
    throw new PlanLimitError(`Ekip üyesi sınırı (${actor.entitlement.limits.members}) doldu`);
  }

  const token = randomToken();
  const inv = await prisma.$transaction(async (tx) => {
    await tx.teamInvite.deleteMany({ where: { tenantId: actor.tenantId, email, acceptedAt: null } });
    const created = await tx.teamInvite.create({
      data: {
        tenantId: actor.tenantId,
        email,
        role,
        tokenHash: hashToken(token),
        invitedById: actor.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
    await teamChanged(actor.tenantId, created.id, 'invite_sent', tx);
    return created;
  });
  await audit({
    action: 'member.invite',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: inv.id,
    meta: { role },
    req: opts.req,
  });
  return { inviteId: inv.id, token, email, role };
}

/**
 * Daveti yeniden gönderir: yeni token üretilir (eski link geçersiz), süre 7 gün uzatılır.
 * Süresi dolmuş davetler de yenilenebilir; kabul edilmiş davet yenilenemez.
 */
export async function resendInvite(
  actor: Actor,
  inviteId: string,
  opts: TeamOpts = {},
): Promise<{ inviteId: string; token: string; email: string; role: UserRole }> {
  const inv = await prisma.teamInvite.findFirst({ where: { id: inviteId, tenantId: actor.tenantId } });
  if (!inv) throw new NotFoundError('Davet bulunamadı');
  if (inv.acceptedAt) throw new ConflictError('Bu davet zaten kabul edilmiş');
  const stillMember = await prisma.user.findFirst({ where: { tenantId: actor.tenantId, email: inv.email } });
  if (stillMember) throw new ConflictError('Bu e-posta zaten ekipte');

  const token = randomToken();
  await prisma.$transaction(async (tx) => {
    await tx.teamInvite.update({
      where: { id: inv.id },
      data: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS), invitedById: actor.userId },
    });
    await teamChanged(actor.tenantId, inv.id, 'invite_resent', tx);
  });
  await audit({
    action: 'member.invite_resend',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: inv.id,
    meta: { role: inv.role },
    req: opts.req,
  });
  return { inviteId: inv.id, token, email: inv.email, role: inv.role };
}

/** Daveti iptal eder (satır silinir; link anında geçersiz). */
export async function cancelInvite(actor: Actor, inviteId: string, opts: TeamOpts = {}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const res = await tx.teamInvite.deleteMany({ where: { id: inviteId, tenantId: actor.tenantId } });
    if (res.count === 0) throw new NotFoundError('Davet bulunamadı');
    await teamChanged(actor.tenantId, inviteId, 'invite_cancelled', tx);
  });
  await audit({
    action: 'member.invite_cancel',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'invite',
    targetId: inviteId,
    req: opts.req,
  });
}
/** Geriye dönük ad. */
export const revokeInvite = cancelInvite;

export async function previewInvite(token: string) {
  const inv = await prisma.teamInvite.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { tenant: { select: { name: true } } },
  });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) return null;
  return { email: inv.email, role: inv.role, tenantName: inv.tenant.name };
}

/** Giriş yapmış kullanıcı daveti kabul eder. Dönen `tenantId` yeni oturum çerezi için kullanılır. */
export async function acceptInvite(actor: Actor, token: string): Promise<{ tenantId: string; role: UserRole }> {
  const inv = await prisma.teamInvite.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!inv || inv.acceptedAt || inv.expiresAt < new Date())
    throw new NotFoundError('Davet geçersiz veya süresi dolmuş');
  if (inv.email !== actor.email) throw new ForbiddenError('Bu davet başka bir e-posta adresine gönderilmiş');
  if (inv.tenantId === actor.tenantId) throw new ConflictError('Zaten bu ekiptesiniz');

  const others = await prisma.user.count({ where: { tenantId: actor.tenantId, id: { not: actor.userId } } });
  if (others > 0)
    throw new ConflictError('Çok üyeli bir hesabın sahibi başka bir ekibe katılamaz. Önce diğer üyeleri devredin.');

  const oldTenantId = actor.tenantId;
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.teamInvite.updateMany({
      where: { id: inv.id, acceptedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count !== 1) throw new ConflictError('Davet zaten kullanılmış');
    await tx.user.update({
      where: { id: actor.userId },
      data: {
        tenantId: inv.tenantId,
        role: inv.role,
        isSuperAdmin: false,
        sessionVersion: { increment: 1 },
        emailVerifiedAt: actor.emailVerified ? undefined : new Date(),
      },
    });
    await teamChanged(inv.tenantId, actor.userId, 'member_joined', tx);
  });
  // Kullanıcının eski tek-kişilik tenant'ı (örnek veri dahil) silinir.
  await deleteTenantCascade(oldTenantId);
  return { tenantId: inv.tenantId, role: inv.role };
}

export async function changeRole(actor: Actor, userId: string, role: unknown, opts: TeamOpts = {}): Promise<void> {
  if (actor.role !== 'OWNER') throw new ForbiddenError('Rol değişimi yalnızca hesap sahibi tarafından yapılabilir');
  const next = role === 'OWNER' || role === 'ADMIN' || role === 'VIEWER' ? role : null;
  if (!next) throw new ClientError('Geçersiz rol');
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId } });
  if (!target) throw new NotFoundError('Üye bulunamadı');
  if (target.role === next) return;
  if (target.role === 'OWNER' && next !== 'OWNER') {
    // Sahip kendi rolünü düşüremez; sahipliği devretmeli (son sahip koruması bunun alt kümesi).
    if (userId === actor.userId)
      throw new ConflictError('Kendi rolünüzü düşüremezsiniz; önce sahipliği başka bir üyeye devredin');
    const owners = await prisma.user.count({ where: { tenantId: actor.tenantId, role: 'OWNER' } });
    if (owners <= 1) throw new ConflictError('Hesabın en az bir sahibi olmalı');
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { role: next, sessionVersion: { increment: 1 } } });
    await teamChanged(actor.tenantId, userId, 'role_changed', tx);
  });
  await audit({
    action: 'member.role_change',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'user',
    targetId: userId,
    meta: { from: target.role, role: next },
    req: opts.req,
  });
}

export async function removeMember(actor: Actor, userId: string, opts: TeamOpts = {}): Promise<void> {
  if (userId === actor.userId) throw new ClientError('Kendinizi ekipten çıkaramazsınız');
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId } });
  if (!target) throw new NotFoundError('Üye bulunamadı');
  if (target.role === 'OWNER' && actor.role !== 'OWNER')
    throw new ForbiddenError('Hesap sahibini yalnızca başka bir sahip çıkarabilir');
  if (target.role === 'OWNER') {
    const owners = await prisma.user.count({ where: { tenantId: actor.tenantId, role: 'OWNER' } });
    if (owners <= 1) throw new ConflictError('Hesabın en az bir sahibi olmalı');
  }
  // Çıkarılan kullanıcı verisiz yeni bir tenant'a taşınır (hesabı kaybolmaz, oturumu düşer).
  await prisma.$transaction(async (tx) => {
    const t = await tx.tenant.create({
      data: { name: target.name || target.email.split('@')[0] || 'Hesabım', trialEndsAt: new Date() },
    });
    await tx.user.update({
      where: { id: userId },
      data: { tenantId: t.id, role: 'OWNER', sessionVersion: { increment: 1 } },
    });
    await tx.alertConfig.create({ data: { tenantId: t.id } });
    await teamChanged(actor.tenantId, userId, 'member_removed', tx);
  });
  await audit({
    action: 'member.remove',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'user',
    targetId: userId,
    meta: { role: target.role },
    req: opts.req,
  });
}

/**
 * Sahipliği devreder: hedef OWNER olur, devreden ADMIN'e düşer. İki kullanıcının da sessionVersion'ı
 * artar (oturum çerezi ve Realtime token'ı yenilenmeli). Rota `requireActor({ role:'OWNER', directOnly:true })`
 * ile korunur; burada yarış koşuluna karşı satır düzeyinde tekrar doğrulanır.
 */
export async function transferOwnership(
  actor: Actor,
  targetUserId: string,
  opts: TeamOpts = {},
): Promise<{ newOwnerId: string; previousOwnerId: string }> {
  if (actor.role !== 'OWNER') throw new ForbiddenError('Sahipliği yalnızca hesap sahibi devredebilir');
  if (actor.viaAgency) throw new ForbiddenError('Sahiplik devri ajans üzerinden yapılamaz');
  if (!targetUserId || targetUserId === actor.userId) throw new ClientError('Sahipliği kendinize devredemezsiniz');
  const target = await prisma.user.findFirst({ where: { id: targetUserId, tenantId: actor.tenantId } });
  if (!target) throw new NotFoundError('Üye bulunamadı');
  if (target.role === 'OWNER') throw new ConflictError('Bu üye zaten hesap sahibi');
  if (!target.emailVerifiedAt) throw new ConflictError('E-postası doğrulanmamış bir üyeye sahiplik devredilemez');

  await prisma.$transaction(async (tx) => {
    const me = await tx.user.updateMany({
      where: { id: actor.userId, tenantId: actor.tenantId, role: 'OWNER' },
      data: { role: 'ADMIN', sessionVersion: { increment: 1 } },
    });
    if (me.count !== 1) throw new ConflictError('Sahiplik durumu değişti; sayfayı yenileyip tekrar deneyin');
    const them = await tx.user.updateMany({
      where: { id: target.id, tenantId: actor.tenantId },
      data: { role: 'OWNER', sessionVersion: { increment: 1 } },
    });
    if (them.count !== 1) throw new ConflictError('Üye bu sırada ekipten ayrıldı');
    await teamChanged(actor.tenantId, target.id, 'ownership_transferred', tx);
  });
  await audit({
    action: 'owner.transfer',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'user',
    targetId: target.id,
    meta: { from: actor.userId },
    req: opts.req,
  });
  return { newOwnerId: target.id, previousOwnerId: actor.userId };
}

/**
 * Son aktivite damgası — 10 dakikadan eskiyse (veya boşsa) güncellenir. Fire-and-forget:
 * hata ana isteği bozmaz. Dashboard layout `after()` ile çağırır.
 */
export async function touchLastActive(userId: string): Promise<void> {
  try {
    const threshold = new Date(Date.now() - ACTIVE_TOUCH_MS);
    await prisma.user.updateMany({
      where: { id: userId, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: threshold } }] },
      data: { lastActiveAt: new Date() },
    });
  } catch (err) {
    log.warn('team.touch_last_active_failed', { err });
  }
}
