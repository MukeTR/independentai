/**
 * Hesap yaşam döngüsü — kayıt, OAuth eşleme, onboarding, silme, dışa aktarma.
 * Tüm çok-tablolu yazımlar TEK transaction içinde; yarım tenant kalmaz.
 */
import { Prisma } from '@independentai/db';
import { FREE_TRIAL_MONTHS } from '@independentai/shared';
import { prisma } from './prisma';
import { hashPassword } from './password';
import { ClientError, ConflictError, PlanLimitError } from './errors';
import {
  cleanAliases,
  cleanName,
  cleanPromptText,
  cleanWebsite,
  foldKey,
  normalizeEmail,
  validatePassword,
  LIMITS,
} from './normalize';
import { computeEntitlement } from './entitlement';
import { log } from './logger';

export function trialEnd(from = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + FREE_TRIAL_MONTHS);
  return d;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

// ───────────── Kayıt (e-posta/şifre) ─────────────

export async function registerWithPassword(input: {
  email?: unknown;
  password?: unknown;
  companyName?: unknown;
  website?: unknown;
}) {
  const email = normalizeEmail(input.email);
  const password = validatePassword(input.password);
  const companyName = cleanName(input.companyName, 'Şirket adı', LIMITS.companyName);
  const website = cleanWebsite(input.website);

  try {
    return await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: companyName, website, trialEndsAt: trialEnd() } });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email,
          passwordHash: hashPassword(password),
          role: 'OWNER',
          lastLoginAt: new Date(),
        },
      });
      await tx.alertConfig.create({ data: { tenantId: tenant.id } });
      return { user, tenant };
    });
  } catch (err) {
    // Yarış: aynı e-posta ile eşzamanlı iki kayıt → unique ihlali → 409 (tenant da rollback olur).
    if (isUniqueViolation(err)) throw new ConflictError('Bu e-posta zaten kayıtlı');
    throw err;
  }
}

// ───────────── OAuth eşleme ─────────────

export type OAuthProfile = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
};

/**
 *  1) (provider, sub) ile varsa → o kullanıcı.
 *  2) Aynı e-postalı hesap varsa → YALNIZCA provider e-postayı doğrulamışsa bağlanır
 *     (doğrulanmamış e-posta ile otomatik bağlama = hesap ele geçirme riski). Aksi halde
 *     `email_unverified` hatasıyla reddedilir; kullanıcı şifreyle girip ayarlardan bağlayabilir.
 *  3) Yoksa yeni Tenant + User (tek transaction).
 */
export async function upsertOAuthUser(provider: 'google' | 'linkedin', profile: OAuthProfile) {
  const byOauth = await prisma.user.findFirst({ where: { oauthProvider: provider, oauthSub: profile.sub } });
  if (byOauth) {
    await prisma.user.update({ where: { id: byOauth.id }, data: { lastLoginAt: new Date() } });
    return {
      userId: byOauth.id,
      tenantId: byOauth.tenantId,
      email: byOauth.email,
      sessionVersion: byOauth.sessionVersion,
      isNew: false as const,
    };
  }

  const email = profile.email ? normalizeEmail(profile.email) : null;
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      if (!profile.emailVerified) throw new ClientError('oauth_email_unverified');
      const updated = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          oauthProvider: provider,
          oauthSub: profile.sub,
          avatarUrl: byEmail.avatarUrl ?? profile.picture ?? undefined,
          name: byEmail.name ?? profile.name ?? undefined,
          emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
          lastLoginAt: new Date(),
        },
      });
      return {
        userId: updated.id,
        tenantId: updated.tenantId,
        email: updated.email,
        sessionVersion: updated.sessionVersion,
        isNew: false as const,
      };
    }
  }

  // Yeni kullanıcı — e-posta doğrulanmamışsa yine de hesap açılır ama emailVerifiedAt boş kalır.
  const finalEmail = email ?? `${provider}_${profile.sub}@users.independentai.space`;
  const tenantName = (profile.name || finalEmail.split('@')[0] || 'Markam').slice(0, LIMITS.companyName);
  try {
    const { user, tenant } = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: tenantName, trialEndsAt: trialEnd() } });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: finalEmail,
          name: profile.name,
          avatarUrl: profile.picture,
          oauthProvider: provider,
          oauthSub: profile.sub,
          role: 'OWNER',
          emailVerifiedAt: email && profile.emailVerified ? new Date() : null,
          lastLoginAt: new Date(),
        },
      });
      await tx.alertConfig.create({ data: { tenantId: tenant.id } });
      return { user, tenant };
    });
    return {
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      sessionVersion: user.sessionVersion,
      isNew: true as const,
    };
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError('Bu e-posta zaten kayıtlı');
    throw err;
  }
}

// ───────────── Onboarding (atomik) ─────────────

export type OnboardingInput = {
  brand: { name: unknown; aliases?: unknown; website?: unknown };
  competitors?: unknown;
  prompts?: unknown;
};

