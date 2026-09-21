/**
 * Prompt attribution birim testleri — puanlama tablosu, eşik davranışı, PII temizliği,
 * niyet normalizasyonu ve kaynak ayrımı. DB yok: tüm saf fonksiyonlar deterministik.
 */
import { describe, expect, it } from 'vitest';
import {
  cleanReportText,
  contextTokens,
  detectIntent,
  inferAttribution,
  intentLabel,
  INTENTS,
  MAX_REPORT_TEXT,
  meaningfulWords,
  MIN_CONFIDENCE,
  normalizeIntent,
  normalizeReportProvider,
  SIGNAL_WEIGHTS,
  SOURCE_META,
  SYNTHETIC_DISCLAIMER,
  wordMatchesTokens,
  type AttributionCandidate,
  type AttributionSessionInput,
} from '@/server/discovery/attribution';

const session = (over: Partial<AttributionSessionInput> = {}): AttributionSessionInput => ({
  sourceClass: 'AI_REFERRAL',
  provider: 'openai',
  landingPath: '/blog/x',
  entityLabels: [],
  goalType: null,
  ...over,
});

const candidate = (over: Partial<AttributionCandidate> = {}): AttributionCandidate => ({
  promptId: 'p1',
  text: 'zzzz qqqq wwww',
  category: null,
  citedPaths: [],
  visibleProviders: [],
  ...over,
});

/** Kelimeleri sayfa jetonlarıyla tam örtüşen bir örnek (5 kelime → üst sınır). */
const OVERLAP_TEXT = 'kurumsal web sitesi tasarım paketi hangisi';
const OVERLAP_PATH = '/kurumsal-web-sitesi-tasarim-paketi';

describe('puan tablosu (SIGNAL_WEIGHTS)', () => {
  it('ağırlıklar sabittir ve yumuşak sinyaller tek başına eşiği geçemez', () => {
    expect(SIGNAL_WEIGHTS).toEqual({
      citationPathMatch: 45,
      textOverlapMax: 25,
      textOverlapPerWord: 8,
      goalIntentMatch: 15,
      providerVisibility: 10,
      referrerOnly: 0,
    });
    expect(MIN_CONFIDENCE).toBe(55);
    // Tasarım gereği: atıf eşleşmesi olmadan ulaşılabilecek en yüksek puan eşiğin ALTINDA.
    const softMax = SIGNAL_WEIGHTS.textOverlapMax + SIGNAL_WEIGHTS.goalIntentMatch + SIGNAL_WEIGHTS.providerVisibility;
    expect(softMax).toBeLessThan(MIN_CONFIDENCE);
  });

  it('atıf eşleşmesi TEK BAŞINA yetmez (45 < 55) → kayıt üretilmez', () => {
    const out = inferAttribution(session(), [candidate({ citedPaths: ['/blog/x'] })]);
    expect(out).toBeNull();
  });

  it('atıf (+45) + sağlayıcı görünürlüğü (+10) = 55 → tam eşikte kabul', () => {
    const out = inferAttribution(session(), [candidate({ citedPaths: ['/blog/x'], visibleProviders: ['OPENAI'] })]);
    expect(out).not.toBeNull();
    expect(out!.confidence).toBe(55);
    expect(out!.promptId).toBe('p1');
    const points = Object.fromEntries(out!.evidence.signals.map((s) => [s.signal, s.points]));
    expect(points.citationPathMatch).toBe(45);
    expect(points.providerVisibility).toBe(10);
    // Referrer kanıt listesinde görünür ama katkısı sıfırdır.
    expect(points.referrerOnly).toBe(0);
  });

  it('metin örtüşmesi kelime başına +8, üst sınır +25', () => {
    // 3 eşleşen kelime → 24 puan
    const three = inferAttribution(session({ landingPath: '/dis-klinigi-istanbul' }), [
      candidate({ text: 'diş kliniği istanbul', citedPaths: ['/dis-klinigi-istanbul'] }),
    ]);
    expect(three!.confidence).toBe(45 + 24);
    const overlap = three!.evidence.signals.find((s) => s.signal === 'textOverlapMax');
    expect(overlap?.points).toBe(24);
    expect(overlap?.detail).toContain('istanbul');

    // 5 eşleşen kelime → 40 değil, üst sınır 25
    const capped = inferAttribution(session({ landingPath: OVERLAP_PATH }), [
      candidate({ text: OVERLAP_TEXT, citedPaths: [OVERLAP_PATH] }),
    ]);
    expect(capped!.confidence).toBe(45 + 25);
  });

  it('hedef türü ↔ niyet uyumu +15', () => {
    const base = candidate({ text: 'En iyi diş kliniği hangisi', citedPaths: ['/iletisim'] });
    const withoutGoal = inferAttribution(session({ landingPath: '/iletisim' }), [base]);
    expect(withoutGoal).toBeNull(); // 45 < 55

    const withGoal = inferAttribution(session({ landingPath: '/iletisim', goalType: 'BOOKING' }), [base]);
    expect(withGoal!.confidence).toBe(45 + 15);
    expect(withGoal!.intent).toBe('recommendation');
    expect(withGoal!.evidence.signals.find((s) => s.signal === 'goalIntentMatch')?.points).toBe(15);

    // Uyumsuz hedef türü puan eklemez (CUSTOM hiçbir niyetle eşleşmez).
    const mismatch = inferAttribution(session({ landingPath: '/iletisim', goalType: 'CUSTOM' }), [base]);
    expect(mismatch).toBeNull();
  });

  it('yumuşak sinyallerin toplamı (25+15+10=50) eşiği geçmez → kayıt YOK', () => {
    const out = inferAttribution(session({ landingPath: OVERLAP_PATH, goalType: 'DEMO' }), [
      candidate({ text: OVERLAP_TEXT, visibleProviders: ['OPENAI'] }),
    ]);
    expect(out).toBeNull();
  });

  it('tüm sinyaller birlikte en fazla 95 üretir (100 yalnızca ziyaretçi bildirimine ait)', () => {
    const out = inferAttribution(session({ landingPath: OVERLAP_PATH, goalType: 'DEMO' }), [
      candidate({ text: OVERLAP_TEXT, citedPaths: [OVERLAP_PATH], visibleProviders: ['OPENAI'] }),
    ]);
    expect(out!.confidence).toBe(95);
    expect(out!.evidence.total).toBe(95);
    // 4 katkı veren sinyal + katkısız referrer satırı
    expect(out!.evidence.signals).toHaveLength(5);
    expect(out!.evidence.signals.reduce((s, x) => s + x.points, 0)).toBe(95);
    expect(out!.evidence.threshold).toBe(MIN_CONFIDENCE);
  });

  it('sağlayıcı eşleşmesi yalnızca ölçülen sağlayıcılar için sayılır', () => {
    const cand = candidate({ citedPaths: ['/blog/x'], visibleProviders: ['OPENAI'] });
    // Perplexity ölçülmüyor → +10 yok → 45 → eşik altı
    expect(inferAttribution(session({ provider: 'perplexity' }), [cand])).toBeNull();
    expect(inferAttribution(session({ provider: 'openai' }), [cand])!.confidence).toBe(55);
  });
});

