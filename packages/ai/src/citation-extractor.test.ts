import { describe, expect, it } from 'vitest';
import { extractCitations, normalizeDomain, aggregateByDomain } from './citation-extractor';
import { parseJSON } from './llm';
import { classifyError } from './retry';

describe('extractCitations', () => {
  it("provider atıflarını, markdown ve çıplak URL'leri birleştirip tekilleştirir", () => {
    const text =
      'Bkz. [G2](https://www.g2.com/products/x) ve https://www.g2.com/products/x. Ayrıca https://tr.wikipedia.org/wiki/A_(B).';
    const out = extractCitations(text, [{ url: 'https://capterra.com/y', title: 'Capterra' }]);
    expect(out.map((c) => c.domain)).toEqual(['capterra.com', 'g2.com', 'tr.wikipedia.org']);
    expect(out[2]?.url).toBe('https://tr.wikipedia.org/wiki/A_(B)');
  });
  it('domain normalize eder', () => {
    expect(normalizeDomain('https://WWW.Example.com/a')).toBe('example.com');
    expect(normalizeDomain('not a url')).toBe('');
  });
  it('domain bazında sayar ve sıralar', () => {
    expect(aggregateByDomain([{ domain: 'a' }, { domain: 'b' }, { domain: 'a' }])).toEqual([
      { domain: 'a', count: 2 },
      { domain: 'b', count: 1 },
    ]);
  });
});

describe('parseJSON', () => {
  it('code fence ve çevre metni temizler', () => {
    expect(parseJSON('İşte:\n```json\n{"a":1}\n```\nteşekkürler')).toEqual({ a: 1 });
    expect(parseJSON('[1,2] son')).toEqual([1, 2]);
    expect(parseJSON('geçersiz')).toBeNull();
  });
});

describe('classifyError', () => {
  it('HTTP durum ve mesajdan sınıf çıkarır; retryable bayrağı doğru', () => {
    expect(classifyError('OPENAI', { status: 429, message: 'rate limit' }).code).toBe('rate_limit');
    expect(classifyError('OPENAI', { status: 401, message: 'bad key' })).toMatchObject({
      code: 'auth',
      retryable: false,
    });
    expect(classifyError('GOOGLE', { name: 'AbortError', message: 'aborted' })).toMatchObject({
      code: 'timeout',
      retryable: true,
    });
    expect(classifyError('ANTHROPIC', { status: 503, message: 'overloaded' }).retryable).toBe(true);
    expect(classifyError('OPENAI', { status: 400, message: 'unsupported tool' }).code).toBe('invalid');
  });
});
