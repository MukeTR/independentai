/**
 * Ajans tespiti — UI etiketleri (sunucu importu YOK; admin sayfası ve istemci bileşenleri paylaşır).
 * Anahtarlar `server/agency-signal.ts` `AgencyReasonKey` / Prisma `AgencySignalStatus` ile birebirdir.
 */
export type AgencyStatusKey = 'CANDIDATE' | 'CONTACTED' | 'CONVERTED' | 'DISMISSED' | 'DECLARED';

export const AGENCY_STATUS_LABELS: Record<AgencyStatusKey, string> = {
  CANDIDATE: 'Aday',
  CONTACTED: 'İletişime geçildi',
  CONVERTED: 'Dönüştü',
  DISMISSED: 'Yoksayıldı',
  DECLARED: 'Beyan etti',
};

export const AGENCY_STATUS_KEYS: readonly AgencyStatusKey[] = [
  'CANDIDATE',
  'DECLARED',
  'CONTACTED',
  'CONVERTED',
  'DISMISSED',
];

export const AGENCY_REASON_LABELS: Record<string, string> = {
  many_hosts: 'Birden çok site',
  many_sectors: 'Birden çok sektör',
  email_keyword: 'E-posta anahtar kelimesi',
  website_mismatch: 'Kendi sitesi dışı taramalar',
  many_competitors: 'Çok rakip / yabancı marka',
  industry_agency: 'Sektör: ajans',
  compare_heavy: 'Yoğun rakip kıyası',
  preanalysis_used: 'Ajans ön-analizi kullandı',
};

export function isAgencyStatusKey(x: unknown): x is AgencyStatusKey {
  return typeof x === 'string' && (AGENCY_STATUS_KEYS as readonly string[]).includes(x);
}
