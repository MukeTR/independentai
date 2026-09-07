/**
 * TrackedSite yaşam döngüsü: ekleme, anahtarlar, doğrulama, duraklatma, iptal, kurulum sağlığı.
 *
 * Anahtar modeli:
 *  - **Public write key** (`iais_…`): sitenin HTML'ine gömülür, herkes görebilir. Yalnızca olay
 *    YAZAR; okuma/yönetim yetkisi vermez. DB'de yalnızca sha256 özeti tutulur.
 *  - **Ingest secret** (`iaix_…`): sunucu/edge telemetrisi için HMAC anahtarı. Ayrı rotate edilir,
 *    yalnızca bir kez gösterilir, özeti saklanır.
 *
 * Doğrulama: alan adı sahipliği ya kayıtlı origin'den gelen ilk geçerli olayla (script gerçekten
 * o sitede çalışıyor) ya da sayfaya konan meta etiketiyle kanıtlanır.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { TrackedSite, TrackedSiteStatus } from '@independentai/db';
import { prisma } from '../prisma';
import { ClientError, ConflictError, NotFoundError, PlanLimitError } from '../errors';
import { audit } from '../audit';
import { safeFetch } from '../safe-fetch';
import { decrypt, encrypt } from '../crypto';
import type { Actor } from '../authz';
import { normalizeHost, normalizeOrigin } from './events';

export const PUBLIC_KEY_PREFIX = 'iais_';
export const INGEST_SECRET_PREFIX = 'iaix_';
/** Ham olay saklama: plan dışı üst sınır (rollup'lar kalıcıdır). */
export const MAX_RETENTION_DAYS = 365;
export const MIN_RETENTION_DAYS = 7;

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

function newKey(prefix: string): { key: string; hash: string; display: string } {
  const key = `${prefix}${randomBytes(24).toString('base64url')}`;
  return { key, hash: hashKey(key), display: `${key.slice(0, prefix.length + 6)}…` };
}

/** API/UI'ya dönen güvenli görünüm — hiçbir anahtar/özet dışarı çıkmaz. */
export type TrackedSiteView = {
  id: string;
  domain: string;
  normalizedOrigin: string;
  allowedOrigins: string[];
  status: TrackedSiteStatus;
  siteKind: string | null;
  installMethod: string | null;
  publicKeyPrefix: string;
  hasIngestSecret: boolean;
  ingestSecretPrefix: string | null;
  verifiedAt: string | null;
  lastBrowserEventAt: string | null;
  lastServerEventAt: string | null;
  lastSdkVersion: string | null;
  retentionDays: number;
  createdAt: string;
  health: SiteHealth;
};

export type SiteHealth = {
  /** Tarayıcı SDK'sı olay gönderiyor mu */
  browser: 'ok' | 'stale' | 'missing';
  /** Sunucu/edge telemetrisi bağlı mı (crawler ölçümü için gerekli) */
  server: 'ok' | 'stale' | 'missing';
  verified: boolean;
  /** Kullanıcıya gösterilecek kısa öneriler */
  hints: string[];
};

const STALE_MS = 48 * 3_600_000;

export function computeHealth(site: TrackedSite, now = Date.now()): SiteHealth {
  const age = (d: Date | null) => (d ? now - d.getTime() : Infinity);
  const browserAge = age(site.lastBrowserEventAt);
  const serverAge = age(site.lastServerEventAt);
  const browser = browserAge === Infinity ? 'missing' : browserAge > STALE_MS ? 'stale' : 'ok';
  const server = serverAge === Infinity ? 'missing' : serverAge > STALE_MS ? 'stale' : 'ok';
  const hints: string[] = [];
  if (browser === 'missing')
    hints.push('Script sitede bulunamadı: snippet <head> içine eklenmiş ve sayfa yayında olmalı.');
  if (browser === 'stale')
    hints.push(
      'Son 48 saatte tarayıcı olayı gelmedi; snippet kaldırılmış veya reklam engelleyici/CSP bloklamış olabilir.',
    );
  if (server === 'missing')
    hints.push(
      'Crawler ölçümü için sunucu/edge bağlantısı gerekir: JavaScript çalıştırmayan botlar script ile görülemez.',
    );
  if (site.status === 'PAUSED') hints.push('Ölçüm duraklatıldı; yeni olay kabul edilmiyor.');
  if (site.status === 'REVOKED') hints.push('Anahtarlar iptal edildi; ingest reddediliyor.');
  return { browser, server, verified: !!site.verifiedAt, hints };
}

