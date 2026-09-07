import { describe, expect, it } from 'vitest';
import { extractMentions, detectOtherBrandsHeuristic, foldTr } from './mention-extractor';

const own = [{ id: 'b1', name: 'KarPanel', aliases: ['Kar Panel', 'karpanel.com'], isOwn: true }];
const comps = [
  { name: 'Adisyo', aliases: ['adisyo.com'] },
  { name: 'Logo', aliases: [] },
  { name: 'Logo Restoran', aliases: ['Logo POS'] },
];

describe('extractMentions', () => {
  it('pozisyonu ilk geçiş sırasına göre verir ve tekrarları tek bahis sayar', () => {
    const text = 'Adisyo iyi bir seçenek. KarPanel de öne çıkıyor. Adisyo ayrıca ucuz. KarPanel tavsiye edilir.';
    const m = extractMentions(text, own, comps);
    expect(m.map((x) => [x.mentionName, x.position])).toEqual([
      ['Adisyo', 1],
      ['KarPanel', 2],
    ]);
    expect(m.find((x) => x.isOwnBrand)?.occurrences).toBe(2);
  });

  it('Türkçe büyük/küçük harf (İ/ı) ve kesme işaretli ekleri tolere eder', () => {
    const text = "İSTANBUL'da KARPANEL'in ve karpanel’i deneyin; ADİSYO'yu da.";
    const m = extractMentions(text, own, comps);
    expect(m.some((x) => x.isOwnBrand)).toBe(true);
    expect(m.some((x) => x.isCompetitor && foldTr(x.mentionName) === 'adisyo')).toBe(true);
  });

  it('kelime sınırı: "KarPanelX" veya "SuperAdisyo" eşleşmez', () => {
    const m = extractMentions('KarPanelX ve SuperAdisyo hakkında', own, comps);
    expect(m).toHaveLength(0);
  });

  it('iç içe adlarda en uzun eşleşme kazanır (Logo vs Logo Restoran)', () => {
    const m = extractMentions('Logo Restoran ile karşılaştırınca fark var.', own, comps);
    expect(m.map((x) => x.mentionName)).toEqual(['Logo Restoran']);
  });

  it('domain alias protokol/www ile de eşleşir', () => {
    const m = extractMentions('Detaylar: https://www.karpanel.com/fiyat adresinde.', own, comps);
    expect(m[0]?.isOwnBrand).toBe(true);
  });

  it('boşluk farklılıklarına ve Unicode NFD girişe dayanıklıdır', () => {
    const m = extractMentions('Kar  Panel harika'.normalize('NFD'), own, comps);
    expect(m).toHaveLength(1);
  });

  it('liste satırında LISTED, tavsiye bağlamında RECOMMENDED tipi verir', () => {
    const list = '1. Adisyo — yaygın\n2. KarPanel — hızlı';
    const rec = 'Kesinlikle KarPanel tavsiye ederim.';
    expect(extractMentions(list, own, comps).find((x) => x.isOwnBrand)?.mentionType).toBe('LISTED');
    expect(extractMentions(rec, own, comps).find((x) => x.isOwnBrand)?.mentionType).toBe('RECOMMENDED');
  });

  it('boş metinde boş döner', () => {
    expect(extractMentions('', own, comps)).toEqual([]);
  });
});

describe('detectOtherBrandsHeuristic', () => {
  it('stop-word ve hariç tutulanları eler, tekrarı güven seviyesine yansıtır', () => {
    const out = detectOtherBrandsHeuristic(
      'Bunlar arasında Simpra ve Adisyo öne çıkıyor. Simpra ayrıca ucuz. İstanbul için ideal.',
      ['Adisyo'],
    );
    expect(out[0]).toMatchObject({ name: 'Simpra', confidence: 'medium' });
    expect(out.some((b) => b.name === 'İstanbul' || b.name === 'Adisyo')).toBe(false);
  });
});
