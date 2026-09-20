/**
 * TLS probu — sertifika bitişi, veren, hostname eşleşmesi, protokol ve eski TLS (1.0/1.1) desteği.
 *  - SSRF: önce `assertPublicUrl` (DNS'te tüm adresler doğrulanır), sonra `tls.connect({ lookup: guardedLookup })`
 *    ile aynı doğrulama soketin kendi çözümlemesinde tekrar uygulanır (özel ağa bağlanılamaz).
 *  - En fazla 2 bağlantı: (1) `rejectUnauthorized:false` ile sertifikayı OKUMAK için (geçersiz sertifika da
 *    raporlanır), (2) `LEGACY_HANDSHAKE` (`minVersion:'TLSv1'`, `maxVersion:'TLSv1.1'`, `ciphers:'DEFAULT:@SECLEVEL=0'`)
 *    ile eski protokol açık mı. Node 22 / OpenSSL 3'te `maxVersion` tek başına yetmez: `tls.DEFAULT_MIN_VERSION`
 *    TLSv1.2 olduğundan ve seclevel≥1 TLS≤1.1'i kapattığından el sıkışma HER host için
 *    ERR_SSL_NO_PROTOCOLS_AVAILABLE ile düşer — o yüzden min sürüm ve seclevel açıkça verilir.
 *  - Eski TLS hatası sınıflandırması (`classifyLegacyError`): sunucu reddi (alert / protocol version /
 *    handshake failure / ECONNRESET) → `false`; zaman aşımı, istemci tarafı kurulum hataları (ERR_SSL_*, ERR_TLS_*),
 *    DNS/bağlantı hataları → `null` (ölçülemedi — asla "kapalı" iddiası yok).
 *  - Hata → `ok:false, error` (araç warn "ölçülemedi"; asla fail). Node runtime gerekir (Edge değil).
 */
import { connect as tlsConnect, checkServerIdentity, type ConnectionOptions, type TLSSocket } from 'node:tls';
import { assertPublicUrl, guardedLookup } from '../safe-fetch';

export type TlsProbe = {
  ok: boolean;
  /** ISO tarih */
  validTo: string | null;
  validFrom: string | null;
  daysLeft: number | null;
  issuer: string | null;
  subject: string | null;
  hostnameMatch: boolean | null;
  /** Zincir doğrulandı mı (sistem CA'ları) */
  authorized: boolean | null;
  authorizationError: string | null;
  protocol: string | null;
  /** TLS 1.0/1.1 ile el sıkışma kabul ediliyor mu; ölçülemediyse null */
  legacyTls: boolean | null;
  error?: string;
};

export type ProbeOptions = {
  timeoutMs?: number;
  /** Test için: tls.connect yerine geçer */
  connect?: typeof tlsConnect;
  /** Test için: assertPublicUrl yerine geçer */
  assertPublic?: (url: string) => Promise<unknown>;
};

const DAY = 86_400_000;

/** İkinci el sıkışma seçenekleri — dışa aktarılır (test `connects[1]` üzerinde doğrular). */
export const LEGACY_HANDSHAKE: Readonly<Pick<ConnectionOptions, 'minVersion' | 'maxVersion' | 'ciphers'>> = {
  minVersion: 'TLSv1',
  maxVersion: 'TLSv1.1',
  ciphers: 'DEFAULT:@SECLEVEL=0',
};

/**
 * Sunucunun eski protokolü REDDETTİĞİNİ gösteren izler — OpenSSL alert'leri Node'da `ERR_SSL_*` koduyla gelir
 * (ör. `ERR_SSL_TLSV1_ALERT_PROTOCOL_VERSION`, mesaj "tlsv1 alert protocol version … alert number 70"), bağlantı
 * kapatma `ECONNRESET`/`EPIPE`/"socket hang up" olur. `ERR_SSL_NO_PROTOCOLS_AVAILABLE` gibi istemci tarafı kurulum
 * hataları ve DNS/bağlantı hataları bu listede DEĞİLDİR (→ null).
 */
const LEGACY_REJECTED_RE =
  /_ALERT_|alert number|tlsv1 alert|sslv3 alert|protocol version|handshake failure|unsupported protocol|version too low|inappropriate fallback|ECONNRESET|EPIPE|socket hang up/i;

/**
 * İkinci el sıkışmanın hatasını `legacyTls` değerine çevirir: yalnız sunucu reddi `false`; zaman aşımı, istemci
 * tarafı (ERR_SSL_NO_PROTOCOLS_AVAILABLE, senkron kurulum hatası) ve ağ/DNS hataları `null` (ölçülemedi).
 */
