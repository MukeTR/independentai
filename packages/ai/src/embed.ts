/**
 * Metin embedding'leri — kanibalizasyon analizi (Faz 7) için.
 * OpenAI varsa text-embedding-3-small; yoksa deterministik hash-tabanlı
 * sözde-embedding (mock) — gerçek API olmadan da kümeleme çalışsın diye.
 */
import OpenAI from 'openai';

const MOCK_DIM = 256;

export async function embed(texts: string[]): Promise<number[][]> {
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const res = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
      });
      return res.data.map((d) => d.embedding);
    } catch {
      // API hatası → mock'a düş
    }
  }
  return texts.map(mockEmbed);
}

/** Deterministik bag-of-words hash embedding (gerçek API yokken). */
function mockEmbed(text: string): number[] {
  const vec = new Array(MOCK_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
  for (const tok of tokens) {
    let h = 0;
    for (let i = 0; i < tok.length; i++) h = (h * 31 + tok.charCodeAt(i)) | 0;
    vec[Math.abs(h) % MOCK_DIM] += 1;
  }
  return normalize(vec);
}

function normalize(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / mag);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < n; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    ma += ai * ai;
    mb += bi * bi;
  }
  const denom = Math.sqrt(ma) * Math.sqrt(mb);
  return denom ? dot / denom : 0;
}
