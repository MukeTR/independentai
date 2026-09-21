import { describe, expect, it } from 'vitest';
import { sanitizePayload, tenantTopic, agencyTopic } from '@/server/realtime';

describe('sanitizePayload', () => {
  it('yasak alanları (AI yanıtı, token, sır, e-posta, webhook, kimlik bilgisi) atar', () => {
    const out = sanitizePayload({
      event: 'run.completed',
      entityId: 'p1',
      status: 'SUCCESS',
      responseText: 'AI cevabı burada',
      token: 'iai_live_abc',
      accessToken: 'x',
      secret: 's',
      clientSecret: 's2',
      password: 'p',
      webhookUrl: 'https://hooks.slack.com/services/T/B/x',
      email: 'kisi@ornek.com',
      recipientEmail: 'kisi@ornek.com',
      credentials: { a: 1 },
      apiKey: 'sk-abc',
    });
    expect(Object.keys(out).sort()).toEqual(['entityId', 'event', 'status']);
    expect(JSON.stringify(out)).not.toMatch(/ornek\.com|hooks\.slack|sk-abc|AI cevabı/);
  });

  it('uzun string 200 karaktere kısaltılır; kısa string aynen kalır', () => {
    const long = 'a'.repeat(1000);
    const out = sanitizePayload({ summary: long, short: 'kısa' });
    expect((out.summary as string).length).toBe(200);
    expect(out.short).toBe('kısa');
  });

  it('null/undefined ve iç içe nesneler atılır; sayı/boolean korunur', () => {
    const out = sanitizePayload({
      progress: 42,
      ok: true,
      nothing: null,
      missing: undefined,
      nested: { deep: 'x' },
      fn: () => 1,
    });
    expect(out).toEqual({ progress: 42, ok: true });
  });

  it('diziler en fazla 20 skalar öğe taşır; nesne öğeler elenir', () => {
    const arr = [...Array.from({ length: 30 }, (_, i) => i), { obj: 1 }, 'x', null];
    const out = sanitizePayload({ list: arr });
    const list = out.list as unknown[];
    expect(list.length).toBeLessThanOrEqual(20);
    expect(list.every((x) => typeof x === 'string' || typeof x === 'number')).toBe(true);
  });

  it('topic yardımcıları sabit biçimdedir', () => {
    expect(tenantTopic('t1')).toBe('tenant:t1');
    expect(agencyTopic('a1')).toBe('agency:a1');
  });
});
