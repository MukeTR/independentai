/** Temsili hikâye — landing boyunca tek örnek şirket; tüm bölümler aynı rakamları kullanır. */
export const DEMO = {
  domain: 'acme.com',
  /** AI görünürlüğü (siz) */
  score: 22,
  /** Rakibin görünürlüğü */
  competitor: 71,
  /** Satın alma niyetli soru sayısı ve hiç görünmediğiniz soru sayısı */
  questions: 48,
  missing: 31,
  /** Tahmini kaçırılan fırsat: yüksek niyetli soru */
  highIntent: 19,
  issues: 18,
  tasks: 12,
  done: 8,
  after: 64,
  rankBefore: 3,
  rankAfter: 1,
} as const;

/** CEO ekranı — GEO/AEO değil, dört sayı. */
export const CEO_SCREEN = [
  { v: 147, l: 'müşteri sorusu' },
  { v: 64, l: 'sorusunda rakibiniz var', tone: 'danger' },
  { v: 23, l: 'sorusunda siz varsınız', tone: 'brand' },
  { v: 41, l: 'fırsat', tone: 'positive' },
] as const;

/** Müşterilerin satın almadan önce yapay zekâya sorduğu türden sorular (sektör kapsamı). */
export const BUYER_QUESTIONS = [
  'En iyi CRM hangisi?',
  'İstanbul’da iyi saç ekimi kliniği?',
  'Trendyol mağazamı yönetecek ajans?',
  'Shopify mi ikas mı?',
  'Güvenilir mali müşavir nasıl bulurum?',
  'En iyi performans pazarlama ajansı?',
  'Yazılım bootcamp’i önerir misin?',
  'Kapadokya’da butik otel?',
  'Boşanma avukatı İstanbul',
  'Toptan tekstil üreticisi Türkiye',
  'Ankara’da satılık daire hangi bölge?',
  'B2B e-ticaret altyapısı hangisi?',
] as const;
