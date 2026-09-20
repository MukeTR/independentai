import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { NotFoundError } from '@/server/errors';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { latestRankings, rankingsPayload } from '@/server/openrouter-rankings';

/**
 * Herkese açık ham veri: `GET /api/public/model-rankings` → son OpenRouter anlık görüntüsü.
 *
 * Sayfadaki her sayı buradan çıkar; teknik okur tabloyu doğrulamak için aynı kaydı okuyabilir.
 * Kimlik yok, parametre yok, yazma yok; IP başına LIMITS.publicModelRankings.
 * Henüz kayıt yoksa 404 + standart hata gövdesi ({ message, code, requestId }).
 *
 * ÖNBELLEK: yok. next.config.mjs tüm /api/* yolları için `Cache-Control: no-store` başlığı
 * koyuyor ve bu başlık route'un kendi başlığını eziyor. Diğer herkese açık uçlarla aynı
 * davranışı bozmamak için burada da özel bir istisna AÇMIYORUZ; kayıt zaten günde bir
 * tazeleniyor ve sorgu tek bir satır okuyor.
 */
export const GET = route('public.model-rankings', async (req) => {
  const headers = await enforceRateLimit(req, LIMITS.publicModelRankings);
  const snap = await latestRankings();
  if (!snap) throw new NotFoundError('Henüz kayıtlı bir model kullanım anlık görüntüsü yok');
  return NextResponse.json(rankingsPayload(snap), { headers });
});
