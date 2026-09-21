/**
 * Ürün Açıklama Yazıcı (Faz E) — AI destekli ürün açıklaması + 5 SSS + meta başlık/açıklama +
 * Product JSON-LD iskeleti.
 *
 * Kurallar:
 *  - Sağlayıcı yoksa `ProviderUnavailableError` (503). Sahte/mock çıktı YOK.
 *  - Prompt'ta uydurma yasağı: yalnızca verilen özellikler kullanılır; bilinmeyen alanlar (fiyat,
 *    SKU, görsel) JSON-LD'de boş bırakılır ve `placeholders` ile işaretlenir.
 *  - Çıktı zod ile doğrulanır; geçersizse tek bir düzeltme denemesi, sonra 503.
 */
import { z } from 'zod';
import { completeJSON, hasLLM, lastUsage } from '@independentai/ai';
import { ProviderUnavailableError } from '../errors';

export const PRODUCT_WRITER_TONES = ['neutral', 'friendly', 'premium', 'technical'] as const;
export type ProductWriterTone = (typeof PRODUCT_WRITER_TONES)[number];

export const ProductWriterInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Ürün adı en az 3 karakter olmalı')
    .max(160, 'Ürün adı en fazla 160 karakter olabilir'),
  features: z.array(z.string().trim().min(2).max(200)).min(1, 'En az bir özellik girin').max(20, 'En fazla 20 özellik'),
  audience: z.string().trim().max(160).optional(),
  tone: z.enum(PRODUCT_WRITER_TONES).optional(),
  language: z.enum(['tr', 'en']),
  platform: z.string().trim().max(40).optional(),
  brand: z.string().trim().max(80).optional(),
  category: z.string().trim().max(80).optional(),
});
export type ProductWriterInput = z.infer<typeof ProductWriterInputSchema>;

const OutputSchema = z.object({
  description: z.string().min(40),
  shortDescription: z.string().min(10).max(400),
  bullets: z.array(z.string().min(2)).min(3).max(8),
  faq: z
    .array(z.object({ question: z.string().min(5), answer: z.string().min(5) }))
    .min(4)
    .max(6),
  metaTitle: z.string().min(5).max(80),
  metaDescription: z.string().min(20).max(200),
});
export type ProductWriterOutput = z.infer<typeof OutputSchema>;

export type ProductWriterResult = ProductWriterOutput & {
  language: 'tr' | 'en';
  jsonLd: Record<string, unknown>;
  /** Doldurulması gereken JSON-LD alanları (uydurulmadı) */
  placeholders: string[];
  notice: string;
  provider: string | null;
  model: string | null;
  generatedAt: string;
};

const TONE_LABEL: Record<ProductWriterTone, { tr: string; en: string }> = {
  neutral: { tr: 'nötr ve bilgilendirici', en: 'neutral and informative' },
  friendly: { tr: 'samimi ve sıcak', en: 'friendly and warm' },
  premium: { tr: 'premium ve sade', en: 'premium and understated' },
  technical: { tr: 'teknik ve net', en: 'technical and precise' },
};

export function buildProductWriterPrompt(input: ProductWriterInput): { system: string; prompt: string } {
  const tr = input.language === 'tr';
  const tone = TONE_LABEL[input.tone ?? 'neutral'][input.language];
  const system = tr
    ? `Sen e-ticaret ürün içeriği yazan bir editörsün. KESİN KURAL: yalnızca kullanıcının verdiği özellikleri kullan; verilmeyen hiçbir spesifikasyon, ölçü, malzeme, sertifika, fiyat, garanti süresi veya istatistik UYDURMA. Emin olmadığın bilgiyi yazma. Abartılı üstünlük iddiaları ("en iyi", "%100") kullanma. Çıktı yalnızca geçerli JSON olmalı.`
    : `You are an e-commerce product copy editor. STRICT RULE: use only the features the user provided; do NOT invent any specification, dimension, material, certification, price, warranty period or statistic that was not given. Do not state anything you are unsure about. Avoid superlative claims ("the best", "100%"). Output must be valid JSON only.`;
  const featureList = input.features.map((f, i) => `${i + 1}. ${f}`).join('\n');
  const ctx = [
    input.brand ? (tr ? `Marka: ${input.brand}` : `Brand: ${input.brand}`) : null,
    input.category ? (tr ? `Kategori: ${input.category}` : `Category: ${input.category}`) : null,
    input.audience ? (tr ? `Hedef kitle: ${input.audience}` : `Audience: ${input.audience}`) : null,
    input.platform ? (tr ? `Platform: ${input.platform}` : `Platform: ${input.platform}`) : null,
  ]
    .filter(Boolean)
    .join('\n');
  const prompt = tr
    ? `Ürün: ${input.title}
${ctx}
Verilen özellikler (yalnızca bunları kullan):
${featureList}

Ton: ${tone}. Dil: Türkçe. AI arama motorlarının (ChatGPT, Perplexity, Gemini) doğrudan alıntılayabileceği, kısa cümleli, bilgi-yoğun içerik üret.

Şu JSON şemasıyla cevap ver:
{
  "description": "120-220 kelimelik ürün açıklaması; 2-3 kısa paragraf; ilk cümle ürünün ne olduğunu ve kimin için olduğunu söyler",
  "shortDescription": "1-2 cümle, en fazla 300 karakter",
  "bullets": ["3-8 madde; her biri verilen bir özelliğe dayanır"],
  "faq": [{"question": "...", "answer": "..."}] (tam 5 soru; müşteri dilinde; cevaplar 1-3 cümle; yalnızca verilen bilgiyle cevaplanabilecek sorular),
  "metaTitle": "en fazla 60 karakter",
  "metaDescription": "120-155 karakter"
}`
    : `Product: ${input.title}
${ctx}
Given features (use only these):
${featureList}

Tone: ${tone}. Language: English. Write concise, information-dense copy that AI search engines (ChatGPT, Perplexity, Gemini) can quote directly.

Respond with this JSON schema:
{
  "description": "120-220 word product description; 2-3 short paragraphs; first sentence states what the product is and who it is for",
  "shortDescription": "1-2 sentences, max 300 characters",
  "bullets": ["3-8 bullets; each grounded in a given feature"],
  "faq": [{"question": "...", "answer": "..."}] (exactly 5; customer language; 1-3 sentence answers; only questions answerable from the given facts),
  "metaTitle": "max 60 characters",
  "metaDescription": "120-155 characters"
}`;
  return { system, prompt };
}

