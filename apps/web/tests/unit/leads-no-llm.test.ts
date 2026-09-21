import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/** KVKK sözleşmesi: lead verisi hiçbir LLM'e gitmez — kaynak dosya AI paketini import edemez. */
describe('leads.ts LLM izolasyonu', () => {
  const src = readFileSync(path.resolve(__dirname, '../../src/server/leads.ts'), 'utf8');
  it('@independentai/ai import etmez ve LLM yardımcılarını çağırmaz', () => {
    expect(src).not.toMatch(/from ['"]@independentai\/ai['"]/);
    expect(src).not.toMatch(/import\(['"]@independentai\/ai['"]\)|require\(['"]@independentai\/ai['"]\)/);
    expect(src).not.toMatch(/\b(getAdapter|completeJSON|complete|embed|hasLLM)\s*\(/);
    expect(src).not.toMatch(/from ['"]\.\.?\/(run-prompt|aeo-writer|content-audit|geo-audit|hallucination)['"]/);
  });
  it('sözleşme dosya başında yazılıdır', () => {
    expect(src).toMatch(/@independentai\/ai` import ETMEZ/);
  });
});
