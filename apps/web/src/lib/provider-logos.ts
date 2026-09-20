/**
 * Sağlayıcı logoları — slug → dosya eşlemesi. TEK kaynak.
 *
 * NEDEN BURADA: sağlayıcı listesi VERİDEN gelir (OpenRouter'ın o haftaki sıralaması), sabit
 * değildir. Yarın listeye yeni bir sağlayıcı girebilir. Bu yüzden eşleme tek bir yerde durur ve
 * eşlemede olmayan her slug otomatik olarak MONOGRAM rozetine düşer; kırık görsel oluşmaz.
 *
 * DOSYALAR: `public/img/saglayici/<dosya>` altında, Simple Icons setinden indirilmiş tek renkli
 * SVG'ler. Hepsi `fill="currentColor"` ile kaydedildi ve sayfada CSS maskesiyle boyanır —
 * marka renkleri KULLANILMAZ, logo sayfanın mürekkep tonunda durur.
 *
 * TELİF: logolar yalnızca gerçek bir karşılaştırma tablosunda markayı ADLANDIRMAK için kullanılır.
 * Sağlayıcı adı zaten metin olarak yanlarında yazar; logo dekoratiftir (`aria-hidden`).
 * Hiçbiri Yanıt'ın kendi markasıymış gibi gösterilmez.
 *
 * BURAYA YENİ KAYIT EKLERKEN: önce dosyanın `public/img/saglayici/` altında GERÇEKTEN var
 * olduğunu doğrulayın. Olmayan dosyaya referans bırakmak, boş kutu demektir.
 */

export type SaglayiciLogo = {
  /** `public/img/saglayici/` altındaki dosya adı. Yoksa monograma düşer. */
  file?: string;
  /** Markanın kendi yazımı; monogram harfleri ve `title` bundan üretilir. */
  label: string;
};

/** Slug, kaynaktaki permaslug'ın eğik çizgiden önceki kısmıdır ("openai/gpt-…" → "openai"). */
export const SAGLAYICI_LOGOLARI: Record<string, SaglayiciLogo> = {
  openai: { file: 'openai.svg', label: 'OpenAI' },
  anthropic: { file: 'anthropic.svg', label: 'Anthropic' },
  google: { file: 'google.svg', label: 'Google' },
  deepseek: { file: 'deepseek.svg', label: 'DeepSeek' },
  meta: { file: 'meta.svg', label: 'Meta' },
  'meta-llama': { file: 'meta.svg', label: 'Meta' },
  nvidia: { file: 'nvidia.svg', label: 'NVIDIA' },
  xiaomi: { file: 'xiaomi.svg', label: 'Xiaomi' },
  // Simple Icons setinde kurumsal Tencent markası yok; QQ markası Tencent'in kendi işaretidir.
  tencent: { file: 'tencentqq.svg', label: 'Tencent' },
  minimax: { file: 'minimax.svg', label: 'MiniMax' },
  moonshotai: { file: 'moonshotai.svg', label: 'Moonshot AI' },
  qwen: { file: 'qwen.svg', label: 'Qwen' },
  alibaba: { file: 'qwen.svg', label: 'Alibaba' },
  mistralai: { file: 'mistralai.svg', label: 'Mistral AI' },
  perplexity: { file: 'perplexity.svg', label: 'Perplexity' },
  microsoft: { file: 'microsoft.svg', label: 'Microsoft' },
  amazon: { file: 'amazon.svg', label: 'Amazon' },
  // Logosu olmayanlar: yalnız düzgün yazımı veriyoruz, rozet monograma düşüyor.
  'z-ai': { label: 'Z.ai' },
  upstage: { label: 'Upstage' },
  poolside: { label: 'Poolside' },
  'x-ai': { label: 'xAI' },
  cohere: { label: 'Cohere' },
  ai21: { label: 'AI21' },
};

export type SaglayiciGorsel = {
  /** Maskelenecek SVG'nin yolu. Eşlemede dosya yoksa undefined kalır. */
  src?: string;
  /** Logosuz sağlayıcı için iki harflik rozet. */
  monogram: string;
  /** İnsan okuması için marka yazımı (eşlemede yoksa slug'ın kendisi). */
  label: string;
};

/**
 * "z-ai" → "ZA", "poolside" → "PO", "Moonshot AI" → "MA".
 * Türkçe büyütme kullanılır ki "i" → "İ" olsun.
 */
function monogramUret(label: string): string {
  const parcalar = label.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const ham =
    parcalar.length >= 2
      ? `${parcalar[0]!.slice(0, 1)}${parcalar[1]!.slice(0, 1)}`
      : (parcalar[0] ?? label).slice(0, 2);
  return ham.toLocaleUpperCase('tr-TR');
}

/** Sağlayıcı slug'ından görsel kaydını çıkarır. Eşlemede olmayan slug sessizce monograma düşer. */
export function saglayiciGorseli(slug: string): SaglayiciGorsel {
  const kayit = SAGLAYICI_LOGOLARI[slug.toLowerCase()];
  const label = kayit?.label ?? slug;
  return {
    src: kayit?.file ? `/img/saglayici/${kayit.file}` : undefined,
    monogram: monogramUret(label),
    label,
  };
}
