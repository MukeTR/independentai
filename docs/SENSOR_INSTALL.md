# AI Discovery Sensor — kurulum rehberi

Bu belge `/sensor/v1.js` tarayıcı SDK'sının ve sunucu/edge crawler kanalının tüm kurulum
yöntemlerini anlatır. Tek bir `<script>` etiketi her platformda çalışır; kalan bölümler o etiketi
ilgili araca nasıl ekleyeceğinizi gösterir.

- **Kaynak:** `apps/web/sdk/sensor.ts`
- **Servis edilen dosya:** `https://independentai.space/sensor/v1.js`
- **Sürüm:** `1.0.0` (olayla birlikte `sv` alanında gönderilir)
- **Boyut:** 4.593 B ham, **2.215 B gzip** (bütçe: 5 KB gzip — aşılırsa derleme hata verir)
- **Bağımlılık:** yok. Çerez yok, `localStorage` yok, parmak izi yok, session replay yok.

---

## 0. Önce: anahtarları alın

Panelde **AI Discovery → Site ekle** ile alan adınızı ekleyin. İki anahtar üretilir:

| Anahtar              | Önek     | Nerede kullanılır                                    | Gizli mi?                                                |
| -------------------- | -------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Public site anahtarı | `iais_…` | Tarayıcı SDK'sı (`data-site`), sunucu ingest başlığı | **Hayır** — HTML kaynağında görünür, yalnızca olay YAZAR |
| Ingest sırrı         | `iaix_…` | Sunucu/edge telemetrisinin HMAC imzası               | **Evet** — yalnızca bir kez gösterilir                   |

Public anahtar okuma/yönetim yetkisi vermez ve yalnızca **kayıtlı origin**'lerden gelen olayları
kabul eder (allowlist; joker yok). Anahtar sızarsa panelden döndürün (rotate).

---

## 1. Universal HTML snippet (her site)

`</head>` etiketinden hemen önce:

```html
<script async src="https://independentai.space/sensor/v1.js" data-site="iais_ANAHTARINIZ"></script>
```

Bu kadar. Script yüklenir yüklenmez ilk `page_view` gider; SPA gezinmeleri de otomatik ölçülür.

### Script etiketi seçenekleri

| Öznitelik          | Zorunlu  | Anlamı                                                                                                                   |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `data-site`        | **evet** | Public site anahtarı. Yoksa sensör hiç açılmaz (hata da vermez).                                                         |
| `data-endpoint`    | hayır    | Collector kökü. Varsayılan: script'in kendi origin'i. Kendi kurulumunuz varsa `data-endpoint="https://olcum.ornek.com"`. |
| `data-respect-dnt` | hayır    | `"1"` verilirse DNT/GPC sinyali olan ziyaretçilerde ölçüm **tamamen** kapanır (bkz. §11).                                |

### Script yüklenmeden önce olay göndermek

`async` script henüz yüklenmemişken olay tetiklemeniz gerekiyorsa küçük bir kuyruk kurun:

```html
<script>
  window.independentAI = window.independentAI || { q: [] };
  window.independentAI.track =
    window.independentAI.track ||
    function () {
      window.independentAI.q.push(Array.prototype.slice.call(arguments));
    };
</script>
<script async src="https://independentai.space/sensor/v1.js" data-site="iais_ANAHTARINIZ"></script>
```

SDK yüklendiğinde kuyruk otomatik boşaltılır. Yüklendikten sonra `q.push([...])` çağrıları da
anında işlenir.

---

## 2. Programatik API

```js
// Bilinen olay tipi → doğrudan o tip olarak gider
window.independentAI.track('demo_request');

// Bilinmeyen ad → `custom` olay + `n` alanı
window.independentAI.track('newsletter_signup');

// Yalnızca şu 5 alan kabul edilir; diğerleri sessizce ATILIR
window.independentAI.track('purchase', {
  entityType: 'plan', // en fazla 40 karakter
  entityId: 'pro-yillik', // en fazla 120 karakter
  entityLabel: 'Pro yıllık', // en fazla 120 karakter
  value: 1490, // negatif olmayan sayı
  currency: 'TRY', // 3 harfli ISO kodu
});
```