export async function completeOnboarding(tenantId: string, input: OnboardingInput) {
  const brandName = cleanName(input.brand?.name, 'Marka adı');
  const aliases = cleanAliases(input.brand?.aliases, brandName);
  const website = cleanWebsite(input.brand?.website);

  const compNames: string[] = [];
  const seenComp = new Set<string>([foldKey(brandName)]);
  for (const c of Array.isArray(input.competitors) ? input.competitors : []) {
    const name =
      typeof c === 'string' ? c : typeof c === 'object' && c && 'name' in c ? (c as { name: unknown }).name : '';
    const cleaned = cleanName(name, 'Rakip adı');
    const k = foldKey(cleaned);
    if (seenComp.has(k)) continue;
    seenComp.add(k);
    compNames.push(cleaned);
  }
  const promptTexts: string[] = [];
  const seenPrompt = new Set<string>();
  for (const p of Array.isArray(input.prompts) ? input.prompts : []) {
    const t = cleanPromptText(p);
    const k = foldKey(t);
    if (seenPrompt.has(k)) continue;
    seenPrompt.add(k);
    promptTexts.push(t);
  }
  if (promptTexts.length === 0) throw new ClientError('En az bir izlenecek soru ekleyin');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new ClientError('Hesap bulunamadı');
  const ent = computeEntitlement({ plan: tenant.plan, trialEndsAt: tenant.trialEndsAt });
  if (compNames.length > ent.limits.competitors)
    throw new PlanLimitError(`En fazla ${ent.limits.competitors} rakip ekleyebilirsiniz`);
  if (promptTexts.length > ent.limits.prompts)
    throw new PlanLimitError(`En fazla ${ent.limits.prompts} soru ekleyebilirsiniz`);

  return prisma.$transaction(async (tx) => {
    // Yeniden çağrılırsa (ör. sayfa yenileme): mevcut kendi markası varsa güncelle, yoksa oluştur.
    const existing = await tx.brand.findFirst({ where: { tenantId, isOwn: true }, orderBy: { createdAt: 'asc' } });
    const brand = existing
      ? await tx.brand.update({ where: { id: existing.id }, data: { name: brandName, aliases, website } })
      : await tx.brand.create({ data: { tenantId, isOwn: true, name: brandName, aliases, website } });

    const existingComps = await tx.competitor.findMany({ where: { tenantId }, select: { name: true } });
    const compKeys = new Set(existingComps.map((c) => foldKey(c.name)));
    const newComps = compNames.filter((n) => !compKeys.has(foldKey(n)));
    if (newComps.length)
      await tx.competitor.createMany({ data: newComps.map((name) => ({ tenantId, name, aliases: [] })) });

    const existingPrompts = await tx.prompt.findMany({ where: { tenantId }, select: { text: true } });
    const promptKeys = new Set(existingPrompts.map((p) => foldKey(p.text)));
    const newPrompts = promptTexts.filter((t) => !promptKeys.has(foldKey(t)));
    const created: { id: string }[] = [];
    for (const text of newPrompts) {
      created.push(
        await tx.prompt.create({
          data: { tenantId, text, language: 'tr', category: 'discovery' },
          select: { id: true },
        }),
      );
    }

    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        onboardingCompletedAt: tenant.onboardingCompletedAt ?? new Date(),
        ...(website && !tenant.website ? { website } : {}),
      },
    });
    return { brandId: brand.id, competitors: newComps.length, prompts: created.map((p) => p.id) };
  });
}

// ───────────── Silme / dışa aktarma (KVKK) ─────────────

export async function deleteTenantCascade(tenantId: string): Promise<void> {
  // Tenant'a bağlı ama FK'sız (skalar tenantId) tablolar önce temizlenir.
  await prisma.$transaction([
    prisma.citation.deleteMany({ where: { tenantId } }),
    prisma.audit.deleteMany({ where: { tenantId } }),
    prisma.pageEmbedding.deleteMany({ where: { tenantId } }),
    prisma.alertConfig.deleteMany({ where: { tenantId } }),
    prisma.brandFact.deleteMany({ where: { tenantId } }),
    prisma.apiToken.deleteMany({ where: { tenantId } }),
    prisma.notificationLog.deleteMany({ where: { tenantId } }),
    prisma.tenant.delete({ where: { id: tenantId } }), // User/Brand/Prompt/ModelRun/Mention/Invite cascade
  ]);
  log.info('tenant.deleted', { tenantId });
}

export async function exportTenantData(tenantId: string) {
  const [tenant, users, brands, competitors, prompts, facts, alert, tokens] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        website: true,
        industry: true,
        locale: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        oauthProvider: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    }),
    prisma.brand.findMany({ where: { tenantId } }),
    prisma.competitor.findMany({ where: { tenantId } }),
    prisma.prompt.findMany({
      where: { tenantId },
      include: {
        runs: {
          orderBy: { runDate: 'desc' },
          take: 500,
          select: {
            id: true,
            provider: true,
            modelName: true,
            runDate: true,
            status: true,
            responseText: true,
            citations: true,
            costUsd: true,
            latencyMs: true,
            isMocked: true,
            mentions: {
              select: {
                mentionName: true,
                isOwnBrand: true,
                isCompetitor: true,
                position: true,
                sentiment: true,
                mentionType: true,
                snippet: true,
              },
            },
          },
        },
      },
    }),
    prisma.brandFact.findMany({ where: { tenantId } }),
    prisma.alertConfig.findUnique({
      where: { tenantId },
      select: { emailEnabled: true, weeklyReportEnabled: true, visibilityDropThreshold: true },
    }),
    prisma.apiToken.findMany({
      where: { tenantId },
      select: { id: true, name: true, prefix: true, scopes: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    }),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    tenant,
    users,
    brands,
    competitors,
    prompts,
    brandFacts: facts,
    alertConfig: alert,
    apiTokens: tokens,
  };
}
