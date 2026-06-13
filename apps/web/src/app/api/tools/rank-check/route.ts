import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdapter, extractMentions, type ProviderId } from '@independentai/ai';
import { hydrateEnvFromConfig } from '@/server/system-config';

export const maxDuration = 60;

const schema = z.object({
  brand: z.string().min(1).max(80),
  prompt: z.string().min(3).max(300),
  provider: z.enum(['OPENAI', 'ANTHROPIC', 'GOOGLE']),
});

// Basit IP bazlı rate limit (best-effort, instance-local)
const hits = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 8;
const WINDOW = 60 * 60 * 1000; // 1 saat

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW });
    return false;
  }
  rec.count += 1;
  return rec.count > LIMIT;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (rateLimited(ip)) {
      return NextResponse.json({ message: 'Saatlik deneme limitine ulaştınız. Tam takip için kayıt olun.' }, { status: 429 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz giriş' }, { status: 400 });
    const { brand, prompt, provider } = parsed.data;

    await hydrateEnvFromConfig();
    const adapter = getAdapter(provider as ProviderId);
    const out = await adapter.run({ prompt, language: 'tr' });

    const mentions = extractMentions(out.text, [{ name: brand, aliases: [] }], []);
    const own = mentions.find((m) => m.isOwnBrand);
    // Diğer bahisleri kabaca tespit et (büyük harfle başlayan marka benzeri isimler)
    const otherBrands = detectOtherBrands(out.text, brand).slice(0, 6);

    return NextResponse.json({
      found: !!own,
      position: own?.position ?? null,
      sentiment: own?.sentiment ?? null,
      snippet: own?.snippet ?? null,
      otherBrands,
      answer: out.text,
      modelName: out.modelName,
      isMocked: out.isMocked,
    });
  } catch (err) {
    return NextResponse.json({ message: err instanceof Error ? err.message : 'Hata' }, { status: 500 });
  }
}

/** Cevapta geçen diğer olası marka adları (kaba heuristik). */
function detectOtherBrands(text: string, ownBrand: string): string[] {
  const own = ownBrand.toLowerCase();
  const candidates = text.match(/\b[A-ZÇĞİÖŞÜ][a-zçğıöşü]+(?:[A-ZÇĞİÖŞÜ][a-zçğıöşü]+)?\b/g) || [];
  const stop = new Set(['Ben', 'Bir', 'Bu', 'Şu', 'Ve', 'İçin', 'İle', 'Ama', 'Türkiye', 'İstanbul', 'Ancak', 'Ayrıca', 'Genellikle', 'Eğer']);
  const seen = new Map<string, number>();
  for (const c of candidates) {
    if (c.toLowerCase() === own || stop.has(c) || c.length < 3) continue;
    seen.set(c, (seen.get(c) ?? 0) + 1);
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}
