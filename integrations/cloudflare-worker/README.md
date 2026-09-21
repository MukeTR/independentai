# Cloudflare Worker — AI crawler sensörü

AI crawler'ları JavaScript çalıştırmaz; tarayıcı SDK'sı (`/sensor/v1.js`) onları göremez.
Bu Worker istekleri kenardan görür ve **yalnızca bilinen AI botlarını** imzalı olarak
`POST /api/collect/v1/server` ucuna bildirir. İnsan ziyaretçiler bu kanaldan geçmez.

## Ne gönderilir / gönderilmez

| Gönderilir                                             | Gönderilmez                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| User-agent (yalnızca bot eşleştirmesi için, saklanmaz) | Cookie, Authorization, oturum bilgisi                            |
| Yol (`/fiyatlandirma`) — query string **hariç**        | Query string, hash, istek/yanıt gövdesi                          |
| HTTP durumu, içerik türü, zaman damgası                | İnsan ziyaretçi trafiği                                          |
| Cloudflare doğrulanmış-bot sinyali (`verified`)        | Ham IP — **yalnızca** `IAI_SEND_IP="1"` iken, sunucuda saklanmaz |

## Kurulum

1. **Panelden anahtarları alın**
   - Public site anahtarı: `iais_…` (gizli değildir)
   - Ingest sırrı: `iaix_…` (**yalnızca bir kez gösterilir**, sır olarak saklayın)

2. **Projeyi hazırlayın**

   ```bash
   npm create cloudflare@latest independentai-sensor -- --type hello-world
   cd independentai-sensor
   # bu klasördeki worker.js ve wrangler.toml dosyalarını kopyalayın
   ```

3. **Değişkenleri ayarlayın** (`wrangler.toml` → `[vars]`)

   ```toml
   IAI_SITE_KEY = "iais_..."
   IAI_ENDPOINT = "https://independentai.space"
   IAI_SEND_IP  = "0"   # "1" yaparsanız ters DNS doğrulaması açılır
   ```

4. **Sırrı ekleyin** (asla `wrangler.toml` içine yazmayın)

   ```bash
   npx wrangler secret put IAI_INGEST_SECRET
   # istendiğinde iaix_... değerini yapıştırın
   ```

5. **Rotayı bağlayın ve yayınlayın**

   ```toml
   routes = [{ pattern = "ornek.com/*", zone_name = "ornek.com" }]
   ```

   ```bash
   npx wrangler deploy
   ```

6. **Doğrulayın**
   ```bash
   curl -A "GPTBot/1.0 (+https://openai.com/gptbot)" https://ornek.com/ -o /dev/null -s
   ```
   Panelde **Site sağlığı → Sunucu telemetrisi** birkaç saniye içinde "bağlı" olmalıdır.
   (Tampon dolana ya da 2 saniye geçene kadar gönderim beklemeye alınır.)

## Doğrulama seviyesi

- Cloudflare `verifiedBotCategory` / `botManagement.verifiedBot` sinyali varsa kayıt **VERIFIED**.
- Sinyal yoksa yalnızca user-agent eşleşmesi vardır → kayıt **UNVERIFIED** olarak işaretlenir.
  User-agent taklit edilebilir; panelde bu ayrım açıkça gösterilir.
- `Google-Extended` ve `Applebot-Extended` ziyaret ÜRETMEZ: bunlar robots.txt kontrol
  token'larıdır, ayrı bir crawler değildir. Worker onları kenarda eler.

## Davranış notları

- Worker yanıtı değiştirmez: `fetch(request)` sonucu aynen döner. Telemetri `waitUntil` içinde,
  yanıt gönderildikten sonra çalışır.
- Yapılandırma eksikse (`IAI_SITE_KEY` veya `IAI_INGEST_SECRET` yoksa) Worker sessizce geçirir.
- Toplu gönderim: en fazla 50 kayıt ya da 2 saniye. Tampon 200 kaydı aşarsa en eskiler düşer.
- İmza: `X-IAI-Signature = hex HMAC-SHA256(secret, "<timestamp>.<rawBody>")`,
  `X-IAI-Timestamp` ±5 dakika içinde olmalıdır (replay koruması).

## Ücretlendirme

Her istek Worker'dan geçer; Cloudflare Workers ücretsiz planında 100.000 istek/gün sınırı vardır.
Yalnızca AI botlarında ek bir alt-istek (subrequest) yapılır, insan trafiğinde ek maliyet yoktur.
