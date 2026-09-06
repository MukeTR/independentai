/**
 * Halüsinasyon / Doğruluk Tespiti (Faz 9) — AI cevaplarında markanız hakkında
 * yanlış bilgi var mı? Kullanıcının girdiği "marka gerçekleri" ile son cevapları karşılaştırır.
 */
import { prisma } from './prisma';
import { completeJSON, hasLLM } from '@independentai/ai';

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
};

const SEVERITIES = ['Yüksek', 'Orta', 'Düşük'];

export async function scanHallucinations(tenantId: string): Promise<HallucinationScan> {
  const facts = await prisma.brandFact.findMany({ where: { tenantId } });
  if (facts.length === 0) {
    return { needsFacts: true, needsLLM: false, checked: 0, hallucinations: [] };
  }
  if (!hasLLM()) {
    return { needsFacts: false, needsLLM: true, checked: 0, hallucinations: [] };
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

  const factList = facts.map((f) => `- ${f.fact}`).join('\n');
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

  return { needsFacts: false, needsLLM: false, checked: runs.length, hallucinations };
}
