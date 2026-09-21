/**
 * SOAP 1.1 (WCF basicHttpBinding) yardımcıları — Ticimax `UrunServis.svc` için saf, test edilebilir
 * fonksiyonlar: zarf oluşturma, XML kaçışlama, yanıt çözümleme ve Fault tespiti.
 *
 * Doğrulanmış gerçekler (mağaza WSDL'i `Servis/UrunServis.svc?singleWsdl`):
 *  - İşlem elemanları `http://tempuri.org/` ad alanında; parametre adları `UyeKodu`, `f`, `s`,
 *    `kategoriID`, `markaID`; SOAPAction = `http://tempuri.org/IUrunServis/<İşlem>`.
 *  - Veri sözleşmesi tipleri (UrunFiltre, UrunSayfalama, UrunKarti, Varyasyon, Kategori, Marka)
 *    `http://schemas.datacontract.org/2004/07/` ad alanında; DataContractSerializer üyeleri şema
 *    sırasında (alfabetik) bekler → üyeler bu dosyadaki çağrılarda o sırada yazılır.
 *  - Diziler (`Resimler`, `Kategoriler`) `http://schemas.microsoft.com/2003/10/Serialization/Arrays`
 *    ad alanında `<string>`/`<int>` çocuklarıyla gelir.
 *  - Hatalı üye kodu: HTTP 500 + `<s:Fault><faultstring>Hatalı Kullanıcı Kodu</faultstring>` (canlı
 *    servisten gözlemlendi).
 *
 * Güvenlik: tüm değerler `escapeXml` ile kaçışlanır (XML injection yok); DOCTYPE içeren yanıtlar
 * varlık genişletme saldırısına karşı reddedilir.
 */
import { XMLParser } from 'fast-xml-parser';

export const SOAP_ENV_NS = 'http://schemas.xmlsoap.org/soap/envelope/';
export const TEMPURI_NS = 'http://tempuri.org/';
export const DATACONTRACT_NS = 'http://schemas.datacontract.org/2004/07/';
export const ARRAYS_NS = 'http://schemas.microsoft.com/2003/10/Serialization/Arrays';

/** XML metin/öznitelik kaçışlaması. Kontrol karakterleri (XML 1.0'da geçersiz) atılır. */
export function escapeXml(value: unknown): string {
  return (
    String(value ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  );
}

/** Zarfa yazılabilen değerler: ilkel, tarih, iç içe nesne (veri sözleşmesi) veya dizi. */
export type XmlValue = string | number | boolean | Date | null | undefined | XmlValue[] | { [k: string]: XmlValue };

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

function scalar(v: string | number | boolean | Date): string {
  if (v instanceof Date) return escapeXml(v.toISOString());
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '0';
  return escapeXml(v);
}

/**
 * Nesne üyelerini verilen ön ekle, EKLENME SIRASINDA XML elemanlarına çevirir (null/undefined atlanır).
 * İç içe nesneler veri sözleşmesi ad alanı (`tic:`) ile yazılır; diziler `<arr:string>`/`<arr:int>` olur.
 */
export function xmlMembers(prefix: string, obj: Record<string, XmlValue>): string {
  let out = '';
  for (const [name, v] of Object.entries(obj)) {
    if (!NAME_RE.test(name)) throw new Error(`Geçersiz XML eleman adı: ${name}`);
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      out += `<${prefix}:${name}>`;
      for (const item of v) {
        if (item === null || item === undefined || Array.isArray(item)) continue;
        if (typeof item === 'object' && !(item instanceof Date)) continue; // dizi içinde nesne desteklenmiyor
        const tag = typeof item === 'number' ? 'int' : typeof item === 'boolean' ? 'boolean' : 'string';
        out += `<arr:${tag}>${scalar(item)}</arr:${tag}>`;
      }
      out += `</${prefix}:${name}>`;
      continue;
    }
    if (typeof v === 'object' && !(v instanceof Date)) {
      out += `<${prefix}:${name}>${xmlMembers('tic', v)}</${prefix}:${name}>`;
      continue;
    }
    out += `<${prefix}:${name}>${scalar(v)}</${prefix}:${name}>`;
  }
  return out;
}

