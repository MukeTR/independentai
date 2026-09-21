/**
 * Hızlı kontroller — 14 sabit madde; `rakip-kiyas` (W3) iki siteyi YALNIZ bu liste üzerinden karşılaştırır,
 * W1/W2 motorlarına import yok. SAF: ağ yok; og:image HEAD ve TLS sonucu dışarıdan `extra` ile verilir.
 * Durumlar pass/warn/fail; `value` kullanıcıya gösterilen kısa kanıt.
 */
import { hasType, hostnameOf, parseRobots, resolveBotAccess, str, type JsonLdNode } from '../commerce/html-analysis';
import type { HeadResult } from './budget';
import type { PageArtifact } from './fetch-page';
import type { TlsProbe } from './tls-probe';

export type QuickCheckKey =
  | 'title'
  | 'description'
  | 'h1'
  | 'canonical'
  | 'viewport'
  | 'lang'
  | 'ogImage'
  | 'ogImageAbsolute'
  | 'jsonLdTypes'
  | 'organizationSchema'
  | 'https'
  | 'hsts'
  | 'gptBotAllowed'
  | 'llmsTxt';

export type QuickCheckStatus = 'pass' | 'warn' | 'fail';

export type QuickCheck = {
  key: QuickCheckKey;
  label: string;
  status: QuickCheckStatus;
  value: string;
  /** Kıyas grubu (rakip-kiyas eksenleri): identity | aiAccess | technical | shareability */
  group: 'identity' | 'aiAccess' | 'technical' | 'shareability';
};

export const QUICK_CHECK_KEYS: readonly QuickCheckKey[] = [
  'title',
  'description',
  'h1',
  'canonical',
  'viewport',
  'lang',
  'ogImage',
  'ogImageAbsolute',
  'jsonLdTypes',
  'organizationSchema',
  'https',
  'hsts',
  'gptBotAllowed',
  'llmsTxt',
] as const;

export const QUICK_CHECK_LABELS: Record<QuickCheckKey, string> = {
  title: 'Sayfa başlığı (title)',
  description: 'Meta açıklama',
  h1: 'H1 başlığı',
  canonical: 'Canonical adres',
  viewport: 'Mobil viewport',
  lang: 'Sayfa dili (lang)',
  ogImage: 'Paylaşım görseli (og:image)',
  ogImageAbsolute: 'Görsel adresi tam ve erişilebilir',
  jsonLdTypes: 'JSON-LD şema tipleri',
  organizationSchema: 'Organization / LocalBusiness şeması',
  https: 'HTTPS',
  hsts: 'HSTS başlığı',
  gptBotAllowed: 'GPTBot erişimi (robots.txt)',
  llmsTxt: 'llms.txt',
};

export const QUICK_CHECK_GROUPS: Record<QuickCheckKey, QuickCheck['group']> = {
  organizationSchema: 'identity',
  jsonLdTypes: 'identity',
  title: 'identity',
  description: 'identity',
  gptBotAllowed: 'aiAccess',
  llmsTxt: 'aiAccess',
  canonical: 'aiAccess',
  https: 'technical',
  hsts: 'technical',
  viewport: 'technical',
  lang: 'technical',
  ogImage: 'shareability',
  ogImageAbsolute: 'shareability',
  h1: 'shareability',
};

/** Organization ve yaygın alt tipleri (LocalBusiness ailesi dahil). */
export const ORGANIZATION_TYPES = [
  'Organization',
  'LocalBusiness',
  'Corporation',
  'OnlineStore',
  'Store',
  'MedicalClinic',
  'MedicalBusiness',
  'MedicalOrganization',
  'Physician',
  'Dentist',
  'Hospital',
  'LegalService',
  'Attorney',
  'AccountingService',
  'FinancialService',
  'RealEstateAgent',
  'Hotel',
  'LodgingBusiness',
  'TravelAgency',
  'EducationalOrganization',
  'School',
  'ProfessionalService',
  'Restaurant',
  'FoodEstablishment',
  'AutoDealer',
  'HealthAndBeautyBusiness',
  'HomeAndConstructionBusiness',
  'SportsActivityLocation',
  'NGO',
  'GovernmentOrganization',
] as const;

