/**
 * AEO İçerik Yazıcı (Faz 9) — AI motorlarının alıntılamasına optimize, marka-sesli
 * içerik üretir: FAQ bloğu, Q&A sayfası, meta açıklama, sosyal medya gönderisi.
 */
import { complete, hasLLM } from '@independentai/ai';

export type AeoContentType = 'faq' | 'qa' | 'meta' | 'social';

const TYPE_LABELS: Record<AeoContentType, string> = {
  faq: 'FAQ bloğu (Schema-hazır)',
  qa: 'Soru-Cevap sayfası',
  meta: 'Meta başlık + açıklama',
  social: 'LinkedIn / sosyal gönderi',
};

function buildPrompt(type: AeoContentType, topic: string, brand?: string, notes?: string): string {
  const brandLine = brand ? `Marka: ${brand}` : '';
  const notesLine = notes ? `Ek notlar: ${notes}` : '';
  const base = `Konu: ${topic}\n${brandLine}\n${notesLine}\n\n`;

  switch (type) {
    case 'faq':
      return base + `Bu konu hakkında, ChatGPT/Claude/Gemini gibi AI motorlarının doğrudan alıntılayabileceği 6-8 soruluk bir FAQ üret. Her soru gerçek müşteri dilinde olsun, cevaplar kısa, net ve bilgi-yoğun olsun. Markdown formatında, her soru "### " başlığıyla yaz. Türkçe.`;
    case 'qa':
      return base + `Bu konu için AI-alıntılanabilir bir Soru-Cevap sayfası taslağı yaz: bir H1 başlık, kısa giriş (cevap-öncelikli, 2 cümle), ardından 4-5 alt başlık (soru formatında H2) ve altlarında net cevaplar. Markdown, Türkçe.`;
    case 'meta':
      return base + `Bu sayfa/konu için SEO+AEO optimize 1 meta başlık (max 60 karakter) ve 3 farklı meta açıklama alternatifi (her biri max 155 karakter, eyleme çağıran, net) üret. Türkçe.`;
    case 'social':
      return base + `Bu konuda otorite kuran, markayı doğal anan, paylaşılabilir bir LinkedIn gönderisi yaz (120-180 kelime, kısa paragraflar, 1 net içgörü + 3 madde + kapanış sorusu). Türkçe.`;
  }
}

export type AeoResult = { type: AeoContentType; label: string; content: string; available: boolean };

export async function generateAeoContent(
  type: AeoContentType,
  topic: string,
  brand?: string,
  notes?: string,
): Promise<AeoResult> {
  const label = TYPE_LABELS[type];
  if (!hasLLM()) {
    return {
      type,
      label,
      available: false,
      content: 'İçerik üretimi için bir AI sağlayıcı anahtarı (OpenAI/Anthropic/Google) gerekli. Süper admin panelinden ekleyin.',
    };
  }
  const content = await complete(buildPrompt(type, topic, brand, notes), { maxTokens: 1100, temperature: 0.6 });
  return { type, label, available: true, content: content?.trim() || 'İçerik üretilemedi, tekrar deneyin.' };
}