/** İşlem için tam SOAP 1.1 zarfı. Üst düzey parametreler `tem:` ad alanında yazılır. */
export function buildEnvelope(operation: string, params: Record<string, XmlValue>): string {
  if (!NAME_RE.test(operation)) throw new Error(`Geçersiz SOAP işlem adı: ${operation}`);
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soapenv:Envelope xmlns:soapenv="${SOAP_ENV_NS}" xmlns:tem="${TEMPURI_NS}" xmlns:tic="${DATACONTRACT_NS}" xmlns:arr="${ARRAYS_NS}">` +
    `<soapenv:Header/><soapenv:Body>` +
    `<tem:${operation}>${xmlMembers('tem', params)}</tem:${operation}>` +
    `</soapenv:Body></soapenv:Envelope>`
  );
}

export function soapAction(operation: string, service = 'IUrunServis'): string {
  return `${TEMPURI_NS}${service}/${operation}`;
}

export class SoapFault extends Error {
  readonly code: string;
  readonly reason: string;
  constructor(code: string, reason: string) {
    super(`SOAP Fault: ${reason || code}`);
    this.name = 'SoapFault';
    this.code = code;
    this.reason = reason;
  }
}

/** Kimlik doğrulama hatası olarak yorumlanan Fault metinleri (Ticimax: "Hatalı Kullanıcı Kodu"). */
export function isAuthFault(reason: string): boolean {
  return /hatal[ıi]\s*kullan[ıi]c[ıi]\s*kodu|üye\s*kodu|uye\s*kodu|kullan[ıi]c[ıi]\s*kodu\s*hatal|yetkisiz|unauthorized|access\s*denied/i.test(
    reason,
  );
}

/**
 * Yanıtta dizi olması gereken elemanlar — yalnızca beklenen ÜST eleman altında (aynı ad başka yerde
 * skaler olabilir: `UrunKarti.Marka` metin, `SelectMarkaResult.Marka` kayıt).
 */
const ARRAY_RULES: Record<string, (parent: string) => boolean> = {
  UrunKarti: (p) => p.endsWith('Result'),
  Kategori: (p) => p.endsWith('Result'),
  Marka: (p) => p.endsWith('Result'),
  Varyasyon: (p) => p === 'Varyasyonlar',
  VaryasyonOzellik: (p) => p === 'Ozellikler',
  UrunKartiEtiket: (p) => p === 'Etiketler',
  string: () => true,
  int: () => true,
  boolean: () => true,
};

const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  isArray: (name, jpath) => {
    const rule = ARRAY_RULES[name];
    if (!rule) return false;
    const parts = typeof jpath === 'string' ? jpath.split('.') : jpath.toArray();
    return rule(parts[parts.length - 2] ?? '');
  },
});

export type SoapBody = Record<string, unknown>;

/**
 * SOAP zarfını çözümler; Body içinde Fault varsa SoapFault fırlatır. Zarf/Body yoksa Error.
 * Girdi 5 MB üstü olmamalı (çağıran gövdeyi sınırlar).
 */
export function parseSoapEnvelope(xml: string): SoapBody {
  if (/<!DOCTYPE/i.test(xml)) throw new Error('DOCTYPE içeren SOAP yanıtı reddedildi');
  let doc: unknown;
  try {
    doc = parser.parse(xml);
  } catch (err) {
    throw new Error('SOAP yanıtı çözümlenemedi', { cause: err });
  }
  const env = (doc as Record<string, unknown> | null)?.Envelope as Record<string, unknown> | undefined;
  const body = env?.Body as SoapBody | undefined;
  if (!body || typeof body !== 'object') throw new Error('SOAP zarfı bulunamadı');
  const fault = body.Fault as Record<string, unknown> | undefined;
  if (fault) {
    // SOAP 1.1: faultcode/faultstring — SOAP 1.2: Code.Value / Reason.Text
    const code = String(fault.faultcode ?? (fault.Code as Record<string, unknown> | undefined)?.Value ?? 'Fault');
    const reasonRaw = fault.faultstring ?? (fault.Reason as Record<string, unknown> | undefined)?.Text ?? '';
    const reason =
      typeof reasonRaw === 'object' && reasonRaw
        ? String((reasonRaw as Record<string, unknown>)['#text'] ?? '')
        : String(reasonRaw ?? '');
    throw new SoapFault(code.slice(0, 120), reason.slice(0, 300));
  }
  return body;
}

/** `<OpResponse><OpResult>…` içeriğini döndürür; yoksa null. */
export function extractResult(body: SoapBody, operation: string): unknown {
  const resp = body[`${operation}Response`] as Record<string, unknown> | undefined;
  if (!resp || typeof resp !== 'object') return null;
  const r = resp[`${operation}Result`];
  return r === undefined ? null : r;
}

export function asArray<T>(v: unknown): T[] {
  if (v === null || v === undefined || v === '') return [];
  return (Array.isArray(v) ? v : [v]) as T[];
}

/** Yanıt metnini sayıya çevirir; boş/nil → null. */
export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return null;
  const s = String(v).trim();
  return s ? s : null;
}

export function bool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  const s = str(v)?.toLowerCase();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return null;
}
