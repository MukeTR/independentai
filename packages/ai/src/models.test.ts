import { afterEach, describe, expect, it } from 'vitest';
import { estimateCostUsd, priceFor, resolveModel, DEFAULT_MODELS, webSearchEnabled } from './models';

afterEach(() => {
  delete process.env.OPENAI_MODEL;
  delete process.env.AI_MODEL_ALLOW_UNLISTED;
  delete process.env.AI_WEB_SEARCH;
});

describe('models', () => {
  it('varsayılan modeller katalogda ve fiyatlı', () => {
    for (const p of ['OPENAI', 'ANTHROPIC', 'GOOGLE'] as const) {
      expect(priceFor(p, DEFAULT_MODELS[p])).not.toBeNull();
    }
  });

  it('env override allowlist içindeyse kabul, dışındaysa varsayılana düşer', () => {
    process.env.OPENAI_MODEL = 'gpt-4.1-mini';
    expect(resolveModel('OPENAI')).toBe('gpt-4.1-mini');
    process.env.OPENAI_MODEL = 'gpt-hayali-9';
    expect(resolveModel('OPENAI')).toBe(DEFAULT_MODELS.OPENAI);
    process.env.AI_MODEL_ALLOW_UNLISTED = '1';
    expect(resolveModel('OPENAI')).toBe('gpt-hayali-9');
  });

  it('maliyet: bilinen model için hesaplar, bilinmeyen için null (0 değil)', () => {
    expect(estimateCostUsd('OPENAI', 'gpt-4o-mini', { inputTokens: 1_000_000, outputTokens: 1_000_000 })).toBeCloseTo(
      0.75,
      6,
    );
    expect(estimateCostUsd('OPENAI', 'gpt-hayali-9', { inputTokens: 10, outputTokens: 10 })).toBeNull();
    expect(estimateCostUsd('OPENAI', 'gpt-4o-mini', { inputTokens: undefined, outputTokens: 5 })).toBeNull();
  });

  it('web arama çağrısı maliyete eklenir', () => {
    const base = estimateCostUsd('ANTHROPIC', 'claude-haiku-4-5', { inputTokens: 1000, outputTokens: 1000 })!;
    const withSearch = estimateCostUsd('ANTHROPIC', 'claude-haiku-4-5', {
      inputTokens: 1000,
      outputTokens: 1000,
      webSearchCount: 2,
    })!;
    expect(withSearch - base).toBeCloseTo(0.02, 6);
  });

  it('tarihli model id (snapshot) katalog kaydına eşlenir', () => {
    expect(priceFor('OPENAI', 'gpt-4o-mini-2024-07-18')).not.toBeNull();
  });

  it('AI_WEB_SEARCH varsayılan açık, 0 ile kapanır', () => {
    expect(webSearchEnabled()).toBe(true);
    process.env.AI_WEB_SEARCH = '0';
    expect(webSearchEnabled()).toBe(false);
  });
});
