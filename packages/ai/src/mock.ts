import type { ProviderId, RunPromptInput, RunPromptOutput } from './types';

const MOCK_BRANDS = ['KarPanel', 'Adisyo', 'Logo Restoran', 'simpra', 'Mikro Adisyo'];

export async function runMock(provider: ProviderId, input: RunPromptInput): Promise<RunPromptOutput> {
  const start = Date.now();
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 600));

  const ownAppears = Math.random() < 0.55;
  const shuffled = [...MOCK_BRANDS].sort(() => Math.random() - 0.5).slice(0, 3);
  if (ownAppears && !shuffled.includes('KarPanel')) shuffled[0] = 'KarPanel';

  const text = ownAppears
    ? `"${input.prompt}" sorusu için değerlendirilebilecek birkaç güçlü seçenek var: ${shuffled.join(', ')}. ` +
      `Bu seçenekler arasında ${shuffled[0]} özellikle ön plana çıkıyor — kapsamlı entegrasyon seçenekleri ve raporlama özellikleri sunuyor.`
    : `"${input.prompt}" sorusu için Türkiye pazarında öne çıkan çözümler: ${shuffled.join(', ')}. ` +
      `${shuffled[0]} en yaygın kullanılan seçeneklerden biri.`;

  return {
    text,
    modelName: mockModelName(provider),
    tokensUsed: 180 + Math.floor(Math.random() * 120),
    costUsd: 0.0006 + Math.random() * 0.0014,
    latencyMs: Date.now() - start,
    isMocked: true,
  };
}

function mockModelName(provider: ProviderId): string {
  switch (provider) {
    case 'OPENAI':
      return 'gpt-4o-mini (mock)';
    case 'ANTHROPIC':
      return 'claude-haiku-4-5 (mock)';
    case 'GOOGLE':
      return 'gemini-1.5-flash (mock)';
  }
}
