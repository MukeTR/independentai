import type { SectorSlug } from '@/lib/tool-registry';

/**
 * "Müşteriniz sizi nasıl soruyor" soru bankası.
 *
 * Amaç: müşterinin yapay zekâ asistanına yazdığı GERÇEK cümleleri sektör sektör toplamak ve
 * sitede bu soruların karşılığı olup olmadığını deterministik olarak kontrol edebilmek.
 *
 * Kurallar:
 *  - `q` bir anahtar kelime değil, insanın yazdığı TAM cümledir. Uzun, dağınık, konuşma dilinde olabilir.
 *  - `signals` sayfada aranacak ipuçlarıdır. Tarayıcı bunları metinde arar; bu yüzden hem tek kelime
 *    hem kısa kalıp olabilir, ama MARKA adı içermez (her sitede farklı olur).
 *  - Uydurma istatistik yok; soru kalıpları araştırmaya dayanır.
 */
export type QuestionStage =
  /** Sorunu yeni fark etti, kim yapar diye soruyor */
  | 'kesif'
  /** İki seçenek arasında kaldı, karşılaştırıyor */
  | 'karsilastirma'
  /** Ne kadar tutar, neye göre değişir */
  | 'fiyat'
  /** Güvenilir mi, yetkili mi, referansı var mı */
  | 'guven'
  /** Aldıktan sonra: süreç, iade, garanti süreci, destek */
  | 'sonrasi';

export const STAGE_LABELS: Record<QuestionStage, string> = {
  kesif: 'Keşif',
  karsilastirma: 'Karşılaştırma',
  fiyat: 'Fiyat ve kapsam',
  guven: 'Güven ve yetki',
  sonrasi: 'Satın alma sonrası',
};

export const STAGE_ORDER: QuestionStage[] = ['kesif', 'karsilastirma', 'fiyat', 'guven', 'sonrasi'];

export type BankQuestion = {
  /** Kullanıcının asistana yazdığı tam cümle */
  q: string;
  stage: QuestionStage;
  /** Bu soruya hangi sayfa cevap vermeli (ör. "hizmet sayfası", "SSS", "fiyat sayfası") */
  answeredBy: string;
  /** Sayfada aranacak ipuçları — küçük harfe indirgenmiş metinde geçiyor mu diye bakılır. Marka adı YOK. */
  signals: string[];
  /** Neden önemli, tek cümle */
  why: string;
};

export type SectorQuestionBank = {
  slug: SectorSlug;
  /** Bu sektörde soru dilinin kısa özeti (2-3 cümle) */
  note: string;
  /** En az 25 soru; her aşamadan en az 3 tane */
  questions: BankQuestion[];
};
