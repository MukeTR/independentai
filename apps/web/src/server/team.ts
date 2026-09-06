/**
 * Ekip yönetimi — üyeler, davetler, rol değişimi.
 * Kurallar:
 *  - OWNER: her şey. ADMIN: davet edebilir (ADMIN/VIEWER), üye çıkarabilir (OWNER hariç).
 *  - Son OWNER çıkarılamaz/düşürülemez. Kullanıcı kendini çıkaramaz (hesabı silme akışı ayrı).
 *  - Davet: e-posta + rol, 7 gün geçerli, tek kullanımlık hash'li token. Aynı e-postaya açık davet varsa yenilenir.
 *  - Kabul: davetli e-postası ile giriş yapmış/kayıt olmuş kullanıcı, TEK-KİŞİLİK kendi tenant'ında
 *    ise (başka üye yok) tenant'ı davet edenin tenant'ına taşınır ve boş tenant silinir.
 *    Çok üyeli bir tenant'ın sahibi başka tenant'a katılamaz (veri kaybı riski) — 409.
 */
import type { UserRole } from '@independentai/db';
import { prisma } from './prisma';
import { ClientError, ConflictError, ForbiddenError, NotFoundError, PlanLimitError } from './errors';
import { normalizeEmail } from './normalize';
import { hashToken, randomToken } from './auth-tokens';
import type { Actor } from './authz';
import { deleteTenantCascade } from './accounts';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function listMembers(tenantId: string) {
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
        createdAt: true,
        oauthProvider: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.teamInvite.findMany({
      where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { users, invites };
}

export async function createInvite(
  actor: Actor,
  input: { email?: unknown; role?: unknown },
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
    return tx.teamInvite.create({
      data: {
        tenantId: actor.tenantId,
        email,
        role,
        tokenHash: hashToken(token),
        invitedById: actor.userId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });
  });
  return { inviteId: inv.id, token, email, role };
}

export async function revokeInvite(actor: Actor, inviteId: string): Promise<void> {
  const res = await prisma.teamInvite.deleteMany({ where: { id: inviteId, tenantId: actor.tenantId } });
  if (res.count === 0) throw new NotFoundError('Davet bulunamadı');
}

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
  });
  // Kullanıcının eski tek-kişilik tenant'ı (örnek veri dahil) silinir.
  await deleteTenantCascade(oldTenantId);
  return { tenantId: inv.tenantId, role: inv.role };
}

export async function changeRole(actor: Actor, userId: string, role: unknown): Promise<void> {
  if (actor.role !== 'OWNER') throw new ForbiddenError('Rol değişimi yalnızca hesap sahibi tarafından yapılabilir');
  const next = role === 'OWNER' || role === 'ADMIN' || role === 'VIEWER' ? role : null;
  if (!next) throw new ClientError('Geçersiz rol');
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId: actor.tenantId } });
  if (!target) throw new NotFoundError('Üye bulunamadı');
  if (target.role === 'OWNER' && next !== 'OWNER') {
    const owners = await prisma.user.count({ where: { tenantId: actor.tenantId, role: 'OWNER' } });
    if (owners <= 1) throw new ConflictError('Hesabın en az bir sahibi olmalı');
  }
  await prisma.user.update({ where: { id: userId }, data: { role: next, sessionVersion: { increment: 1 } } });
}

export async function removeMember(actor: Actor, userId: string): Promise<void> {
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
  });
}
