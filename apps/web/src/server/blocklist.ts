/**
 * Yasaklı siteler — admin listesindeki alan adları taranmaz; yanıt her uçta 200 `{blocked:true, redirectUrl}`.
 *  - Hostname normalize: küçük harf, şema/yol/`www.` atılır, punycode (domainToASCII); boşluk/@/port reddedilir.
 *  - Eşleşme: tam hostname + tüm üst alan adları (`a.b.acme.com` → `b.acme.com`, `acme.com`); kamu son ekleri
 *    (`tr`, `com.tr`, `co.uk` … — server/public-suffix.ts) aday listesine ALINMAZ ve tek başına yasaklanamaz.
 *  - 60 sn bellek içi önbellek (instance-yerel); DB hatasında null + log.warn (tarama engellenmez).
 *  - Yönlendirme hedefi yalnız https youtube.com / www.youtube.com / youtu.be (lib/blocked-redirect.ts ile aynı liste).
 */
import { domainToASCII } from 'node:url';
import { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { log } from './logger';
import { ClientError } from './errors';
import { isPublicSuffix, registrableLabelCount } from './public-suffix';
import { isAllowedRedirectUrl } from '@/lib/blocked-redirect';

export { isAllowedRedirectUrl, REDIRECT_HOSTS } from '@/lib/blocked-redirect';

export type BlockedSiteHit = { id: string; hostname: string; redirectUrl: string };

const LABEL_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
export const BLOCKLIST_CACHE_MS = 60_000;

/**
 * Normalize edilmiş hostname ya da null (geçersiz). Kamu son ekinin kendisi (`com.tr`, `co.uk`, `tr`) de geçersizdir:
 * bir site adı değildir ve yasaklanırsa tüm alt alan adlarını kapsardı.
 */
/** Şema ve yol/sorgu/fragment soyulmuş, küçük harfli host (+ olası port/userinfo; doğrulama çağıranda). */
function stripToHost(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  return s.split(/[/?#]/)[0] ?? '';
}

export function normalizeHostname(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  if (!raw.trim() || raw.trim().length > 253) return null;
  let s = stripToHost(raw);
  if (!s || /[\s@:]/.test(s)) return null;
  s = s.replace(/^www\./, '').replace(/\.$/, '');
  if (!s) return null;
  let ascii: string;
  try {
    ascii = domainToASCII(s);
  } catch {
    return null;
  }
  if (!ascii) return null;
  const labels = ascii.split('.');
  if (labels.length < 2) return null;
  if (!labels.every((l) => LABEL_RE.test(l))) return null;
  const tld = labels[labels.length - 1] ?? '';
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(tld)) return null; // salt sayısal TLD/IP değil
  if (isPublicSuffix(ascii)) return null; // com.tr, co.uk … tek başına site değil
  return ascii;
}

/**
 * Admin/API girişi: normalize eder; geçersizse ClientError (400). Kamu son eki için ayrı, açıklayıcı mesaj.
 * `findBlockedSite` bunu KULLANMAZ (sessizce null döner — tarama akışı bozulmaz).
 */
export function requireHostname(raw: unknown): string {
  // Son ek denetimi şema/yol/port soyulmuş ham girdi üzerinde: `https://com.tr/` de açıklayıcı mesaj alır.
  const bare =
    typeof raw === 'string'
      ? stripToHost(raw)
          .replace(/:\d+$/, '')
          .replace(/^www\./, '')
          .replace(/\.$/, '')
      : '';
  if (bare && isPublicSuffix(bare)) {
    throw new ClientError('Kamu son eki (ör. com.tr) tek başına yasaklanamaz; tam alan adı girin.');
  }
  const h = normalizeHostname(raw);
  if (!h) throw new ClientError('Geçersiz alan adı');
  return h;
}

/**
 * hostname + üst alan adları, kamu son eki hariç:
 *   a.b.acme.com    → [a.b.acme.com, b.acme.com, acme.com]
 *   a.b.acme.com.tr → [a.b.acme.com.tr, b.acme.com.tr, acme.com.tr]   (com.tr aday değildir)
 */
export function hostnameCandidates(hostname: string): string[] {
  const labels = hostname.split('.');
  const min = registrableLabelCount(hostname);
  const out: string[] = [];
  for (let i = 0; i <= labels.length - min; i += 1) out.push(labels.slice(i).join('.'));
  return out;
}

type CacheEntry = { at: number; value: BlockedSiteHit | null };
const cache = new Map<string, CacheEntry>();

export function clearBlocklistCache(): void {
  cache.clear();
}

/** Eşleşen en özgül kayıt (uzun hostname önce); yoksa null; DB hatasında null. */
export async function findBlockedSite(rawHostname: string): Promise<BlockedSiteHit | null> {
  const hostname = normalizeHostname(rawHostname);
  if (!hostname) return null;
  const now = Date.now();
  const hit = cache.get(hostname);
  if (hit && now - hit.at < BLOCKLIST_CACHE_MS) return hit.value;
  try {
    const rows = await prisma.blockedSite.findMany({
      where: { hostname: { in: hostnameCandidates(hostname) } },
      select: { id: true, hostname: true, redirectUrl: true },
    });
    const best = rows.sort((a, b) => b.hostname.length - a.hostname.length)[0] ?? null;
    const value = best && isAllowedRedirectUrl(best.redirectUrl) ? best : null;
    if (cache.size > 5000) cache.clear();
    cache.set(hostname, { at: now, value });
    return value;
  } catch (err) {
    log.warn('blocklist.lookup_failed', { hostname, err });
    return null;
  }
}

/** hits++ — best-effort (hata yutulur, loglanır). */
export async function recordBlockedHit(id: string): Promise<void> {
  try {
    await prisma.blockedSite.updateMany({ where: { id }, data: { hits: { increment: 1 } } });
  } catch (err) {
    log.warn('blocklist.hit_failed', { id, err });
  }
}

/** Ortak yanıt: 200 `{blocked:true, redirectUrl}` + hits++ (fetch/persist YOK). */
export function blockedJson(hit: BlockedSiteHit, headers?: Record<string, string>): NextResponse {
  void recordBlockedHit(hit.id);
  return NextResponse.json({ blocked: true, redirectUrl: hit.redirectUrl }, { headers });
}
