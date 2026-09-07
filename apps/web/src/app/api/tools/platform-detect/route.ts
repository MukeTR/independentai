import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { getActor } from '@/server/authz';
import { enforceRateLimit, LIMITS, type LimitSpec } from '@/server/rate-limit';
import { safeFetch, parsePublicUrl, UnsafeUrlError } from '@/server/safe-fetch';
import { normalizeAuditUrl } from '@/server/geo-audit';
import { detectPlatform, PLATFORM_LABELS } from '@/server/commerce/platform-detect';

export const maxDuration = 30;

/** Kayıtsız kullanıcı: IP başına 20/saat + küresel tavan; giriş yapmış: tenant başına LIMITS.tool. */
const PUBLIC_LIMIT: LimitSpec = {
  name: 'platform-detect',
  limit: 20,
  windowMs: 3_600_000,
  global: { limit: 1000, windowMs: 3_600_000 },
};

/**
 * Mağaza platformu tespiti — herkese açık HTML/başlık sinyallerinden (kimlik bilgisi yok, SSRF-güvenli).
 * Sonuç kanıt listesiyle döner; emin değilsek dürüstçe UNKNOWN.
 */
export const POST = route('tools.platform_detect', async (req) => {
  const actor = await getActor();
  if (actor) await enforceRateLimit(req, LIMITS.tool, `tenant:${actor.tenantId}`);
  else await enforceRateLimit(req, PUBLIC_LIMIT);

  const body = await readJson<{ url?: unknown }>(req);
  const raw = typeof body.url === 'string' ? body.url.trim() : '';
  if (raw.length < 3 || raw.length > 300) throw new ClientError('Geçersiz mağaza adresi');
  const url = normalizeAuditUrl(raw);
  try {
    parsePublicUrl(url);
  } catch (err) {
    throw new ClientError(err instanceof UnsafeUrlError ? err.message : 'Geçersiz mağaza adresi');
  }

  let res;
  try {
    res = await safeFetch(url, { timeout: 12_000, maxBytes: 512 * 1024 });
  } catch (err) {
    throw new ClientError(err instanceof UnsafeUrlError ? err.message : 'Siteye ulaşılamadı');
  }
  if (!res) throw new ClientError('Siteye ulaşılamadı (zaman aşımı veya ağ hatası)');
  if (!res.ok && !res.text) throw new ClientError(`Site ${res.status} durumu döndürdü; sayfa okunamadı`);

  const detection = detectPlatform(res.text, res.headers, res.url);
  return NextResponse.json({
    url: res.url,
    platform: detection.platform,
    label: PLATFORM_LABELS[detection.platform],
    confidence: Math.round(detection.confidence * 100) / 100,
    evidence: detection.evidence.slice(0, 6),
    connectorAvailable: detection.connectorAvailable,
    truncated: res.truncated,
  });
});
