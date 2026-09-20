/**
 * Yasaklı site yanıtı — istemci tarafı. Sunucu `{blocked:true, redirectUrl}` (200) döndürür; istemci allowlist'i
 * YENİDEN doğrular (yalnız https youtube.com / www.youtube.com / youtu.be) ve sonra yönlendirir.
 * Sunucu importu yok; `server/blocklist.ts` aynı allowlist'i buradan alır.
 */

export const REDIRECT_HOSTS: ReadonlySet<string> = new Set(['youtube.com', 'www.youtube.com', 'youtu.be']);

export type BlockedResponse = { blocked: true; redirectUrl: string };

/** https + host ∈ REDIRECT_HOSTS; kimlik bilgisi ve port yok. Yol/sorgu serbest. */
export function isAllowedRedirectUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || raw.length > 2000) return false;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password || u.port) return false;
  return REDIRECT_HOSTS.has(u.hostname.toLowerCase());
}

export function isBlockedResponse(x: unknown): x is BlockedResponse {
  return (
    !!x &&
    typeof x === 'object' &&
    (x as { blocked?: unknown }).blocked === true &&
    typeof (x as { redirectUrl?: unknown }).redirectUrl === 'string'
  );
}

/**
 * Yanıt yasaklı site yanıtıysa ve hedef allowlist'teyse tarayıcıyı yönlendirir; true döner (çağıran akışı keser).
 * Aksi hâlde false — normal sonuç işleme devam eder.
 */
export function handleBlockedResponse(json: unknown): boolean {
  if (!isBlockedResponse(json)) return false;
  if (!isAllowedRedirectUrl(json.redirectUrl)) return false;
  if (typeof window !== 'undefined') window.location.assign(json.redirectUrl);
  return true;
}
