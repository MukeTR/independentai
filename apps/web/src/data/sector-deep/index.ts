import type { SectorSlug } from '@/lib/tool-registry';
import type { SectorDeep } from './types';
import { DEEP as saas } from './saas';
import { DEEP as ajans } from './ajans';
import { DEEP as klinik } from './klinik';
import { DEEP as hukukDanismanlik } from './hukuk-danismanlik';
import { DEEP as eticaretAltyapi } from './eticaret-altyapi';
import { DEEP as egitim } from './egitim';
import { DEEP as gayrimenkul } from './gayrimenkul';
import { DEEP as turizm } from './turizm';
import { DEEP as b2bUretici } from './b2b-uretici';

/**
 * Sektöre özel derin anlatı kayıtları. Her sektör kendi dosyasında durur; bu dosya yalnızca toplar.
 * `data/sectors.ts` çekirdek veridir (nav, sitemap, onboarding); burası sayfanın uzun metinleridir.
 */
export const SECTOR_DEEP: Record<SectorSlug, SectorDeep> = {
  saas,
  ajans,
  klinik,
  'hukuk-danismanlik': hukukDanismanlik,
  'eticaret-altyapi': eticaretAltyapi,
  egitim,
  gayrimenkul,
  turizm,
  'b2b-uretici': b2bUretici,
};

export function sectorDeepBySlug(slug: SectorSlug): SectorDeep {
  return SECTOR_DEEP[slug];
}

export type { SectorDeep } from './types';
