/**
 * İstatistik sabitleri — TEK kaynak. Sektör sayfaları, landing ve blog yalnız buradan cümle alır;
 * kaynaksız yüzde YAZILMAZ (RESEARCH_BRIFING §C.1 / §D.2). Yıl karışıklığına dikkat: %92,3 = TÜİK 2026, %19,2 = TÜİK 2025.
 * Güven: 'yüksek' birincil kaynak; 'orta' ikincil (Digital 2026 ChatGPT payı). TÜİK 2026 YZ verisi Ekim 2026'da çıkınca
 * `genAiUsage` güncellenmeli.
 */

export type StatKey = 'internetUsage' | 'genAiUsage' | 'whatsappUsage' | 'chatgptShare';

export type Stat = {
  key: StatKey;
  /** Görünen değer, Türkçe biçim (ondalık virgül) */
  value: string;
  label: string;
  /** Verinin yılı — cümlede bu yıl geçer */
  year: number;
  source: string;
  sourceUrl: string;
  confidence: 'yüksek' | 'orta';
  /** Landing/sektör sayfasında olduğu gibi kullanılacak cümle (kaynak + yıl dahil) */
  sentence: string;
  note?: string;
};

export const STATS: Record<StatKey, Stat> = {
  internetUsage: {
    key: 'internetUsage',
    value: '%92,3',
    label: '16–74 yaş internet kullanımı',
    year: 2026,
    source: 'TÜİK Hanehalkı Bilişim Teknolojileri Kullanım Araştırması 2026',
    sourceUrl: 'https://data.tuik.gov.tr/Bulten/Index?p=Hanehalki-Bilisim-Teknolojileri-(BT)-Kullanim-Arastirmasi-2026',
    confidence: 'yüksek',
    sentence: 'Türkiye’de 16–74 yaş nüfusun %92,3’ü internet kullanıyor (TÜİK 2026).',
  },
  genAiUsage: {
    key: 'genAiUsage',
    value: '%19,2',
    label: 'Üretken yapay zekâ kullananlar',
    year: 2025,
    source: 'TÜİK Yapay Zekâ İstatistikleri 2025',
    sourceUrl:
      'https://www.aa.com.tr/tr/bilim-teknoloji/turkiyede-uretken-yapay-zeka-kullandigini-beyan-edenlerin-orani-yuzde-19-2/3703970',
    confidence: 'yüksek',
    sentence:
      'Türkiye’de her 5 kişiden 1’i (%19,2) üretken yapay zekâ kullanıyor; 16–24 yaşta her 5 kişiden 2’si (TÜİK 2025).',
    note: 'TÜİK 2026 yapay zekâ verisi Ekim 2026’da bekleniyor; çıkınca güncellenmeli.',
  },
  whatsappUsage: {
    key: 'whatsappUsage',
    value: '%90,0',
    label: 'WhatsApp kullanım oranı',
    year: 2026,
    source: 'TÜİK Hanehalkı Bilişim Teknolojileri Kullanım Araştırması 2026',
    sourceUrl:
      'https://techolay.net/tuik-2026-hanehalki-bilisim-raporunu-acikladi-internet-kullanimi-yuzde-92-3e-yukseldi/',
    confidence: 'yüksek',
    sentence: 'Türkiye’de internet kullanıcılarının %90,0’ı WhatsApp kullanıyor (TÜİK 2026).',
  },
  chatgptShare: {
    key: 'chatgptShare',
    value: '%94,49',
    label: 'Yapay zekâ kaynaklı web trafiğinde ChatGPT payı',
    year: 2026,
    source: 'Digital 2026 (We Are Social + Meltwater)',
    sourceUrl:
      'https://tr.euronews.com/next/2026/01/04/turkiye-chatgpt-trafiginde-yuzde-9449luk-oranla-dunya-birincisi',
    confidence: 'orta',
    sentence: 'Türkiye’de yapay zekâ araçlarından gelen web trafiğinin %94,49’u ChatGPT’den geliyor (Digital 2026).',
    note: 'İkincil kaynak (haber özeti); birincil raporda doğrulanana kadar “orta güven”.',
  },
};

export const STAT_KEYS = Object.keys(STATS) as StatKey[];

export function statSentence(key: StatKey): string {
  return STATS[key].sentence;
}
