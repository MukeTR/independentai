/**
 * Route handler sarmalayıcı: request id, merkezi hata dönüşümü, cache kapatma.
 */
import type { NextRequest } from 'next/server';
import { handleRouteError, NotFoundError } from './errors';
import { newRequestId } from './logger';

type Ctx = { params: Promise<Record<string, string>> };
type Handler = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/** Dinamik segment parametresi; yoksa 404. */
export async function requireParam(ctx: Ctx, name: string): Promise<string> {
  const v = (await ctx.params)[name];
  if (!v) throw new NotFoundError();
  return v;
}

export function route(name: string, fn: Handler): Handler {
  return async (req, ctx) => {
    const requestId = req.headers.get('x-request-id')?.slice(0, 64) || newRequestId();
    try {
      const res = await fn(req, ctx);
      res.headers.set('x-request-id', requestId);
      if (!res.headers.has('cache-control')) res.headers.set('cache-control', 'no-store');
      return res;
    } catch (err) {
      return handleRouteError(err, { requestId, route: name });
    }
  };
}
