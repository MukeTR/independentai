/**
 * Yasaklı siteler — admin tarafı doğrulama ve CRUD (server/blocklist.ts eşleşme çekirdeğinin üstünde).
 *
 *  - Girdi: `normalizeHostname` (küçük harf, şema/yol/www. atılır, punycode) + kamu son eki reddi (com.tr, co.uk,
 *    github.io … — yerel sabit liste; tam PSL gerekmez) + `isAllowedRedirectUrl` (https youtube.com / www.youtube.com /
 *    youtu.be) + not ≤300 karakter.
 *  - Her mutasyonda `clearBlocklistCache()` (60 sn bellek içi önbellek; diğer instance'larda en geç 60 sn'de görünür).
 *  - Audit: çağıran route `admin.blocked_site_create|update|delete` yazar.
 */
import type { Prisma } from '@independentai/db';
import { prisma } from './prisma';
import { ClientError, ConflictError, NotFoundError } from './errors';
import { clearBlocklistCache, findBlockedSite, isAllowedRedirectUrl, normalizeHostname } from './blocklist';

export const REDIRECT_URL_MESSAGE = 'Yalnızca youtube.com / youtu.be bağlantıları kabul edilir (https).';
export const NOTE_MAX = 300;

/**
 * Kamu son ekleri ve paylaşımlı barındırma alan adları — tek başına yasaklanamaz (tüm com.tr'yi kapatmak gibi).
 * Yerel sabit liste: TR ikinci seviye + yaygın ülke ikinci seviyeleri + paylaşımlı platform kökleri.
 */
export const PUBLIC_SUFFIX_HOSTNAMES: ReadonlySet<string> = new Set([
  // Türkiye
  'com.tr',
  'net.tr',
  'org.tr',
  'gov.tr',
  'edu.tr',
  'bel.tr',
  'av.tr',
  'dr.tr',
  'k12.tr',
  'pol.tr',
  'mil.tr',
  'tsk.tr',
  'kep.tr',
  'gen.tr',
  'biz.tr',
  'info.tr',
  'tv.tr',
  'web.tr',
  'name.tr',
  'tel.tr',
  'bbs.tr',
  // Diğer ülkeler (yaygın)
  'co.uk',
  'org.uk',
  'ac.uk',
  'gov.uk',
  'me.uk',
  'ltd.uk',
  'plc.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.jp',
  'ne.jp',
  'or.jp',
  'com.br',
  'net.br',
  'co.il',
  'org.il',
  'com.cn',
  'net.cn',
  'com.de',
  'co.de',
  'com.mx',
  'com.ar',
  'com.es',
  'com.pl',
  'co.za',
  'co.nz',
  'co.in',
  'com.sg',
  'com.hk',
  'co.kr',
  'com.ua',
  'com.eg',
  'com.sa',
  'com.qa',
  'co.id',
  'com.my',
  'com.ph',
  'com.vn',
  'com.pk',
  'com.bd',
  'com.ng',
  'co.ke',
  'com.gr',
  'com.cy',
  'com.az',
  'com.ge',
  'com.kz',
  // Paylaşımlı barındırma / platform kökleri
  'github.io',
  'gitlab.io',
  'vercel.app',
  'netlify.app',
  'herokuapp.com',
  'pages.dev',
  'workers.dev',
  'web.app',
  'firebaseapp.com',
  'appspot.com',
  'azurewebsites.net',
  'cloudfront.net',
  'amazonaws.com',
  'blogspot.com',
  'wordpress.com',
  'wixsite.com',
  'squarespace.com',
  'weebly.com',
  'webflow.io',
  'myshopify.com',
  'myikas.com',
  'shopier.com',
  'tumblr.com',
  'medium.com',
  'substack.com',
  'notion.site',
  'carrd.co',
  'linktr.ee',
]);

/** Kamu son eki mi (yerel liste; tek etiketli TLD'ler normalize aşamasında zaten reddedilir)? */
export function isPublicSuffixHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^www\./, '');
  return PUBLIC_SUFFIX_HOSTNAMES.has(h);
}

export type BlockedSiteInput = { hostname: string; redirectUrl: string; note: string | null };

function parseNote(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') throw new ClientError('Not metin olmalı');
  const s = raw.trim();
  if (!s) return null;
  if (s.length > NOTE_MAX) throw new ClientError(`Not en fazla ${NOTE_MAX} karakter olabilir`);
  return s;
}

