# AI Discovery — ölçüm modeli, attribution ve gizlilik

Bu belge **AI Discovery Sensor**'ün ne ölçtüğünü, neyi ölçemediğini ve "ziyaretçi hangi soruyla
geldi?" sorusuna hangi kaynaklardan yanıt verdiğimizi anlatır. Kurulum adımları için
`docs/SENSOR_INSTALL.md`'ye bakın.

Belgenin tek amacı vardır: **hiçbir sayı, olduğundan fazlasını iddia etmesin.**

---

## 1. Ölçüm modeli: üç ayrı kanal

Panelde üç sayı vardır ve **asla toplanmaz**, çünkü üçü farklı şeydir.

| Kanal                | Nereden gelir                         | Ne anlama gelir                                     | Ne anlama GELMEZ          |
| -------------------- | ------------------------------------- | --------------------------------------------------- | ------------------------- |
| `aiReferralSessions` | Tarayıcı SDK'sı (`/api/collect/v1/*`) | Bir AI ürününden gelen **gerçek insan** ziyareti    | Benzersiz kişi sayısı     |
| `crawlerHits`        | Sunucu / edge telemetrisi (HMAC)      | AI crawler/fetcher'ının **HTTP isteği**             | Ziyaret, öneri veya satış |
| `syntheticRuns`      | Independent AI'ın kendi ölçümü        | Bizim çalıştırdığımız görünürlük testi (`ModelRun`) | Ziyaretçi davranışı       |

### Neden iki farklı toplama yolu var?

- **Tarayıcı (browser SDK)** — JavaScript çalıştıran gerçek insanları görür. Referrer, yol, olay ve
  hedef bilgisi buradan gelir. Crawler'ları **göremez**: botların çoğu JavaScript çalıştırmaz.
- **Sunucu / edge** — Her HTTP isteğini görür, dolayısıyla AI crawler'larını yakalayabilir. İnsan
  ziyaretinin niyetini (hedefe ulaştı mı, hangi içeriği gezdi) göremez.

İkisi birlikte kurulmadıkça panelde eksik kalan kısım açıkça "bağlı değil" olarak gösterilir
(`SiteHealth.server === 'missing'`).

### Sınıflandırma kuralları

- Referrer **tam hostname** eşleşmesiyle sınıflandırılır. "openai" geçen her host AI sayılmaz.
- Referrer yoksa trafik `DIRECT`'tir; **AI olduğu tahmin edilmez.** Yalnızca tanınan bir
  `utm_source` (ör. `chatgpt`) varsa ve referrer yoksa AI kabul edilir.
- Arama motorları `ORGANIC`'tir, AI referral değildir (Gemini/Copilot gibi AI ürünleri ayrıdır).
- `Google-Extended` ve `Applebot-Extended` **ayrı crawler değildir**; robots kontrol token'ıdır ve
  hiçbir ziyaret/istek üretmez.
- Yalnızca user-agent eşleşmesi "doğrulanmış" saymaz; doğrulama ters DNS / IP aralığı / edge
  imzasıyla yapılır.

---

## 2. Attribution: "ziyaretçi hangi soruyla geldi?"

**Temel gerçek:** ChatGPT, Claude, Gemini, Perplexity ve benzerleri kullanıcının yazdığı promptu
hedef siteye **göndermez**. Referrer başlığı yalnızca "bu ziyaret şu AI ürününden geldi" der. Bu
yüzden promptu bildiğimizi iddia etmeyiz; üç kaynağı hem veritabanında (`PromptAttribution.source`)
hem de arayüzde **kesin ayrı** tutarız.

| Kaynak          | Nasıl üretilir                                  | Güven        | Kayıt yazılır mı  |
| --------------- | ----------------------------------------------- | ------------ | ----------------- |
| `USER_REPORTED` | Ziyaretçi gönüllü mini formla kendisi bildirdi  | 100          | Evet              |
| `INFERRED`      | Deterministik, açıklanabilir puanlama (LLM yok) | 55–95        | Yalnızca ≥ 55     |
| `SYNTHETIC`     | Kendi `ModelRun` ölçümlerimizin özeti           | görünürlük % | **Hayır** (okuma) |

### 2.1 Güven tablosu (INFERRED)

Puanlama tamamen kural tabanlıdır: aynı girdi her zaman aynı çıktıyı verir, hiçbir dil modeli
çağrılmaz ve her sinyalin katkısı `evidence` alanında saklanıp arayüzde "Neden böyle düşünüyoruz?"
başlığı altında gösterilir.