export function classifyLegacyError(err: Error): false | null {
  const code = String((err as NodeJS.ErrnoException).code ?? '');
  const msg = err.message ?? '';
  if (/zaman aşımı|timeout|timed out/i.test(msg) || /TIMEOUT/i.test(code)) return null;
  if (LEGACY_REJECTED_RE.test(code) || LEGACY_REJECTED_RE.test(msg)) return false;
  return null;
}

type CertInfo = {
  valid_to?: string;
  valid_from?: string;
  issuer?: Record<string, string | string[]>;
  subject?: Record<string, string | string[]>;
  subjectaltname?: string;
};

function nameOf(entry: Record<string, string | string[]> | undefined): string | null {
  if (!entry) return null;
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return pick(entry.O) ?? pick(entry.CN) ?? null;
}

function handshake(
  connect: typeof tlsConnect,
  host: string,
  timeoutMs: number,
  extra: Partial<ConnectionOptions>,
): Promise<{ socket: TLSSocket } | { error: Error }> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: { socket: TLSSocket } | { error: Error }) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    let socket: TLSSocket;
    try {
      socket = connect({
        host,
        port: 443,
        servername: host,
        lookup: guardedLookup as never,
        timeout: timeoutMs,
        rejectUnauthorized: false,
        ...extra,
      });
    } catch (err) {
      done({ error: err instanceof Error ? err : new Error(String(err)) });
      return;
    }
    const timer = setTimeout(() => {
      try {
        socket.destroy();
      } catch {
        /* yoksay */
      }
      done({ error: new Error('Zaman aşımı') });
    }, timeoutMs + 200);
    socket.once('secureConnect', () => {
      clearTimeout(timer);
      done({ socket });
    });
    socket.once('error', (err: Error) => {
      clearTimeout(timer);
      done({ error: err });
    });
    socket.once('timeout', () => {
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {
        /* yoksay */
      }
      done({ error: new Error('Zaman aşımı') });
    });
  });
}

function close(socket: TLSSocket): void {
  try {
    socket.end();
    socket.destroy();
  } catch {
    /* yoksay */
  }
}

export async function probeTls(hostname: string, opts: ProbeOptions = {}): Promise<TlsProbe> {
  const timeoutMs = opts.timeoutMs ?? 5_000;
  const connect = opts.connect ?? tlsConnect;
  const host = hostname.trim().toLowerCase().replace(/\.$/, '');
  const fail = (error: string): TlsProbe => ({
    ok: false,
    validTo: null,
    validFrom: null,
    daysLeft: null,
    issuer: null,
    subject: null,
    hostnameMatch: null,
    authorized: null,
    authorizationError: null,
    protocol: null,
    legacyTls: null,
    error,
  });
  if (!host || !host.includes('.')) return fail('Geçersiz alan adı');
  try {
    await (opts.assertPublic ?? assertPublicUrl)(`https://${host}/`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Adres doğrulanamadı');
  }

  const first = await handshake(connect, host, timeoutMs, {});
  if ('error' in first) return fail(first.error.message || 'TLS bağlantısı kurulamadı');
  const socket = first.socket;
  let out: TlsProbe;
  try {
    const cert = (socket.getPeerCertificate?.(false) ?? {}) as CertInfo;
    const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
    const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
    const validToOk = validTo && !Number.isNaN(validTo.getTime()) ? validTo : null;
    const identityErr =
      cert && (cert.subject || cert.subjectaltname) ? checkServerIdentity(host, cert as never) : undefined;
    out = {
      ok: true,
      validTo: validToOk ? validToOk.toISOString() : null,
      validFrom: validFrom && !Number.isNaN(validFrom.getTime()) ? validFrom.toISOString() : null,
      daysLeft: validToOk ? Math.floor((validToOk.getTime() - Date.now()) / DAY) : null,
      issuer: nameOf(cert.issuer),
      subject: nameOf(cert.subject),
      hostnameMatch: cert.subject || cert.subjectaltname ? !identityErr : null,
      authorized: typeof socket.authorized === 'boolean' ? socket.authorized : null,
      authorizationError: socket.authorizationError ? String(socket.authorizationError) : null,
      protocol: socket.getProtocol?.() ?? null,
      legacyTls: null,
    };
  } finally {
    close(socket);
  }

  // İkinci (ve son) bağlantı: TLS ≤1.1 kabul ediliyor mu? (min sürüm + seclevel açıkça düşürülür; üstteki not)
  const legacy = await handshake(connect, host, Math.min(timeoutMs, 4_000), { ...LEGACY_HANDSHAKE });
  if ('socket' in legacy) {
    out.legacyTls = true;
    close(legacy.socket);
  } else {
    out.legacyTls = classifyLegacyError(legacy.error);
  }
  return out;
}
