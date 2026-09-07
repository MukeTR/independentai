/**
 * Halüsinasyon / Doğruluk Tespiti (Faz 9) — AI cevaplarında markanız hakkında
 * yanlış bilgi var mı? Kullanıcının girdiği "marka gerçekleri" ile son cevapları karşılaştırır.
 */
import { prisma } from './prisma';
import { completeJSON, hasLLM } from '@independentai/ai';
import { combinedBrandFacts } from './commerce/brand-facts';

export type Hallucination = {
  modelRunId: string;
  provider: string;
  claim: string; // AI'ın yanlış iddiası
  correction: string; // doğrusu
  severity: 'Yüksek' | 'Orta' | 'Düşük';
};

export type HallucinationScan = {
  needsFacts: boolean;
  needsLLM: boolean;
  checked: number;
  hallucinations: Hallucination[];
  /** Karşılaştırmada kullanılan gerçek kaynakları (manuel + bağlı katalog) ve katalog zaman damgası */
  factSources: { manual: number; catalog: number; catalogAsOf: string | null };
  scannedAt: string;
};

const SEVERITIES = ['Yüksek', 'Orta', 'Düşük'];

export async function scanHallucinations(tenantId: string): Promise<HallucinationScan> {
  const scannedAt = new Date().toISOString();
  // Manuel gerçekler + bağlı katalogdan türetilen gerçekler (ürün sayısı, kategoriler, fiyat aralığı…)
  const combined = await combinedBrandFacts(tenantId);
  const factSources = {
    manual: combined.manualCount,
    catalog: combined.catalogCount,
    catalogAsOf: combined.catalogAsOf,
  };
  const facts = combined.facts;
  if (facts.length === 0) {
    return { needsFacts: true, needsLLM: false, checked: 0, hallucinations: [], factSources, scannedAt };
  }
  if (!hasLLM()) {
    return { needsFacts: false, needsLLM: true, checked: 0, hallucinations: [], factSources, scannedAt };
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);

  // Markanızın geçtiği son cevaplar
  const runs = await prisma.modelRun.findMany({
    where: {
      prompt: { tenantId },
      runDate: { gte: since },
      status: 'SUCCESS',
      mentions: { some: { isOwnBrand: true } },
    },
    orderBy: { runDate: 'desc' },
    take: 12,
    select: { id: true, provider: true, responseText: true },
  });

  const factList = facts
    .map((f) => `- ${f.fact}${f.source === 'catalog' && f.asOf ? ` (katalog verisi, ${f.asOf.slice(0, 10)})` : ''}`)
    .join('\n');
  const hallucinations: Hallucination[] = [];

  for (const run of runs) {
    const prompt = `Aşağıda markamız hakkında DOĞRULANMIŞ gerçekler ve bir AI'ın verdiği cevap var. Cevapta bu gerçeklerle ÇELİŞEN veya marka hakkında uydurma/yanlış bilgi var mı tespit et.

Doğrulanmış gerçekler:
${factList}

AI cevabı:
"""${run.responseText.slice(0, 2500)}"""

Sadece NET çelişki/yanlışları listele (yoksa boş dizi). Her biri için JSON.
severity: Yüksek|Orta|Düşük.
Format: {"items":[{"claim":"AI'ın yanlış iddiası","correction":"doğrusu","severity":"Yüksek"}]}`;

    type Resp = { items: { claim: string; correction: string; severity: string }[] };
    const res = await completeJSON<Resp>(prompt, { maxTokens: 500 });
    if (res?.items?.length) {
      for (const it of res.items) {
        if (!it.claim) continue;
        hallucinations.push({
          modelRunId: run.id,
          provider: run.provider,
          claim: it.claim,
          correction: it.correction ?? '',
          severity: (SEVERITIES.includes(it.severity) ? it.severity : 'Orta') as Hallucination['severity'],
        });
      }
    }
  }

  return { needsFacts: false, needsLLM: false, checked: runs.length, hallucinations, factSources, scannedAt };
}