export function toView(site: TrackedSite): TrackedSiteView {
  return {
    id: site.id,
    domain: site.domain,
    normalizedOrigin: site.normalizedOrigin,
    allowedOrigins: site.allowedOrigins,
    status: site.status,
    siteKind: site.siteKind,
    installMethod: site.installMethod,
    publicKeyPrefix: site.publicKeyPrefix,
    hasIngestSecret: !!site.ingestSecretEnc,
    ingestSecretPrefix: site.ingestSecretPrefix,
    verifiedAt: site.verifiedAt?.toISOString() ?? null,
    lastBrowserEventAt: site.lastBrowserEventAt?.toISOString() ?? null,
    lastServerEventAt: site.lastServerEventAt?.toISOString() ?? null,
    lastSdkVersion: site.lastSdkVersion,
    retentionDays: site.retentionDays,
    createdAt: site.createdAt.toISOString(),
    health: computeHealth(site),
  };
}

export const SITE_KINDS = ['saas', 'service', 'media', 'education', 'marketplace', 'ecommerce', 'other'] as const;
export type SiteKind = (typeof SITE_KINDS)[number];

export const INSTALL_METHODS = [
  'script',
  'gtm',
  'wordpress',
  'nextjs',
  'nuxt',
  'webflow',
  'framer',
  'wix',
  'squarespace',
  'cloudflare',
  'server',
  'other',
] as const;

function cleanKind(raw: unknown): SiteKind | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return (SITE_KINDS as readonly string[]).includes(v) ? (v as SiteKind) : null;
}

function cleanInstall(raw: unknown): string | null {
  const v = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return (INSTALL_METHODS as readonly string[]).includes(v) ? v : null;
}

/** Kullanıcının girdiği adresten domain + kanonik origin üretir. */
export function parseSiteInput(raw: unknown): { domain: string; origin: string } {
  const host = normalizeHost(raw);
  if (!host) throw new ClientError('Geçerli bir alan adı girin (örn. ornek.com)');
  const origin = normalizeOrigin(`https://${host}`);
  if (!origin) throw new ClientError('Geçerli bir alan adı girin (örn. ornek.com)');
  return { domain: host, origin };
}

/** Origin allowlist'i: kanonik origin + www + kullanıcı ekleri (exact eşleşme, wildcard yok). */
export function buildAllowedOrigins(origin: string, extra: unknown): string[] {
  const set = new Set<string>([origin]);
  const u = new URL(origin);
  set.add(`${u.protocol}//www.${u.hostname}`);
  if (Array.isArray(extra)) {
    for (const item of extra.slice(0, 20)) {
      const norm = normalizeOrigin(item);
      if (norm) set.add(norm);
    }
  }
  return [...set];
}

export async function listSites(tenantId: string): Promise<TrackedSiteView[]> {
  const sites = await prisma.trackedSite.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  return sites.map(toView);
}

export async function getOwnedSite(actor: Actor, id: string): Promise<TrackedSite> {
  const site = await prisma.trackedSite.findFirst({ where: { id, tenantId: actor.tenantId } });
  if (!site) throw new NotFoundError('Site bulunamadı');
  return site;
}