Bilinen olay tipleri: `page_view`, `content_view`, `cta_click`, `form_start`, `form_submit`,
`sign_up`, `demo_request`, `phone_click`, `booking`, `application`, `subscribe`, `product_view`,
`add_to_cart`, `purchase`, `custom`.

> `entityLabel` gibi alanlara **e-posta, telefon, sipariş adı, kullanıcı adı yazmayın.** Sunucu
> yine de PII temizliği uygular ama en iyi koruma göndermemektir.

---

## 3. Kodsuz olay: `data-iai-event`

Geliştirici olmadan dönüşüm ölçmek için işaretlemeniz yeterli:

```html
<a href="/demo" data-iai-event="demo_request">Demo isteyin</a>

<button
  data-iai-event="add_to_cart"
  data-iai-entity-type="product"
  data-iai-entity-id="SKU-123"
  data-iai-entity-label="Mavi tişört"
>
  Sepete ekle
</button>
```

- Tıklama yakalama (capture) aşamasında, tek bir delege dinleyiciyle yakalanır — kaç buton
  olduğu fark etmez.
- Olay `custom` tipiyle ve `n = data-iai-event` değeriyle gider. Panelde hedefi
  **`data-iai-event` eşleşmesi** ya da **olay adı** yöntemiyle tanımlayabilirsiniz.
- Elemanın **metni ve DOM'u gönderilmez.** Yalnızca yukarıdaki `data-iai-*` öznitelikleri okunur.

---

## 4. Google Tag Manager

1. GTM → **Etiketler → Yeni → Özel HTML**.
2. İçerik:
   ```html
   <script async src="https://independentai.space/sensor/v1.js" data-site="iais_ANAHTARINIZ"></script>
   ```
3. **Gelişmiş ayarlar → Etiket başına bir kez** seçeneğini işaretleyin (`Once per page`).
4. Tetikleyici: **Initialization - All Pages** (mümkünse) veya **All Pages**.
5. `document.write` kullanmayın; `async` etiket GTM içinde sorunsuz çalışır.

**SPA + GTM:** SDK `history.pushState`/`replaceState` sarmaladığı için GTM'e ayrı bir
"History Change" tetikleyicisi eklemenize gerek YOKTUR. GTM'den de olay göndermek isterseniz:

```html
<script>
  if (window.independentAI) window.independentAI.track('demo_request');
</script>
```

---

## 5. WordPress

İki seçenek:

**A) Eklenti (önerilir)** — `integrations/wordpress/independentai-sensor.php`

1. Dosyayı `wp-content/plugins/independentai-sensor/independentai-sensor.php` olarak yükleyin
   (ya da tek dosyayı doğrudan `wp-content/plugins/` içine koyun).
2. **Eklentiler** ekranından etkinleştirin.
3. **Ayarlar → Independent AI** sayfasına `iais_…` anahtarını yapıştırın.
4. Seçenekler: _DNT/GPC sinyalinde ölçümü kapat_, _giriş yapmış kullanıcıları ölçme_.

Eklenti yalnızca `wp_head` içine script etiketi basar; hiçbir veri WordPress üzerinden geçmez.

**B) Tema / snippet eklentisi** — `functions.php` (child theme) veya "Code Snippets" eklentisi:

```php
add_action( 'wp_head', function () {
	wp_print_script_tag( array(
		'src'       => 'https://independentai.space/sensor/v1.js',
		'async'     => true,
		'data-site' => 'iais_ANAHTARINIZ',
	) );
}, 5 );
```

---

## 6. Next.js / React

`app/layout.tsx` (App Router):

```tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Script
          src="https://independentai.space/sensor/v1.js"
          data-site={process.env.NEXT_PUBLIC_IAI_SITE_KEY}
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
```

Pages Router'da aynı `<Script>` bileşenini `pages/_app.tsx` içine koyun.

**Not:** SDK `document.currentScript` yoksa `script[data-site]` seçicisine düşer; `next/script`
etiketi enjekte ettiği için ikisi de çalışır.

**CSP kullanıyorsanız** (Next.js nonce'lu CSP dâhil) §10'a bakın.

Vanilla React (Vite/CRA) için `index.html` içindeki universal snippet yeterlidir.

---

## 7. Nuxt / Vue

`nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  app: {
    head: {
      script: [
        {
          src: 'https://independentai.space/sensor/v1.js',
          async: true,
          'data-site': process.env.NUXT_PUBLIC_IAI_SITE_KEY,
        },
      ],
    },
  },
});
```

Vue 3 + Vite (Nuxt'suz): `index.html` içine universal snippet. Vue Router `history` modunu
kullandığı için SPA gezinmeleri otomatik ölçülür; ek bir router hook'u gerekmez.

---

## 8. Webflow / Framer / Wix / Squarespace

Hepsinde aynı snippet, farklı alanda:

| Platform        | Nereye                                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Webflow**     | Project Settings → **Custom Code** → _Head Code_ → Kaydet → **Publish** (yayınlamadan görünmez) |
| **Framer**      | Site Settings → **General → Custom Code** → _Start of `<head>` tag_ → Publish                   |
| **Wix**         | Settings → **Custom Code** → _Add Custom Code_ → Kod → "Head" + "All pages" + "Load once"       |
| **Squarespace** | Settings → **Advanced → Code Injection** → _Header_ (Business plan ve üzeri gerekir)            |
| **Shopify**     | Online Store → Themes → **Edit code** → `layout/theme.liquid` → `</head>` öncesi                |

```html
<script async src="https://independentai.space/sensor/v1.js" data-site="iais_ANAHTARINIZ"></script>
```

> Wix ve Squarespace editör önizlemesinde script çalışmayabilir; **yayınlanmış** siteyi test edin.

---

## 9. Sunucu / edge kanalı — AI crawler ölçümü

**Neden ayrı bir kanal var:** GPTBot, ClaudeBot, PerplexityBot gibi crawler'lar JavaScript
çalıştırmaz. Tarayıcı SDK'sı onları **göremez**. Crawler ölçümü için isteği sunucu/edge
katmanında görmek gerekir.

Uç: `POST /api/collect/v1/server`

| Başlık            | Değer                                                     |
| ----------------- | --------------------------------------------------------- |
| `X-IAI-Key`       | Public site anahtarı (`iais_…`)                           |
| `X-IAI-Timestamp` | ms epoch, ±5 dakika                                       |
| `X-IAI-Signature` | `hex HMAC-SHA256(ingest secret, "<timestamp>.<rawBody>")` |

Gövde: `{ "hits": [ { id, ua, path, status?, ct?, ts?, src?, verified?, ip? } ] }` (en fazla 200 kayıt).

### 9.1 Cloudflare Worker

`integrations/cloudflare-worker/` klasöründeki `worker.js` + `wrangler.toml` dosyalarını kullanın;
adım adım kurulum `integrations/cloudflare-worker/README.md` içinde. Özet:

```bash
npx wrangler secret put IAI_INGEST_SECRET   # iaix_…
npx wrangler deploy
```

Cloudflare `verifiedBotCategory` / `botManagement.verifiedBot` sinyali varsa kayıt `verified: true`
gider ve panelde **VERIFIED** görünür; yoksa **UNVERIFIED** (yalnızca user-agent eşleşmesi kanıt
değildir). Ham IP gönderimi `IAI_SEND_IP = "1"` ile açılır, varsayılan kapalıdır.

### 9.2 Next.js / Vercel middleware

`integrations/nextjs-middleware/ai-sensor.ts` dosyasını projenize kopyalayın:

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import { withAiSensor } from './lib/ai-sensor';

export const middleware = withAiSensor(() => NextResponse.next(), {
  key: process.env.IAI_SITE_KEY!,
  secret: process.env.IAI_INGEST_SECRET!,
  // sendIp: true,  // ters DNS doğrulaması istiyorsanız
});

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
```

Mevcut bir middleware'iniz varsa onu sarın: `withAiSensor(mevcutMiddleware, { … })`.
Gönderim `waitUntil` ile yanıt sonrasına ertelenir; sensör hata alırsa istek aynen devam eder.

> Middleware origin'in **nihai** HTTP durumunu göremez; bu yüzden `status` yalnızca middleware'in
> kendi ürettiği 3xx/4xx yanıtlarda gönderilir. Her isteği "200" saymak yanlış olurdu.

### 9.3 Genel imzalı ingest (nginx, Apache, Express, log aktarımı…)

**Node.js ile imzalama:**

```js
import { createHmac, randomUUID } from 'node:crypto';

const ENDPOINT = 'https://independentai.space';
const SITE_KEY = process.env.IAI_SITE_KEY; // iais_…
const SECRET = process.env.IAI_INGEST_SECRET; // iaix_…

export async function sendHits(hits) {
  const rawBody = JSON.stringify({ hits });
  const timestamp = String(Date.now());
  const signature = createHmac('sha256', SECRET).update(`${timestamp}.${rawBody}`).digest('hex');

  const res = await fetch(`${ENDPOINT}/api/collect/v1/server`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-IAI-Key': SITE_KEY,
      'X-IAI-Timestamp': timestamp,
      'X-IAI-Signature': signature,
    },
    body: rawBody, // İMZALANAN GÖVDE İLE BİREBİR AYNI STRING olmalı
  });
  return res.status; // 202 = kabul edildi
}

