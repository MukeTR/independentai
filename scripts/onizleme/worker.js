/**
 * Yanıt — vitrin önizlemesi (BACKEND YOK).
 *
 * Bu Worker, Next uygulamasının statik bir anlık görüntüsünü sunar. Ölçüm, form gönderimi,
 * oturum ve panel YOKTUR; bunlar sunucu tarafı gerektirir. Amaç siteyi göstermek.
 *
 * Kurallar:
 *  - /api/*  → 503 + Türkçe açıklama. Arayüzdeki apiFetch bu gövdedeki `message` alanını
 *              olduğu gibi kullanıcıya gösterir, böylece çirkin bir çökme yerine net bir cümle çıkar.
 *  - ?_rsc=  → 404. Next istemci tarafı gezinmede RSC yükü ister; statik kopyada yoktur.
 *              Hızlı 404 dönünce Next tam sayfa gezinmeye düşer ve site normal çalışır.
 *  - robots  → her şey kapalı. Bu kopya arama motorlarında yanit.io ile yarışmamalı.
 *  - Tüm yanıtlarda X-Robots-Tag: noindex.
 */

const API_MESAJI = {
  message:
    'Bu bir vitrin önizlemesidir; ölçüm sunucusu bağlı değil. Gerçek tarama, rapor ve form gönderimi yanit.io üzerinde çalışır.',
  code: 'preview_no_backend',
};

const ROBOTS = `# Vitrin önizlemesi — dizine eklenmemeli.
User-agent: *
Disallow: /
`;

const GUVENLIK = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow',
};

function basliklariEkle(res) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(GUVENLIK)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/robots.txt') {
      return new Response(ROBOTS, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', ...GUVENLIK },
      });
    }

    // Vercel Analytics betiği bu barındırmada yok; 404 gürültüsü yerine sessiz 204.
    if (url.pathname.startsWith('/_vercel/')) {
      return new Response(null, { status: 204, headers: GUVENLIK });
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify(API_MESAJI), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...GUVENLIK },
      });
    }

    // Next istemci gezinmesinin RSC yükü statik kopyada yok; hızlı 404 tam sayfa gezinmeye düşürür.
    if (url.searchParams.has('_rsc')) {
      return new Response(null, { status: 404, headers: GUVENLIK });
    }

    return basliklariEkle(await env.ASSETS.fetch(request));
  },
};
