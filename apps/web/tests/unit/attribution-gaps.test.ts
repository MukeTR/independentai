/**
 * Görünürlük boşluğu önceliklendirme birim testleri.
 *
 * Prisma taklit edilir (DB yok): amaç sıralama formülünün ve sektöre uygun değer dilinin
 * doğruluğunu kilitlemek. `getVisibilityGaps` mantığı değiştirilmedi; burada yalnızca
 * `prioritizeGapsWithTraffic` sınanır.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  runs: [] as Row[],
  sites: [] as Row[],
  landing: [] as Row[],
  entities: [] as Row[],
  converted: [] as Row[],
}));

vi.mock('@/server/prisma', () => ({
  prisma: {
    modelRun: { findMany: async () => db.runs },
    trackedSite: { findMany: async () => db.sites },
    aiAcquisitionSession: { groupBy: async () => db.landing, findMany: async () => db.converted },
    aiJourneyEvent: { groupBy: async () => db.entities },
  },
}));

const { getVisibilityGaps, prioritizeGapsWithTraffic } = await import('@/server/insights');

/** İki boşluk: "diş kliniği" (trafik var) ve "web sitesi tasarımı" (trafik yok). */
function seedRuns() {
  db.runs = [
    {
      id: 'r1',
      promptId: 'pA',
      provider: 'OPENAI',
      mentions: [{ isOwnBrand: false, isCompetitor: true, mentionName: 'Rakip A' }],
      prompt: { text: 'İstanbul diş kliniği önerisi' },
    },
    {
      id: 'r2',
      promptId: 'pB',
      provider: 'OPENAI',
      mentions: [{ isOwnBrand: false, isCompetitor: true, mentionName: 'Rakip B' }],
      prompt: { text: 'Kurumsal web sitesi tasarımı' },
    },
  ];
}

beforeEach(() => {
  seedRuns();
  db.sites = [{ id: 's1', siteKind: 'service' }];
  db.landing = [
    { landingPath: '/dis-klinigi-istanbul', _count: { _all: 40 } },
    { landingPath: '/hakkimizda', _count: { _all: 5 } },
  ];
  db.entities = [];
  db.converted = [{ landingPath: '/dis-klinigi-istanbul', value: null, goal: { name: 'Randevu', type: 'BOOKING' } }];
});

describe('prioritizeGapsWithTraffic', () => {
  it('gerçek trafik sinyali olan boşluk üste çıkar; formül açıklanabilir', async () => {
    const out = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(out.map((g) => g.promptId)).toEqual(['pA', 'pB']);

    // gapBase = 40 + (1 rakip × 6) + (1 eksik sağlayıcı × 10) = 56
    // pA: trafik çarpanı 1,0 (en yüksek ilgi) × hedef çarpanı 1,0 → 56
    // pB: trafik yok → 0,6 × hedef yok → 0,8 → 56 × 0,48 ≈ 27
    expect(out[0]!.priority).toBe(56);
    expect(out[1]!.priority).toBe(27);
    expect(out[0]!.priority).toBeGreaterThan(out[1]!.priority);
  });

  it('trafik sinyali eşleşen yol ve oturum sayısını taşır', async () => {
    const [a, b] = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(a!.trafficSignal.sessions).toBe(40);
    expect(a!.trafficSignal.matchedPaths).toEqual(['/dis-klinigi-istanbul']);
    expect(a!.trafficSignal.score).toBe(100);
    // Alakasız sayfa (/hakkimizda) sayılmaz
    expect(a!.trafficSignal.sessions).not.toBe(45);
    expect(b!.trafficSignal.sessions).toBe(0);
    expect(b!.trafficSignal.score).toBe(0);
  });

  it('rakip ve eksik sağlayıcı bilgisi getVisibilityGaps ile aynı kalır', async () => {
    const gaps = await getVisibilityGaps('t1', 30, 50);
    const out = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(new Set(out.map((g) => g.promptId))).toEqual(new Set(gaps.map((g) => g.promptId)));
    expect(out[0]!.competitors).toEqual(['Rakip A']);
    expect(out[0]!.missingProviders).toEqual(['ChatGPT']);
    expect(out[0]!.text).toBe('İstanbul diş kliniği önerisi');
  });

  it('e-ticaret DIŞI sitede değer lead/randevu diliyle ifade edilir, ciro yazılmaz', async () => {
    const [a] = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(a!.goalSignal.conversions).toBe(1);
    expect(a!.goalSignal.topGoal).toBe('Randevu');
    expect(a!.goalSignal.goalType).toBe('BOOKING');
    expect(a!.goalSignal.valueLabel).toBe('1 randevu');
    expect(a!.rationale).not.toMatch(/ciro|₺|sepet/i);
    expect(a!.rationale).toContain('Rakip A');
    expect(a!.rationale).toContain('40 AI kaynaklı ziyaret');
  });

  it('e-ticaret sitesinde parasal değer eklenir', async () => {
    db.sites = [{ id: 's1', siteKind: 'ecommerce' }];
    db.converted = [
      { landingPath: '/dis-klinigi-istanbul', value: 1500, goal: { name: 'Satın alma', type: 'PURCHASE' } },
    ];
    const [a] = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(a!.goalSignal.valueLabel).toContain('1 satış');
    expect(a!.goalSignal.valueLabel).toContain('değerinde');
  });

  it('trafik ölçümü hiç yoksa boşluklar yine listelenir (sıralamada geri düşerler)', async () => {
    db.sites = [];
    db.landing = [];
    db.converted = [];
    const out = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(out).toHaveLength(2);
    for (const g of out) {
      expect(g.trafficSignal.sessions).toBe(0);
      expect(g.priority).toBe(27);
      expect(g.rationale).toContain('henüz ölçülmüş AI ziyareti yok');
    }
  });

  it('hedef stratejik değeri sıralamayı büyütür (aynı trafikte DEMO > CONTACT)', async () => {
    // İki boşluk da aynı sayfaya trafik alsın; yalnızca hedef türü farklı olsun.
    db.landing = [
      { landingPath: '/dis-klinigi-istanbul', _count: { _all: 20 } },
      { landingPath: '/kurumsal-web-sitesi-tasarimi', _count: { _all: 20 } },
    ];
    db.converted = [
      { landingPath: '/dis-klinigi-istanbul', value: null, goal: { name: 'İletişim', type: 'CONTACT' } },
      { landingPath: '/kurumsal-web-sitesi-tasarimi', value: null, goal: { name: 'Demo', type: 'DEMO' } },
    ];
    const out = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(out[0]!.promptId).toBe('pB'); // DEMO (90) > CONTACT (55)
    expect(out[0]!.goalSignal.score).toBe(100);
    expect(out[1]!.goalSignal.score).toBe(61); // 55/90
  });

  it('boşluk yoksa boş dizi döner ve DB’ye ek sorgu yapılmaz', async () => {
    db.runs = [
      {
        id: 'r3',
        promptId: 'pC',
        provider: 'OPENAI',
        mentions: [{ isOwnBrand: true, isCompetitor: false, mentionName: 'Markam' }],
        prompt: { text: 'Markam iyi mi' },
      },
    ];
    expect(await prioritizeGapsWithTraffic('t1', { days: 30 })).toEqual([]);
  });

  it('limit uygulanır ve sonuç deterministiktir', async () => {
    const a = await prioritizeGapsWithTraffic('t1', { days: 30 });
    const b = await prioritizeGapsWithTraffic('t1', { days: 30 });
    expect(a).toEqual(b);
    expect(await prioritizeGapsWithTraffic('t1', { days: 30, limit: 1 })).toHaveLength(1);
  });
});