await sendHits([
  {
    id: randomUUID(),
    ua: 'GPTBot/1.0 (+https://openai.com/gptbot)',
    path: '/fiyatlandirma',
    status: 200,
    src: 'server',
  },
]);
```

**Bash + curl + openssl ile imzalama** (kopyala-çalıştır):

```bash
#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="https://independentai.space"
SITE_KEY="iais_ANAHTARINIZ"
SECRET="iaix_SIRRINIZ"

BODY='{"hits":[{"id":"demo-1","ua":"GPTBot/1.0","path":"/fiyatlandirma","status":200,"src":"server"}]}'
TS="$(( $(date +%s) * 1000 ))"

SIG="$(printf '%s' "${TS}.${BODY}" | openssl dgst -sha256 -hmac "$SECRET" -r | cut -d' ' -f1)"

curl -sS -X POST "$ENDPOINT/api/collect/v1/server" \
  -H 'Content-Type: application/json' \
  -H "X-IAI-Key: $SITE_KEY" \
  -H "X-IAI-Timestamp: $TS" \
  -H "X-IAI-Signature: $SIG" \
  --data-raw "$BODY"
# → {"ok":true,"received":1}
```

İmza doğrulaması için üç kural:

1. İmzalanan metin `"<timestamp>.<rawBody>"`'dir — noktayı unutmayın.
2. `rawBody`, gönderilen gövdeyle **birebir aynı** string olmalıdır (yeniden serialize etmeyin).
3. `X-IAI-Timestamp` ±5 dakika içinde olmalıdır; dışında kalan istekler `stale_timestamp` ile reddedilir.

Yanıt kodları: `202` kabul, `401` imza/anahtar hatası, `403` iptal/duraklatılmış site veya sır
üretilmemiş, `413` gövde çok büyük, `429` hız sınırı.

---

## 10. Content Security Policy (CSP)

Müşterinin sitesinde CSP varsa iki yönerge gerekir:

```
Content-Security-Policy:
  script-src  'self' https://independentai.space;
  connect-src 'self' https://independentai.space;