export async function createSite(
  actor: Actor,
  input: { domain: unknown; siteKind?: unknown; installMethod?: unknown; allowedOrigins?: unknown },
  req?: Request,
): Promise<{ site: TrackedSiteView; publicKey: string }> {
  const { domain, origin } = parseSiteInput(input.domain);
  const limit = actor.entitlement.limits.trackedSites;

  const key = newKey(PUBLIC_KEY_PREFIX);
  const site = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Tenant" WHERE id = ${actor.tenantId} FOR UPDATE`;
    const existing = await tx.trackedSite.findUnique({
      where: { tenantId_domain: { tenantId: actor.tenantId, domain } },
    });
    if (existing) throw new ConflictError('Bu alan adı zaten ekli');
    const count = await tx.trackedSite.count({ where: { tenantId: actor.tenantId } });
    if (count >= limit) throw new PlanLimitError(`Site sınırı (${limit}) doldu`);
    return tx.trackedSite.create({
      data: {
        tenantId: actor.tenantId,
        domain,
        normalizedOrigin: origin,
        allowedOrigins: buildAllowedOrigins(origin, input.allowedOrigins),
        publicKeyHash: key.hash,
        publicKeyPrefix: key.display,
        siteKind: cleanKind(input.siteKind),
        installMethod: cleanInstall(input.installMethod),
        createdById: actor.userId,
      },
    });
  });

  await audit({
    action: 'discovery.site_create',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'tracked_site',
    targetId: site.id,
    meta: { domain },
    req,
  });
  return { site: toView(site), publicKey: key.key };
}

export async function updateSite(
  actor: Actor,
  id: string,
  patch: {
    status?: unknown;
    allowedOrigins?: unknown;
    retentionDays?: unknown;
    siteKind?: unknown;
    installMethod?: unknown;
  },
  req?: Request,
): Promise<TrackedSiteView> {
  const site = await getOwnedSite(actor, id);
  const data: Record<string, unknown> = {};

  if (patch.status !== undefined) {
    const s = patch.status;
    if (s !== 'ACTIVE' && s !== 'PAUSED' && s !== 'REVOKED') throw new ClientError('Geçersiz durum');
    if (site.status === 'REVOKED' && s !== 'REVOKED') {
      throw new ConflictError('İptal edilmiş site yeniden açılamaz; yeni anahtar üretin');
    }
    data.status = s;
  }
  if (patch.allowedOrigins !== undefined) {
    data.allowedOrigins = buildAllowedOrigins(site.normalizedOrigin, patch.allowedOrigins);
  }
  if (patch.retentionDays !== undefined) {
    const n = Number(patch.retentionDays);
    if (!Number.isFinite(n) || n < MIN_RETENTION_DAYS || n > MAX_RETENTION_DAYS) {
      throw new ClientError(`Saklama süresi ${MIN_RETENTION_DAYS}-${MAX_RETENTION_DAYS} gün arası olmalı`);
    }
    data.retentionDays = Math.floor(n);
  }
  if (patch.siteKind !== undefined) data.siteKind = cleanKind(patch.siteKind);
  if (patch.installMethod !== undefined) data.installMethod = cleanInstall(patch.installMethod);

  const updated = await prisma.trackedSite.update({ where: { id: site.id }, data });
  await audit({
    action: 'discovery.site_update',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'tracked_site',
    targetId: site.id,
    meta: { fields: Object.keys(data) },
    req,
  });
  return toView(updated);
}

/** Public key'i döndürür (eski anahtar anında geçersizdir). */
export async function rotatePublicKey(
  actor: Actor,
  id: string,
  req?: Request,
): Promise<{ publicKey: string; site: TrackedSiteView }> {
  const site = await getOwnedSite(actor, id);
  const key = newKey(PUBLIC_KEY_PREFIX);
  const updated = await prisma.trackedSite.update({
    where: { id: site.id },
    data: {
      publicKeyHash: key.hash,
      publicKeyPrefix: key.display,
      status: site.status === 'REVOKED' ? 'PENDING' : site.status,
    },
  });
  await audit({
    action: 'discovery.key_rotate',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'tracked_site',
    targetId: site.id,
    req,
  });
  return { publicKey: key.key, site: toView(updated) };
}

