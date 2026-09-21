/**
 * Soru bankası — TEK toplama noktası. 9 sektör dosyasının her biri `BANK` verir; burada `SectorSlug`
 * ile eşlenir. Sunucu importu YOK, ama dosya BÜYÜKTÜR (9 banka ≈ 250 soru): istemci bileşenleri bunu
 * doğrudan import etmez, yalnızca `/api/tools/musteriniz-nasil-soruyor` seçilen sektörün bankasını döner.
 * Aşama etiketleri ve soru tipleri için `./types` yeterlidir (küçük, istemcide serbestçe kullanılabilir).
 */
import type { SectorSlug } from '@/lib/tool-registry';
import type { SectorQuestionBank } from './types';
import { BANK as saas } from './saas';
import { BANK as ajans } from './ajans';
import { BANK as klinik } from './klinik';
import { BANK as hukukDanismanlik } from './hukuk-danismanlik';
import { BANK as eticaretAltyapi } from './eticaret-altyapi';
import { BANK as egitim } from './egitim';
import { BANK as gayrimenkul } from './gayrimenkul';
import { BANK as turizm } from './turizm';
import { BANK as b2bUretici } from './b2b-uretici';

export const QUESTION_BANKS: Record<SectorSlug, SectorQuestionBank> = {
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

export function bankBySlug(slug: SectorSlug): SectorQuestionBank {
  return QUESTION_BANKS[slug];
}

export { STAGE_LABELS, STAGE_ORDER } from './types';
export type { BankQuestion, QuestionStage, SectorQuestionBank } from './types';