```

- `script-src` → `/sensor/v1.js` yüklenebilsin diye.
- `connect-src` → `sendBeacon` ve `fetch` ile `/api/collect/v1/*` çağrılabilsin diye.
  **Bu satır unutulursa script yüklenir ama hiçbir olay gitmez** — panelde "tarayıcı olayı yok"
  uyarısı görürsünüz.
- `'strict-dynamic'` kullanan sıkı CSP'lerde script'i nonce ile ekleyin:
  `<script nonce="…" async src="…/sensor/v1.js" data-site="iais_…"></script>`.
- SDK inline script çalıştırmaz, `eval` kullanmaz; `unsafe-inline`/`unsafe-eval` GEREKMEZ.

`/sensor/v1.js` yanıtı `X-Content-Type-Options: nosniff` ve
`Cache-Control: public, max-age=300, stale-while-revalidate=86400` ile döner (ETag destekli).

---

## 11. DNT / GPC davranışı

| Durum                                     | Varsayılan (`data-respect-dnt` yok) | `data-respect-dnt="1"`    |
| ----------------------------------------- | ----------------------------------- | ------------------------- |
| `navigator.doNotTrack === '1'`            | Temel ölçüm **devam eder**          | Ölçüm **tamamen kapanır** |
| `navigator.globalPrivacyControl === true` | Temel ölçüm **devam eder**          | Ölçüm **tamamen kapanır** |

**Varsayılanın gerekçesi (açıkça):** sensör çerezsizdir, kalıcı kimlik üretmez, parmak izi almaz,
kişisel veri toplamaz ve reklam amaçlı profil oluşturmaz — bu yüzden varsayılan davranış, sayfa
sayacı düzeyinde temel ölçüme devam etmektir. Yargı bölgeniz (ör. CCPA/CPRA kapsamındaki "opt-out
of sale/share" sinyali) GPC'ye uyulmasını zorunlu kılıyorsa ya da politikanız bunu gerektiriyorsa
`data-respect-dnt="1"` ekleyin; bu durumda sinyal veren ziyaretçilerde **hiçbir istek gönderilmez**.

Karar sizindir ve tek satırla değişir:

```html
<script async src="https://independentai.space/sensor/v1.js" data-site="iais_ANAHTARINIZ" data-respect-dnt="1"></script>
```

---

## 12. Toplanan / toplanmayan veri

**Toplanır**

| Alan                              | Örnek                                      | Not                                        |
| --------------------------------- | ------------------------------------------ | ------------------------------------------ |
| Anonim oturum anahtarı (`sid`)    | 32 haneli rastgele hex                     | `sessionStorage`, 12 saat TTL, çerez değil |
| Olay kimliği (`id`)               | rastgele hex                               | Yalnızca tekrar teslimleri elemek için     |
| Yol (`p`)                         | `/fiyatlandirma`                           | **Yalnızca pathname**                      |
| Referrer host'u (`r`)             | `chatgpt.com`                              | **Yalnızca hostname** — tam URL değil      |
| UTM (`u`)                         | `utm_source`, `utm_medium`, `utm_campaign` | Allowlist; temizlenmiş                     |
| Olay tipi (`t`) / özel ad (`n`)   | `page_view`, `demo_request`                |                                            |
| Varlık alanları (`et`,`ei`,`el`)  | `product` / `SKU-123` / `Mavi tişört`      | Yalnızca siz gönderirseniz                 |
| Değer / para birimi (`v`,`c`)     | `1490`, `TRY`                              | Yalnızca siz gönderirseniz                 |
| Zaman (`ts`) ve SDK sürümü (`sv`) |                                            |                                            |

**Toplanmaz**

- Çerez (yazılmaz, okunmaz) · `localStorage` · kalıcı kullanıcı kimliği veya profil
- Parmak izi: canvas, audio, WebGL, ekran/font/donanım envanteri
- Query string, hash, tam referrer URL'i
- DOM/form metni, input değerleri, tıklanan elemanın yazısı
- Session replay, fare/klavye/scroll kaydı
- Ham IP adresi (tarayıcı kanalında hiç gönderilmez; sunucu kanalında yalnızca opsiyonel doğrulama
  için, **saklanmadan**)
- E-posta, telefon, ad-soyad, ödeme bilgisi

Sunucu tarafında ayrıca bir PII temizliği daha çalışır (e-posta/telefon/uzun token desenleri yol ve
etiketlerden çıkarılır) ve olaylar site başına belirlenen saklama süresi sonunda silinir.

---

## 13. Kurulumu doğrulama

1. **Panel:** AI Discovery → site kartı → **Kurulum sağlığı**.
   - `Tarayıcı: ok` → snippet çalışıyor (kayıtlı origin'den olay geldi, site otomatik doğrulandı).
   - `Sunucu: eksik` → crawler ölçümü için Worker/middleware kurulmamış (§9).
2. **Tarayıcı:** sitenizi açın → DevTools → **Network** → `collect` filtresi.
   `POST /api/collect/v1/event` isteği ve `202` yanıtı görünmeli.
3. **Konsol kontrolü:**
   ```js
   window.independentAI.version; // "1.0.0"
   window.independentAI.track('demo_request');
   ```
4. **Crawler kanalı:**
   ```bash
   curl -A "GPTBot/1.0 (+https://openai.com/gptbot)" https://ornek.com/ -o /dev/null -s
   ```
5. **Alan adı sahipliği** (script henüz yayında değilse) meta etiketiyle de doğrulanabilir:
   ```html
   <meta name="independentai-site-verification" content="PANELDEKI_TOKEN" />
   ```

### Olay gelmiyorsa

| Belirti                                        | Olası neden                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Script 200 dönüyor, olay yok                   | CSP `connect-src` eksik (§10) veya reklam engelleyici                                |
| `403 origin_not_allowed`                       | Site origin'i allowlist'te değil (panelden ekleyin; `www` varyantı otomatik eklidir) |
| `401 invalid_key`                              | Anahtar yanlış kopyalanmış ya da döndürülmüş                                         |
| `429 quota_exceeded`                           | Aylık olay kotası dolmuş                                                             |
| Hiç istek yok, `window.independentAI` tanımsız | `data-site` eksik/hatalı ya da `data-respect-dnt="1"` + DNT sinyali                  |

---

## 14. Sürümleme ve dağıtım

- SDK sürümü `apps/web/sdk/sensor.ts` içindeki `SDK_VERSION` sabitidir ve her olayla `sv` alanında
  gider; panelde bir sitenin hangi sürümü çalıştırdığı görülür (`lastSdkVersion`).
- URL **sabittir** (`/sensor/v1.js`). Kırıcı bir değişiklik gerekirse `/sensor/v2.js` açılır ve v1
  yayında kalır — müşterilerin snippet'i değiştirmesi gerekmez.
- Önbellek 5 dakika taze + 1 gün `stale-while-revalidate`; yeni sürüm en geç 5 dakikada yayılır,
  bu sürede kimse beklemez. `ETag` ile `304` desteklenir.
- Derleme: `pnpm --filter @independentai/web build:sensor` (esbuild, IIFE, minify, es2017).
  `pnpm build` bu adımı **otomatik** çalıştırır. Çıktı `apps/web/src/generated/sensor-v1.js`
  deterministiktir ve depoya commit edilir; gzip 5 KB'ı aşarsa derleme başarısız olur.
- Kendi altyapınızda self-host etmek isterseniz `sensor-v1.js` dosyasını kendi CDN'inize koyup
  `data-endpoint="https://independentai.space"` ile collector'ı işaret edin.