export async function rotateIngestSecret(
  actor: Actor,
  id: string,
  req?: Request,
): Promise<{ secret: string; site: TrackedSiteView }> {
  const site = await getOwnedSite(actor, id);
  const key = newKey(INGEST_SECRET_PREFIX);
  const updated = await prisma.trackedSite.update({
    where: { id: site.id },
    // HMAC doğrulaması paylaşılan sırrı gerektirir → AES-GCM ile ŞİFRELİ saklanır (özet yetmez).
    data: { ingestSecretEnc: encrypt(key.key), ingestSecretPrefix: key.display },
  });
  await audit({
    action: 'discovery.secret_rotate',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'tracked_site',
    targetId: site.id,
    req,
  });
  return { secret: key.key, site: toView(updated) };
}

/** Siteyi ve (istenirse) tüm telemetri verisini siler. */
export async function deleteSite(actor: Actor, id: string, req?: Request): Promise<void> {
  const site = await getOwnedSite(actor, id);
  await prisma.trackedSite.delete({ where: { id: site.id } }); // cascade: oturum/olay/rollup
  await audit({
    action: 'discovery.site_delete',
    tenantId: actor.tenantId,
    actorUserId: actor.userId,
    targetType: 'tracked_site',
    targetId: site.id,
    meta: { domain: site.domain },
    req,
  });
}

/** Meta etiketiyle sahiplik doğrulaması: `<meta name="independentai-site-verification" content="…">`. */
export function verificationToken(site: Pick<TrackedSite, 'id' | 'publicKeyHash'>): string {
  return createHash('sha256').update(`${site.id}:${site.publicKeyHash}`).digest('hex').slice(0, 32);
}

export async function verifyByMetaTag(actor: Actor, id: string): Promise<{ verified: boolean; reason: string }> {
  const site = await getOwnedSite(actor, id);
  if (site.verifiedAt) return { verified: true, reason: 'already_verified' };
  const token = verificationToken(site);
  const res = await safeFetch(site.normalizedOrigin, { timeout: 10_000 }).catch(() => null);
  if (!res || !res.ok) return { verified: false, reason: 'site_unreachable' };
  const re = new RegExp(`<meta[^>]+name=["']independentai-site-verification["'][^>]+content=["']${token}["']`, 'i');
  const reAlt = new RegExp(`<meta[^>]+content=["']${token}["'][^>]+name=["']independentai-site-verification["']`, 'i');
  if (!re.test(res.text) && !reAlt.test(res.text)) return { verified: false, reason: 'meta_tag_not_found' };
  await prisma.trackedSite.update({ where: { id: site.id }, data: { verifiedAt: new Date() } });
  return { verified: true, reason: 'meta_tag' };
}

/** Collector: public key'den site çözümleme (yalnızca yazma yetkisi verir). */
export async function resolveSiteByPublicKey(rawKey: string): Promise<TrackedSite | null> {
  if (!rawKey || !rawKey.startsWith(PUBLIC_KEY_PREFIX) || rawKey.length > 120) return null;
  return prisma.trackedSite.findUnique({ where: { publicKeyHash: hashKey(rawKey) } });
}

/** Origin allowlist kontrolü — exact eşleşme; wildcard veya substring yok. */
export function originAllowed(
  site: Pick<TrackedSite, 'normalizedOrigin' | 'allowedOrigins'>,
  origin: string | null,
): boolean {
  if (!origin) return false;
  const norm = normalizeOrigin(origin);
  if (!norm) return false;
  return norm === site.normalizedOrigin || site.allowedOrigins.includes(norm);
}

/** Sunucu/edge ingest sırrını çözer (yalnızca imza doğrulaması için, bellekte). */
export function readIngestSecret(site: Pick<TrackedSite, 'ingestSecretEnc'>): string | null {
  if (!site.ingestSecretEnc) return null;
  try {
    return decrypt(site.ingestSecretEnc);
  } catch {
    return null; // şifreleme anahtarı döndürülmüş olabilir → yeniden üretilmeli
  }
}