describe('referrer ve kaynak kuralları', () => {
  it('AI referrer olmayan oturum için ASLA tahmin üretilmez', () => {
    const cand = candidate({ text: OVERLAP_TEXT, citedPaths: [OVERLAP_PATH], visibleProviders: ['OPENAI'] });
    for (const sourceClass of ['DIRECT', 'ORGANIC', 'OTHER']) {
      expect(inferAttribution(session({ sourceClass, landingPath: OVERLAP_PATH }), [cand])).toBeNull();
    }
  });

  it('aday yoksa null döner', () => {
    expect(inferAttribution(session(), [])).toBeNull();
  });
});

describe('determinizm', () => {
  it('aynı girdi aynı çıktıyı verir ve eşit puanda promptId sırası kazanır', () => {
    const cands = [
      candidate({ promptId: 'p2', citedPaths: ['/blog/x'], visibleProviders: ['OPENAI'] }),
      candidate({ promptId: 'p1', citedPaths: ['/blog/x'], visibleProviders: ['OPENAI'] }),
    ];
    const a = inferAttribution(session(), cands);
    const b = inferAttribution(session(), [...cands].reverse());
    expect(a!.promptId).toBe('p1');
    expect(b!.promptId).toBe('p1');
    expect(a).toEqual(b);
  });

  it('ikinci en iyi aday kanıtta görünür (tek adaya kilitlenmiyoruz)', () => {
    const out = inferAttribution(session({ landingPath: '/dis-klinigi-istanbul' }), [
      candidate({ promptId: 'p1', text: 'diş kliniği istanbul', citedPaths: ['/dis-klinigi-istanbul'] }),
      candidate({ promptId: 'p9', text: 'diş kliniği istanbul' }),
    ]);
    expect(out!.promptId).toBe('p1');
    expect(out!.evidence.runnerUp).toEqual({ promptId: 'p9', confidence: 24 });
  });

  it('yol normalizasyonu uygulanır (query/hash/son slash atılır)', () => {
    const out = inferAttribution(session({ landingPath: '/blog/x/?utm=1#bolum' }), [
      candidate({ citedPaths: ['https://ornek.com/blog/x'], visibleProviders: ['OPENAI'] }),
    ]);
    expect(out!.confidence).toBe(55);
    expect(out!.evidence.landingPath).toBe('/blog/x');
  });
});