export function jsonLdTypesOf(nodes: JsonLdNode[]): string[] {
  const out = new Set<string>();
  for (const n of nodes) {
    const t = n['@type'];
    const list = Array.isArray(t) ? t : [t];
    for (const x of list) {
      const s = str(x).replace(/^https?:\/\/schema\.org\//, '');
      if (s) out.add(s);
    }
  }
  return [...out];
}

export function hasOrganizationSchema(nodes: JsonLdNode[]): boolean {
  return nodes.some((n) => ORGANIZATION_TYPES.some((t) => hasType(n, t)));
}

export type QuickExtra = { ogHead?: HeadResult | null; tls?: TlsProbe | null };

function check(key: QuickCheckKey, status: QuickCheckStatus, value: string): QuickCheck {
  return { key, label: QUICK_CHECK_LABELS[key], status, value, group: QUICK_CHECK_GROUPS[key] };
}

const short = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** 14 madde, sabit sırada (QUICK_CHECK_KEYS). */
export function quickChecks(a: PageArtifact, extra: QuickExtra = {}): QuickCheck[] {
  const out: QuickCheck[] = [];

  // title
  const title = a.title ?? '';
  out.push(
    !title
      ? check('title', 'fail', 'Yok')
      : title.length < 10 || title.length > 70
        ? check('title', 'warn', `${title.length} karakter · ${short(title, 60)}`)
        : check('title', 'pass', `${title.length} karakter · ${short(title, 60)}`),
  );

  // description
  const desc = a.metaTags['description'] ?? '';
  out.push(
    !desc
      ? check('description', 'fail', 'Yok')
      : desc.length < 50 || desc.length > 170
        ? check('description', 'warn', `${desc.length} karakter`)
        : check('description', 'pass', `${desc.length} karakter`),
  );

  // h1
  const h1 = a.headings.h1;
  out.push(
    h1.length === 0
      ? check('h1', 'fail', 'Yok')
      : h1.length > 1
        ? check('h1', 'warn', `${h1.length} adet H1`)
        : check('h1', 'pass', short(h1[0] ?? '', 60)),
  );

  // canonical
  const canonical = a.canonical;
  if (!canonical) out.push(check('canonical', 'warn', 'Yok'));
  else if (!/^https?:\/\//i.test(canonical)) out.push(check('canonical', 'warn', `Göreli: ${short(canonical)}`));
  else if (hostnameOf(canonical).replace(/^www\./, '') !== a.hostname.replace(/^www\./, ''))
    out.push(check('canonical', 'fail', `Farklı host: ${short(canonical)}`));
  else out.push(check('canonical', 'pass', short(canonical)));

  // viewport
  out.push(a.viewport ? check('viewport', 'pass', 'Var') : check('viewport', 'fail', 'Yok'));

  // lang
  out.push(a.lang ? check('lang', 'pass', a.lang) : check('lang', 'warn', 'Yok'));

  // ogImage
  const og = a.og['image'] ?? a.og['image:url'] ?? a.og['image:secure_url'] ?? '';
  out.push(og ? check('ogImage', 'pass', short(og)) : check('ogImage', 'fail', 'Yok'));

  // ogImageAbsolute
  if (!og) out.push(check('ogImageAbsolute', 'fail', 'og:image yok'));
  else if (!/^https?:\/\//i.test(og)) out.push(check('ogImageAbsolute', 'fail', 'Göreli adres'));
  else {
    const head = extra.ogHead ?? null;
    if (head && head.error === 'unsafe') out.push(check('ogImageAbsolute', 'fail', 'Görsel adresi erişime kapalı'));
    else if (head && head.status >= 400) out.push(check('ogImageAbsolute', 'fail', `Görsel HTTP ${head.status}`));
    else if (head && head.status > 0 && head.contentType && !/^image\//i.test(head.contentType))
      out.push(check('ogImageAbsolute', 'fail', `İçerik türü ${head.contentType.split(';')[0]}`));
    else if (/^http:\/\//i.test(og)) out.push(check('ogImageAbsolute', 'warn', 'http:// görsel (https önerilir)'));
    else if (head && head.status > 0)
      out.push(
        check(
          'ogImageAbsolute',
          'pass',
          head.contentLength != null ? `${Math.round(head.contentLength / 1024)} KB` : 'Erişilebilir',
        ),
      );
    else out.push(check('ogImageAbsolute', 'pass', 'Tam adres'));
  }

  // jsonLdTypes
  const types = jsonLdTypesOf(a.jsonLd);
  out.push(types.length ? check('jsonLdTypes', 'pass', short(types.join(', '))) : check('jsonLdTypes', 'warn', 'Yok'));

  // organizationSchema
  out.push(
    hasOrganizationSchema(a.jsonLd)
      ? check('organizationSchema', 'pass', 'Var')
      : check('organizationSchema', 'fail', 'Yok'),
  );

  // https
  const https = /^https:\/\//i.test(a.finalUrl);
  out.push(https ? check('https', 'pass', 'Var') : check('https', 'fail', 'HTTP'));

  // hsts
  const hsts = a.page.headers.get('strict-transport-security');
  if (hsts) out.push(check('hsts', 'pass', short(hsts, 60)));
  else if (extra.tls && extra.tls.ok === false && extra.tls.error) out.push(check('hsts', 'warn', 'Yok'));
  else out.push(check('hsts', https ? 'warn' : 'fail', 'Yok'));

  // gptBotAllowed
  const robots = a.robots;
  const robotsFound = !!robots?.ok && robots.text.length > 0 && !/<html/i.test(robots.text.slice(0, 300));
  if (!robotsFound) out.push(check('gptBotAllowed', 'pass', 'robots.txt yok — varsayılan izin'));
  else {
    const access = resolveBotAccess(parseRobots(robots!.text), 'GPTBot', a.path || '/');
    out.push(
      access.allowed
        ? check('gptBotAllowed', 'pass', access.rule ? `İzinli (${access.rule})` : 'İzinli')
        : check('gptBotAllowed', 'fail', access.rule ? `Engelli (${access.rule})` : 'Engelli'),
    );
  }

  // llmsTxt
  const llms = a.llms;
  const llmsOk = !!llms?.ok && llms.text.trim().length > 0 && !/<html/i.test(llms.text.slice(0, 300));
  out.push(llmsOk ? check('llmsTxt', 'pass', 'Var') : check('llmsTxt', 'warn', 'Yok'));

  return out;
}
