/**
 * Discovery panelinin saf yardımcıları — dürüstlük kurallarının birim karşılığı:
 * e-ticaret kartları yalnızca e-ticaret bağlamında, sıfıra bölmede sahte yüzde yok,
 * para birimi bilinmiyorsa uydurulmuyor.
 */
import { describe, expect, it } from 'vitest';
import {
  BOT_PURPOSE_LABELS,
  EVENT_TYPE_LABELS,
  GOAL_MATCH_LABELS,
  SITE_KIND_LABELS,
  labelOf,
  money,
  num,
  ratio,
  showCommerceCards,
  snippetFor,
} from '@/components/discovery/types';

describe('snippet', () => {
  it('tek satırlık async script üretir', () => {
    expect(snippetFor('https://independentai.space/sensor/v1.js', 'iais_abc')).toBe(
      '<script async src="https://independentai.space/sensor/v1.js" data-site="iais_abc"></script>',
    );
  });
});

describe('e-ticaret kartı görünürlüğü', () => {
  it('site türü e-ticaret ise gösterilir', () => {
    expect(showCommerceCards('ecommerce', [], [])).toBe(true);
  });

  it('site türü e-ticaret değilse satın alma hedefi olsa bile gösterilmez', () => {
    expect(showCommerceCards('service', [{ type: 'PURCHASE' }], [{ type: 'PURCHASE' }])).toBe(false);
    expect(showCommerceCards('saas', [], [{ type: 'ADD_TO_CART' }])).toBe(false);
  });

  it('tür seçilmemişse hedef/olaylardan çıkarım yapılır', () => {
    expect(showCommerceCards(null, [{ type: 'PURCHASE' }], [])).toBe(true);
    expect(showCommerceCards(null, [], [{ type: 'ADD_TO_CART' }])).toBe(true);
    expect(showCommerceCards(null, [{ type: 'LEAD' }], [{ type: 'PAGE_VIEW' }])).toBe(false);
    expect(showCommerceCards(undefined, [], [])).toBe(false);
  });
});

describe('sayı ve oran biçimleri', () => {
  it('sayı yoksa 0 gösterir (boş hücre bırakmaz)', () => {
    expect(num(0)).toBe('0');
    expect(num(null)).toBe('0');
    expect(num(undefined)).toBe('0');
    expect(num(1234)).toBe('1.234');
  });

  it('payda 0 iken yüzde uydurmaz', () => {
    expect(ratio(0, 0)).toBe('—');
    expect(ratio(5, 0)).toBe('—');
    expect(ratio(50, 100)).toBe('%50');
    expect(ratio(1, 1000)).toBe('%0.1');
  });

  it('para birimi bilinmiyorsa sembol eklemez, değer yoksa tire döner', () => {
    expect(money(null, 'TRY')).toBe('—');
    expect(money(1500, null)).toBe('1.500');
    expect(money(1500.5, 'TRY')).toBe('1.500,5 TRY');
  });
});

describe('etiketler', () => {
  it('bilinmeyen anahtarda ham değeri döndürür, boşta yedeği kullanır', () => {
    expect(labelOf(EVENT_TYPE_LABELS, 'ADD_TO_CART')).toBe('Sepete ekleme');
    expect(labelOf(BOT_PURPOSE_LABELS, 'AGENT')).toBe('Kullanıcı adına ajan');
    expect(labelOf(GOAL_MATCH_LABELS, 'PATH')).toBe('URL yolu');
    expect(labelOf(SITE_KIND_LABELS, 'ecommerce')).toBe('E-ticaret');
    expect(labelOf(SITE_KIND_LABELS, 'olmayan-tur')).toBe('olmayan-tur');
    expect(labelOf(SITE_KIND_LABELS, null, 'Tür seçilmedi')).toBe('Tür seçilmedi');
  });
});