describe('PII temizliği ve metin sınırı', () => {
  it('e-posta ve telefon maskelenir, açı parantezleri düşer', () => {
    const out = cleanReportText('Merhaba ben ali@ornek.com, 0532 123 45 67 <script>alert(1)</script>');
    expect(out).toContain('[email]');
    expect(out).toContain('[phone]');
    expect(out).not.toContain('ali@ornek.com');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('300 karaktere kırpılır, boş/geçersiz girdi null döner', () => {
    expect(cleanReportText('a'.repeat(500))).toHaveLength(MAX_REPORT_TEXT);
    expect(cleanReportText('   ')).toBeNull();
    expect(cleanReportText(42)).toBeNull();
    expect(cleanReportText(null)).toBeNull();
  });

  it('satır sonları tek boşluğa indirgenir', () => {
    expect(cleanReportText('bir\n\n  iki\tüç')).toBe('bir iki üç');
  });
});

describe('niyet normalizasyonu', () => {
  it('bilinen değerler ve Türkçe eş anlamlılar eşlenir', () => {
    expect(normalizeIntent('comparison')).toBe('comparison');
    expect(normalizeIntent('Karşılaştırma')).toBe('comparison');
    expect(normalizeIntent('FİYAT')).toBe('pricing');
    expect(normalizeIntent('how_to')).toBe('how_to');
    expect(normalizeIntent('Nasıl')).toBe('how_to');
  });

  it('tanınmayan değer "other" olur, boş girdi null kalır', () => {
    expect(normalizeIntent('rastgele-bir-sey')).toBe('other');
    expect(normalizeIntent('')).toBeNull();
    expect(normalizeIntent(null)).toBeNull();
    expect(normalizeIntent(undefined)).toBeNull();
  });

  it('prompt metninden niyet çıkarımı deterministiktir ve Türkçe ekleri tolere eder', () => {
    expect(detectIntent('Bu ürünün fiyatı nedir?')).toBe('pricing');
    expect(detectIntent('ChatGPT vs Claude hangisi daha iyi?')).toBe('comparison');
    expect(detectIntent('Notion alternatifi var mı?')).toBe('alternative');
    expect(detectIntent('Nasıl kurulur?')).toBe('how_to');
    expect(detectIntent('Yakınımda diş hekimi')).toBe('local');
    expect(detectIntent('En iyi POS sistemi hangisi?')).toBe('recommendation');
    expect(detectIntent('kırmızı mavi yeşil')).toBe('other');
    // Metinden çıkmazsa kategori kullanılır
    expect(detectIntent('kırmızı mavi yeşil', 'discovery')).toBe('recommendation');
  });

  it('INTENTS 7 değerden oluşur ve hepsinin Türkçe etiketi vardır', () => {
    expect(INTENTS.map((i) => i.value)).toEqual([
      'recommendation',
      'comparison',
      'pricing',
      'alternative',
      'how_to',
      'local',
      'other',
    ]);
    for (const i of INTENTS) expect(i.label.length).toBeGreaterThan(2);
    expect(intentLabel('pricing')).toBe('Fiyat / maliyet');
    expect(intentLabel('bilinmeyen')).toBe('Diğer');
    expect(intentLabel(null)).toBe('Bilinmiyor');
  });
});

describe('sağlayıcı normalizasyonu', () => {
  it('ürün adları sağlayıcı anahtarına çevrilir; tanınmayan null olur', () => {
    expect(normalizeReportProvider('ChatGPT')).toBe('openai');
    expect(normalizeReportProvider('Claude')).toBe('anthropic');
    expect(normalizeReportProvider('gemini')).toBe('google');
    expect(normalizeReportProvider('Copilot')).toBe('microsoft');
    expect(normalizeReportProvider('perplexity')).toBe('perplexity');
    expect(normalizeReportProvider('bilinmeyen-ai')).toBeNull();
    expect(normalizeReportProvider(null)).toBeNull();
  });
});

describe('kaynak ayrımı', () => {
  it('üç kaynağın etiketi ve açıklaması farklıdır', () => {
    const labels = Object.values(SOURCE_META).map((m) => m.label);
    expect(new Set(labels).size).toBe(3);
    expect(SOURCE_META.USER_REPORTED.description).toMatch(/Tahmin değildir/);
    expect(SOURCE_META.INFERRED.description).toContain(String(MIN_CONFIDENCE));
    expect(SOURCE_META.SYNTHETIC.description).toBe(SYNTHETIC_DISCLAIMER);
    expect(SYNTHETIC_DISCLAIMER).toMatch(/ziyaretçinin sorduğu soru değildir/i);
  });
});

describe('metin yardımcıları', () => {
  it('anlamlı kelimeler stopword ve rakamları eler, tekilleştirir', () => {
    expect(meaningfulWords('En iyi diş kliniği hangisi 2026 diş')).toEqual(['diş', 'kliniği']);
  });

  it('jetonlar yol ve varlık etiketinden üretilir', () => {
    const tokens = contextTokens('/blog/dis-klinigi-secimi', ['İmplant Tedavisi']);
    expect(tokens).toContain('blog');
    expect(tokens).toContain('klinigi');
    expect(tokens).toContain('implant');
  });

  it('eşleştirme aksana ve Türkçe ekine dayanıklıdır', () => {
    expect(wordMatchesTokens('kliniği', ['klinigi'])).toBe(true);
    expect(wordMatchesTokens('diş', ['dis'])).toBe(true);
    expect(wordMatchesTokens('istanbul', ['ankara'])).toBe(false);
  });
});
