import type { ProviderId, RunPromptInput, RunPromptOutput } from './types';
import { resolveModel } from './models';

/**
 * Mock adapter — YALNIZCA yerel geliştirme/demo için. Production'da provider anahtarı yoksa
 * adapter mock'a düşmez, `not_configured` hatası verir (bkz. index.ts / mockAllowed).
 * Çıktı deterministik değildir ama açıkça isMocked=true ve maliyet=null taşır.
 */
const MOCK_BRANDS = ['KarPanel', 'Adisyo', 'Logo Restoran', 'simpra', 'Mikro Adisyo'];

export async function runMock(provider: ProviderId, input: RunPromptInput): Promise<RunPromptOutput> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 150));

  const ownAppears = Math.random() < 0.55;
  const shuffled = [...MOCK_BRANDS].sort(() => Math.random() - 0.5).slice(0, 3);
  if (ownAppears && !shuffled.includes('KarPanel')) shuffled[0] = 'KarPanel';

  const text = ownAppears
    ? `"${input.prompt}" sorusu için değerlendirilebilecek birkaç güçlü seçenek var: ${shuffled.join(', ')}. ` +
      `Bu seçenekler arasında ${shuffled[0]} özellikle ön plana çıkıyor — kapsamlı entegrasyon seçenekleri ve raporlama özellikleri sunuyor. Kaynak: https://example.com/karsilastirma`
    : `"${input.prompt}" sorusu için Türkiye pazarında öne çıkan çözümler: ${shuffled.join(', ')}. ` +
      `${shuffled[0]} en yaygın kullanılan seçeneklerden biri.`;

  return {
    text,
    modelName: `${resolveModel(provider)} (mock)`,
    tokensUsed: 180 + Math.floor(Math.random() * 120),
    inputTokens: 60,
    outputTokens: 140,
    costUsd: null, // sahte maliyet yok — bilinmiyor
    latencyMs: Date.now() - start,
    isMocked: true,
    groundingMode: 'none',
    webSearchCount: 0,
  };
}
