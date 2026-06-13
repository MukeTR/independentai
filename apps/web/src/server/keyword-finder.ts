/**
 * Anahtar Kelime / Prompt Bulucu (Faz 5) — bir sektör/konu girince, kullanıcıların
 * AI motorlarına soracağı yüksek niyetli promptları LLM ile üretir.
 */
import { completeJSON } from '@independentai/ai';

export type PromptIdea = {
  prompt: string;
  intent: 'Keşif' | 'Karşılaştırma' | 'Değerlendirme' | 'Nasıl yapılır';
  demand: 'Yüksek' | 'Orta' | 'Düşük';
};

const INTENTS = ['Keşif', 'Karşılaştırma', 'Değerlendirme', 'Nasıl yapılır'];
const DEMANDS = ['Yüksek', 'Orta', 'Düşük'];

export async function findPromptIdeas(topic: string, industry?: string): Promise<PromptIdea[]> {
  const prompt = `Bir GEO (AI arama optimizasyonu) uzmanısın. Aşağıdaki konu/sektör için, gerçek müşterilerin ChatGPT/Claude/Gemini gibi yapay zeka asistanlarına soracağı 12 yüksek-niyetli, marka-içermeyen Türkçe soru üret. Sorular alıcı niyeti taşımalı (en iyi X, X mi Y mi, nasıl seçilir gibi).

Konu: ${topic}${industry ? `\nSektör: ${industry}` : ''}

Her soru için JSON. intent: Keşif|Karşılaştırma|Değerlendirme|Nasıl yapılır. demand: Yüksek|Orta|Düşük (tahmini arama talebi).
Format: {"items":[{"prompt":"...","intent":"Keşif","demand":"Yüksek"}]}`;

  type Resp = { items: PromptIdea[] };
  const res = await completeJSON<Resp>(prompt, { maxTokens: 1200, temperature: 0.5 });
  if (res?.items?.length) {
    return res.items
      .filter((i) => i.prompt)
      .map((i) => ({
        prompt: i.prompt.trim(),
        intent: (INTENTS.includes(i.intent) ? i.intent : 'Keşif') as PromptIdea['intent'],
        demand: (DEMANDS.includes(i.demand) ? i.demand : 'Orta') as PromptIdea['demand'],
      }))
      .slice(0, 12);
  }
  // Fallback (LLM yoksa): konudan şablon türet
  return fallbackIdeas(topic);
}

function fallbackIdeas(topic: string): PromptIdea[] {
  const t = topic.trim();
  return [
    { prompt: `En iyi ${t} hangisi?`, intent: 'Keşif', demand: 'Yüksek' },
    { prompt: `${t} seçerken nelere dikkat etmeli?`, intent: 'Nasıl yapılır', demand: 'Orta' },
    { prompt: `Küçük işletmeler için en uygun ${t} nedir?`, intent: 'Keşif', demand: 'Yüksek' },
    { prompt: `${t} fiyatları ne kadar?`, intent: 'Değerlendirme', demand: 'Orta' },
    { prompt: `Ücretsiz ${t} alternatifleri var mı?`, intent: 'Keşif', demand: 'Orta' },
    { prompt: `${t} için en çok önerilen markalar hangileri?`, intent: 'Karşılaştırma', demand: 'Yüksek' },
  ];
}
