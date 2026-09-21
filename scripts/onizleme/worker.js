/**
 * Yanıt — statik vitrin sunucusu.
 *
 * Uygulamanın statik bir kopyasını sunar. Ölçüm, form gönderimi, oturum ve panel YOKTUR;
 * bunlar sunucu tarafı gerektirir.
 *
 * ALAN ADINA GÖRE DAVRANIR — bu ayrım önemli:
 *  - Önizleme adresi (*.workers.dev): arama motorlarına tamamen kapalı. Bu kopya marka
 *    alan adıyla arama sonuçlarında YARIŞMAMALI.
 *  - Marka alan adı (yanit.io): sitenin kendi robots.txt'i geçerli, noindex YOK. Burası
 *    gerçek site; dizine girmesi gerekir.
 *
 * /api/* her iki durumda da 503 döner ama mesaj farklıdır: önizlemede "vitrin kopyası",
 * marka alan adında ziyaretçiye ne yapacağını söyleyen bir cümle. Arayüzdeki apiFetch
 * gövdedeki `message` alanını olduğu gibi gösterdiği için çirkin bir çökme olmaz.
 */

const ONIZLEME_ROBOTS = `# Vitrin önizlemesi — dizine eklenmemeli.
User-agent: *
Disallow: /
`;

const GUVENLIK_TEMEL = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

/** Önizleme mi, gerçek alan adı mı. */
function onizlemeMi(url) {
  return url.hostname.endsWith('.workers.dev');
}

function basliklar(onizleme) {
  return onizleme ? { ...GUVENLIK_TEMEL, 'X-Robots-Tag': 'noindex, nofollow' } : { ...GUVENLIK_TEMEL };
}

function apiMesaji(onizleme) {
  return onizleme
    ? {
        message:
          'Bu bir vitrin önizlemesidir; ölçüm sunucusu bağlı değil. Gerçek tarama, rapor ve form gönderimi yanit.io üzerinde çalışır.',
        code: 'preview_no_backend',
      }
    : {
        message:
          'Bu özellik şu anda kullanılamıyor: ölçüm altyapısı henüz bu adrese bağlı değil. Talebinizi destek@yanit.io adresine yazarsanız aynı gün dönüş yapıyoruz.',
        code: 'backend_unavailable',
      };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const onizleme = onizlemeMi(url);
    const H = basliklar(onizleme);

    if (url.pathname === '/robots.txt') {
      if (onizleme) {
        return new Response(ONIZLEME_ROBOTS, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', ...H },
        });
      }
      // Marka alan adı: sitenin kendi robots.txt'i (anlık görüntüyle birlikte gelir).
      const gercek = new URL('/robots-gercek.txt', url.origin);
      const res = await env.ASSETS.fetch(new Request(gercek, request));
      const govde = res.ok ? await res.text() : 'User-Agent: *\nAllow: /\n';
      return new Response(govde, { headers: { 'Content-Type': 'text/plain; charset=utf-8', ...H } });
    }

    // Vercel Analytics betiği bu barındırmada yok; 404 gürültüsü yerine sessiz 204.
    if (url.pathname.startsWith('/_vercel/')) {
      return new Response(null, { status: 204, headers: H });
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify(apiMesaji(onizleme)), {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...H },
      });
    }

    // Next istemci gezinmesinin RSC yükü statik kopyada yok; hızlı 404 tam sayfa gezinmeye düşürür.
    if (url.searchParams.has('_rsc')) {
      return new Response(null, { status: 404, headers: H });
    }

    const res = await env.ASSETS.fetch(request);
    const h = new Headers(res.headers);
    for (const [k, v] of Object.entries(H)) h.set(k, v);
    if (!onizleme) h.delete('X-Robots-Tag'); // _headers dosyasından gelen noindex'i marka alan adında kaldır
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
  },
};