function parseHostname(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) throw new ClientError('Alan adı boş olamaz');
  // Kamu son eki kontrolü normalize'dan ÖNCE: `normalizeHostname` bunları zaten null döndürür,
  // o yüzden kullanıcı "geçersiz alan adı" yerine gerçek nedeni görmeli.
  const bare = raw
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];
  if (bare && isPublicSuffixHostname(bare))
    throw new ClientError('Bu bir kamu son eki; tek bir alan adı girin (örn. firma.com.tr)');
  const hostname = normalizeHostname(raw);
  if (!hostname) throw new ClientError('Geçersiz alan adı (örn. firma.com; port, yol veya @ olmadan)');
  if (isPublicSuffixHostname(hostname))
    throw new ClientError('Bu bir kamu son eki; tek bir alan adı girin (örn. firma.com.tr)');
  return hostname;
}

function parseRedirectUrl(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) throw new ClientError('Yönlendirme bağlantısı boş olamaz');
  const url = raw.trim();
  if (!isAllowedRedirectUrl(url)) throw new ClientError(REDIRECT_URL_MESSAGE);
  return url;
}

/** Oluşturma gövdesi: hostname + redirectUrl zorunlu, note opsiyonel. */
export function parseBlockedSiteInput(body: unknown): BlockedSiteInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return { hostname: parseHostname(b.hostname), redirectUrl: parseRedirectUrl(b.redirectUrl), note: parseNote(b.note) };
}

/** Güncelleme gövdesi: verilen alanlar doğrulanır; en az bir alan şart. */
export function parseBlockedSitePatch(body: unknown): Partial<BlockedSiteInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const patch: Partial<BlockedSiteInput> = {};
  if (b.hostname !== undefined) patch.hostname = parseHostname(b.hostname);
  if (b.redirectUrl !== undefined) patch.redirectUrl = parseRedirectUrl(b.redirectUrl);
  if (b.note !== undefined) patch.note = parseNote(b.note);
  if (Object.keys(patch).length === 0) throw new ClientError('Güncellenecek alan yok');
  return patch;
}

export const BLOCKED_SITE_SELECT = {
  id: true,
  hostname: true,
  redirectUrl: true,
  note: true,
  hits: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BlockedSiteSelect;

export type BlockedSiteRow = Prisma.BlockedSiteGetPayload<{ select: typeof BLOCKED_SITE_SELECT }>;

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && (err as { code?: string }).code === 'P2002';
}

export async function listBlockedSites(take = 500): Promise<BlockedSiteRow[]> {
  return prisma.blockedSite.findMany({ orderBy: [{ createdAt: 'desc' }], take, select: BLOCKED_SITE_SELECT });
}

export async function createBlockedSite(input: BlockedSiteInput, createdById: string | null): Promise<BlockedSiteRow> {
  try {
    const row = await prisma.blockedSite.create({ data: { ...input, createdById }, select: BLOCKED_SITE_SELECT });
    clearBlocklistCache();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError('Bu alan adı zaten listede');
    throw err;
  }
}

export async function updateBlockedSite(id: string, patch: Partial<BlockedSiteInput>): Promise<BlockedSiteRow> {
  const exists = await prisma.blockedSite.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError('Kayıt bulunamadı');
  try {
    const row = await prisma.blockedSite.update({ where: { id }, data: patch, select: BLOCKED_SITE_SELECT });
    clearBlocklistCache();
    return row;
  } catch (err) {
    if (isUniqueViolation(err)) throw new ConflictError('Bu alan adı zaten listede');
    throw err;
  }
}

export async function deleteBlockedSite(id: string): Promise<BlockedSiteRow> {
  const row = await prisma.blockedSite.findUnique({ where: { id }, select: BLOCKED_SITE_SELECT });
  if (!row) throw new NotFoundError('Kayıt bulunamadı');
  await prisma.blockedSite.delete({ where: { id } });
  clearBlocklistCache();
  return row;
}

/** Admin "Test et" kutusu: eşleşme sonucu — hits ARTMAZ (blockedJson kullanılmaz). */
export async function testBlockedHost(
  raw: unknown,
): Promise<{ hostname: string | null; blocked: boolean; matched: string | null; redirectUrl: string | null }> {
  const hostname = normalizeHostname(raw);
  if (!hostname) return { hostname: null, blocked: false, matched: null, redirectUrl: null };
  const hit = await findBlockedSite(hostname);
  return { hostname, blocked: !!hit, matched: hit?.hostname ?? null, redirectUrl: hit?.redirectUrl ?? null };
}