/** Deterministik JSON-LD iskeleti: bilinmeyen alanlar boş bırakılır (uydurma yok). */
export function buildProductJsonLd(
  input: ProductWriterInput,
  out: ProductWriterOutput,
): { jsonLd: Record<string, unknown>; placeholders: string[] } {
  const placeholders = ['image', 'sku', 'offers.price', 'offers.url'];
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.title,
    description: out.shortDescription,
    ...(input.brand ? { brand: { '@type': 'Brand', name: input.brand } } : {}),
    ...(input.category ? { category: input.category } : {}),
    image: [],
    sku: '',
    offers: {
      '@type': 'Offer',
      price: '',
      priceCurrency: input.language === 'tr' ? 'TRY' : 'USD',
      availability: 'https://schema.org/InStock',
      url: '',
    },
  };
  if (!input.brand) placeholders.push('brand');
  return { jsonLd, placeholders };
}

export async function writeProductContent(raw: ProductWriterInput): Promise<ProductWriterResult> {
  const input = ProductWriterInputSchema.parse(raw);
  if (!hasLLM())
    throw new ProviderUnavailableError(
      'İçerik üretimi için bir AI sağlayıcı anahtarı (OpenAI/Anthropic/Google) gerekli.',
    );
  const { system, prompt } = buildProductWriterPrompt(input);

  let parsed: ProductWriterOutput | null = null;
  let lastIssue = '';
  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    const extra =
      attempt === 0
        ? ''
        : `\n\nÖnceki çıktı şu nedenle geçersizdi: ${lastIssue}. Şemaya birebir uy ve yalnızca JSON döndür.`;
    const res = await completeJSON<unknown>(prompt + extra, { system, maxTokens: 1800, temperature: 0.5 });
    if (!res) {
      lastIssue = 'boş yanıt';
      continue;
    }
    const v = OutputSchema.safeParse(normalizeOutput(res));
    if (v.success) parsed = v.data;
    else
      lastIssue = v.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')
        .slice(0, 300);
  }
  if (!parsed) throw new ProviderUnavailableError('AI çıktısı doğrulanamadı; lütfen tekrar deneyin.');

  const { jsonLd, placeholders } = buildProductJsonLd(input, parsed);
  return {
    ...parsed,
    language: input.language,
    jsonLd,
    placeholders,
    notice:
      input.language === 'tr'
        ? 'Yalnızca girdiğiniz özellikler kullanıldı. Yayınlamadan önce metni doğrulayın; fiyat, SKU, görsel ve URL alanlarını kendiniz doldurun.'
        : 'Only the features you provided were used. Verify the copy before publishing; fill in price, SKU, image and URL yourself.',
    provider: lastUsage?.provider ?? null,
    model: lastUsage?.model ?? null,
    generatedAt: new Date().toISOString(),
  };
}

/** Model çıktısındaki küçük biçim sapmalarını tolere eder (string madde yerine nesne vb.). */
function normalizeOutput(res: unknown): unknown {
  if (!res || typeof res !== 'object') return res;
  const o = { ...(res as Record<string, unknown>) };
  if (Array.isArray(o.bullets))
    o.bullets = o.bullets
      .map((b) => (typeof b === 'string' ? b : String((b as Record<string, unknown>)?.text ?? '')))
      .filter(Boolean);
  if (Array.isArray(o.faq)) {
    o.faq = o.faq
      .map((f) => {
        const x = f as Record<string, unknown>;
        return { question: String(x.question ?? x.q ?? ''), answer: String(x.answer ?? x.a ?? '') };
      })
      .slice(0, 6);
  }
  if (typeof o.metaTitle === 'string' && o.metaTitle.length > 80) o.metaTitle = o.metaTitle.slice(0, 80);
  if (typeof o.metaDescription === 'string' && o.metaDescription.length > 200)
    o.metaDescription = o.metaDescription.slice(0, 200);
  if (typeof o.shortDescription === 'string' && o.shortDescription.length > 400)
    o.shortDescription = o.shortDescription.slice(0, 400);
  return o;
}
