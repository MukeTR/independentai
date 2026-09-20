# Vitrin önizlemesi — Cloudflare Workers

Sitenin **backend bağlanmadan** yayımlanan statik bir kopyası.
Canlı adres: https://yanit-onizleme.mkemalkaratas95.workers.dev

## Ne işe yarar

Siteyi göstermek için. Ölçüm, form gönderimi, oturum ve panel YOKTUR; bunlar sunucu
tarafı gerektirir. `/api/*` istekleri Worker tarafından 503 + Türkçe açıklamayla
karşılanır, böylece arayüz çirkin bir çökme yerine net bir cümle gösterir.

Bu kopya arama motorlarına kapalıdır: `robots.txt` her şeyi yasaklar ve tüm yanıtlarda
`X-Robots-Tag: noindex, nofollow` döner. Amaç yanit.io ile arama sonuçlarında yarışmamak.

## Nasıl güncellenir

```bash
cd apps/web
YANIT_STATIC_SNAPSHOT=1 NEXT_PUBLIC_SITE_URL="https://yanit.io" pnpm exec next build
YANIT_STATIC_SNAPSHOT=1 NEXT_PUBLIC_SITE_URL="https://yanit.io" pnpm exec next start -p 3311 &

cd ../../scripts/onizleme
rm -rf dist && BASE=http://localhost:3311 OUT=./dist node crawl.mjs
npx wrangler deploy
```

`YANIT_STATIC_SNAPSHOT=1` yalnızca `next/image` iyileştiricisini kapatır (statik
kopyada sunucu tarafı iyileştirici yok). Normal Vercel derlemesi bu bayraktan etkilenmez.

## Sınırlar

- Veri sayfaları derleme anındaki anlık görüntüyü gösterir; kendiliğinden tazelenmez.
- Next istemci gezinmesinin RSC yükü statik kopyada yok. Worker `?_rsc=` isteklerine
  hızlı 404 döner, Next de tam sayfa gezinmeye düşer. Gezinme çalışır, biraz daha yavaştır.
- `dist/` sürüm kontrolüne girmez; her seferinde yeniden üretilir.