| Sinyal                                                                                       | Katkı           |
| -------------------------------------------------------------------------------------------- | --------------- |
| AI cevabındaki atıf URL'si (`Citation` / `ModelRun.citations`) oturumun indiği sayfayla aynı | **+45**         |
| Prompt kelimeleri ↔ landing path / varlık etiketi örtüşmesi (kelime başına +8)               | **+25'e kadar** |
| Oturumun tamamladığı hedef türü ↔ prompt niyeti uyumu                                        | **+15**         |
| Ziyaretin geldiği AI sağlayıcıda promptun son ölçümde markayı göstermesi                     | **+10**         |
| Yalnızca referrer bilgisi                                                                    | **+0**          |

Eşik: **`MIN_CONFIDENCE = 55`**. Altındaki hiçbir tahmin **kaydedilmez** ve gösterilmez.

Bu sayılar rastgele değildir, iki koruma sağlar:

1. **Yumuşak sinyaller tek başına yeterli değildir.** Atıf eşleşmesi olmadan ulaşılabilecek en
   yüksek puan `25 + 15 + 10 = 50`'dir → eşiğin altında. Yani "kelimeler benziyordu" gerekçesiyle
   asla tahmin üretilmez.
2. **Atıf eşleşmesi de tek başına yeterli değildir** (45 < 55): en az bir destekleyici sinyal
   gerekir.

Ek kurallar:

- Oturum `AI_REFERRAL` değilse (direct/organic/other) **hiç tahmin üretilmez**.
- Aday havuzu tenant'ın en fazla 200 aktif `Prompt` kaydıdır.
- Eşit puanda `promptId` sırasına göre karar verilir → çıktı çalıştırmalar arasında değişmez.
- İkinci en iyi aday `evidence.runnerUp` içinde gösterilir; tek adaya kilitlenmediğimiz görülebilir.
- Tekrar çalıştırma idempotenttir: aynı (oturum, `INFERRED`) için **tek kayıt** tutulur; puan eşiğin
  altına düşerse eski kayıt **silinir**.
- Sağlayıcı görünürlüğü yalnızca ölçtüğümüz sağlayıcılar için sayılır (OpenAI / Anthropic / Google).
  Perplexity'den gelen bir ziyarette bu sinyal 0'dır.

### 2.2 Niyet kümesi

`recommendation` · `comparison` · `pricing` · `alternative` · `how_to` · `local` · `other`

Niyet iki yoldan gelir: ziyaretçinin form seçimi (normalize edilir; tanınmayan değer `other` olur)
veya prompt metninden sabit sıralı desen eşleştirme (fiyat → karşılaştırma → alternatif → nasıl →
yerel → öneri). Karşılaştırma Türkçe eklere ve aksana dayanıklıdır ("fiyatı", "kliniği" vb.).

### 2.3 SYNTHETIC neden ayrı?

`SYNTHETIC` satırları bizim kendi sorularımızı AI modellerinde çalıştırıp ölçtüğümüz sonuçlardır.
Gerçek bir ziyaretçinin sorduğu soru **değildir**, veritabanına attribution kaydı olarak
**yazılmaz** ve arayüzde ayrı bir blokta, ayrı renkle, açık uyarısıyla gösterilir.

---

## 3. Ziyaretçi mini formu ve `window.independentAI.report()`

Gerçek promptu öğrenmenin tek dürüst yolu ziyaretçiye sormaktır. Form **gönüllüdür**, hiçbir alanı
zorunlu değildir ve **yalnızca site sahibi SDK ile çağırdığında görünür** — Independent AI kendi
başına müşteri sitesine form basmaz. (`TrackedSite` üzerinde bugün ayrı bir "form açık/kapalı"
alanı yoktur; kontrol tamamen çağıran taraftadır.)

### Sözleşme

```js
window.independentAI.report({
  provider: 'openai', // opsiyonel: 'openai' | 'anthropic' | 'google' | 'perplexity' | 'microsoft' | 'xai' | 'mistral' | 'deepseek' | 'meta' | 'you' | 'poe'
  intent: 'comparison', // opsiyonel: recommendation | comparison | pricing | alternative | how_to | local | other
  text: 'Şunu sormuştum…', // opsiyonel: en fazla 300 karakter, sunucuda PII temizlenir
});
// → Promise<{ ok: true }> (yanıt her zaman 202; ziyaretçiye hata gösterilmez)
```

SDK bu çağrıyı şu isteğe çevirir:

```
POST /api/collect/v1/report
Content-Type: text/plain;charset=UTF-8      ← preflight tetiklememek için
Origin: https://ornek.com                   ← tarayıcı ekler; allowlist'te olmalı

{"k":"iais_…","sid":"<oturum anahtarı>","provider":"openai","intent":"comparison","text":"…"}
```

| Alan       | Zorunlu | Kural                                                               |
| ---------- | ------- | ------------------------------------------------------------------- |
| `k`        | ✔       | Sitenin public write key'i (`iais_…`). Yalnızca yazar, okumaz.      |
| `sid`      | ✔       | 8–64 karakter anonim oturum anahtarı (SDK'nın ürettiği değer)       |
| `provider` | ✖       | Tanınmayan değer `null` olur; boşsa oturumun sağlayıcısı kullanılır |
| `intent`   | ✖       | Normalize edilir; tanınmayan değer `other`                          |
| `text`     | ✖       | PII temizlenir, 300 karaktere kırpılır                              |

Yanıtlar: `202` kabul · `400` geçersiz gövde/oturum anahtarı · `401` geçersiz anahtar ·
`403` kayıtlı olmayan origin / duraklatılmış / iptal · `413` gövde > 2 KB · `429` hız sınırı.

Sınırlar: **IP başına saatte 5**, **site başına saatte 100** bildirim; gövde en fazla **2 KB**;
aynı oturumdan en fazla **5** bildirim.

Oturum anahtarı eşleşmezse (oturum penceresi kapanmışsa) kayıt yine yazılır, yalnızca
`sessionId: null` olur — veri atmak yerine "oturuma bağlanamadı" bilgisiyle saklanır.

### Arayüz bileşenleri

- `PromptReportWidget` (`components/discovery/prompt-report-widget.tsx`) — gönüllü mini form.
  Kapatılabilir, `sessionStorage` ile oturum başına bir kez gösterilir, PII uyarısı içerir.
- `PromptAttributionPanel` (`components/discovery/prompt-attribution-panel.tsx`) — üç kaynağı ayrı
  bloklarda gösterir; her satırda güven yüzdesi ve kanıt listesi bulunur; düşük güvende satır yerine
  **neden gösterilmediğini açıklayan** boş durum metni çıkar.

---

## 4. Görünürlük boşluğu × gerçek trafik

`prioritizeGapsWithTraffic(tenantId, { siteId, days })` mevcut görünürlük boşluklarını
(**rakip görünür + marka görünmez**) gerçek ziyaret sinyaliyle sıralar. `getVisibilityGaps`
mantığına dokunulmaz; bu fonksiyon onun çıktısını zenginleştirir.

```
gapBase       = 40 + min(30, rakip sayısı × 6) + min(30, eksik sağlayıcı × 10)   → 40..100
trafikÇarpanı = 0,6 + 0,4 × (bu konuyla örtüşen ziyaret ilgisi / en yüksek ilgi)
hedefÇarpanı  = 0,8 + 0,2 × (örtüşen hedeflerin stratejik değeri / en yüksek değer)
priority      = gapBase × trafikÇarpanı × hedefÇarpanı
```

- "Örtüşme", promptun anlamlı kelimeleri ile landing path ve varlık etiketleri arasında yapılır
  (aksana ve Türkçe ekine dayanıklı; attribution ile **aynı** kural).
- Trafik ölçülmemişse boşluk yine listelenir, yalnızca sıralamada geri düşer. Ölçüm yokluğu
  "fırsat yok" demek değildir.
- **E-ticaret dışı sitelerde ciro/sepet dili kullanılmaz.** Değer, tamamlanan hedefin türüyle
  ifade edilir: potansiyel müşteri, demo talebi, başvuru, randevu, abonelik, kayıt, iletişim.
  Parasal ifade yalnızca kapsamdaki tüm siteler `ecommerce` türündeyse ve gerçek bir değer
  kaydedilmişse eklenir.
- Her satır `rationale` alanında sayıların nereden geldiğini düz Türkçe anlatır.

Hedef stratejik ağırlıkları: `PURCHASE` 100 · `DEMO` 90 · `LEAD` 85 · `APPLICATION` 80 ·
`BOOKING` 80 · `SIGN_UP` 70 · `SUBSCRIBE` 60 · `CONTACT` 55 · `CUSTOM` 40.

---

## 5. Gizlilik

### Toplanan veriler

- Normalize edilmiş **yol** (`/urunler/yedekleme`) — query string ve hash **atılır**.
- Referrer'ın yalnızca **host** kısmı (`chatgpt.com`), tam URL değil.
- Olay tipi, opsiyonel varlık (tip / id / etiket) ve hedef eşleşmesi.
- Anonim, kısa ömürlü **oturum anahtarı** (siteye özel, istemcinin ürettiği rastgele değer).
- Ziyaretçinin gönüllü bildirdiği metin (yalnızca `USER_REPORTED`).

### Toplanmayan veriler

- **Çerez yok.** Oturum anahtarı çerez değildir; kişiler arası ve siteler arası takip yapılmaz.
- **Ham IP saklanmaz.** IP yalnızca hız sınırı anahtarında, kalıcı olmayan biçimde kullanılır.
- Form içerikleri, DOM metni, tuş vuruşları, e-posta/telefon, kullanıcı kimliği, tam URL, query
  string, hash, oturum kaydı (session replay) — **hiçbiri toplanmaz**.

### PII temizliği

Her serbest metin ve her yol/etiket sunucuda `redactPii()` süzgecinden geçer: e-posta → `[email]`,
telefon → `[phone]`, JWT/uzun token → `[token]`. Bildirim metni ayrıca kontrol karakterlerinden ve
`<`/`>` işaretlerinden arındırılır ve 300 karaktere kırpılır. Temizlik istemciye bırakılmaz; sunucu
tarafında **tek** noktada yapılır.

### Saklama (retention)

Ham olaylar ve oturumlar site başına ayarlanan `retentionDays` (varsayılan 90, en az 7, en fazla 365) süresi sonunda silinir; her kayıt kendi `expiresAt` alanını taşır ve bakım işi bunları
temizler. Günlük özetler (`AiTrafficRollup`) kalır. Site silindiğinde tüm telemetri cascade ile
silinir.

### Erişim

Public write key (`iais_…`) yalnızca **yazar**; hiçbir okuma veya yönetim yetkisi vermez ve
veritabanında yalnızca sha256 özeti tutulur. Yönetim uçları oturum + RBAC ile korunur; ajans üyesi
yalnızca atanmış çalışma alanının verisini görür.

---

## 6. API uçları

| Uç                                                  | Yetki               | Not                                        |
| --------------------------------------------------- | ------------------- | ------------------------------------------ |
| `POST /api/collect/v1/report`                       | Public key + origin | Ziyaretçi bildirimi, yanıt 202             |
| `GET /api/discovery/attribution?siteId&days&source` | Oturum (okuma)      | Kaynağa göre gruplanmış liste              |
| `POST /api/discovery/attribution?siteId`            | Oturum (yazma)      | `INFERRED` üretir; tenant başına saatte 10 |

`source` filtresi `USER_REPORTED` · `INFERRED` · `SYNTHETIC` değerlerini alır; verilmezse üç grup da
döner. `SYNTHETIC` grubu veritabanından değil, `ModelRun` kayıtlarından okunarak üretilir.

---

## 7. Sınırlamalar (açıkça söylüyoruz)

1. **Gerçek prompt bilinemez.** AI ürünleri promptu siteye göndermez. `USER_REPORTED` dışındaki her
   şey ya tahmindir (kanıtıyla birlikte) ya da bizim kendi ölçümümüzdür.
2. **Crawler hit'i ziyaret değildir.** Bir botun sayfanızı çekmesi ne bir insan ziyareti, ne bir
   öneri, ne de bir satıştır. İki sayı asla toplanmaz.
3. **Benzersiz kişi iddiası yoktur.** "Oturum", çerezsiz ve kısa ömürlü bir gruplamadır; aynı kişi
   farklı cihaz/tarayıcıda farklı oturum üretir. "Tekil ziyaretçi" sayısı vermiyoruz.
4. **Referrer kaybolabilir.** AI ürünü referrer göndermezse ziyaret `DIRECT` görünür; bunu AI
   saymayız. Bu, AI trafiğinin olduğundan **düşük** görünmesine yol açabilir — tersi değil.
5. **Düşük güvenli tahmin gösterilmez.** %55 altındaki hiçbir tahmin kaydedilmez; boş bir liste,
   uydurulmuş bir kesinlikten iyidir.
6. **Sağlayıcı görünürlüğü yalnızca ölçtüğümüz modeller için bilinir** (OpenAI, Anthropic, Google).
   Diğer sağlayıcılardan gelen ziyaretlerde bu sinyal kullanılamaz.
7. **Reklam engelleyici / CSP** tarayıcı SDK'sını bloklayabilir; bu durumda tarayıcı kanalı boş
   kalır ve panel bunu "script sitede bulunamadı" olarak açıkça söyler.
