# Yanıt — Satış Kiti (TR)

Sürüm: 2026-09-21 (gece programı W6). Sahibi: satış. Bu belge dış paylaşım için değildir; müşteriye giden her
metin `/pricing`, `/arac` ve `/rapor` sayfalarındaki dille aynı olmalıdır. Fiyat ve deneme süresi tek kaynaktan
(`getOffer()`, admin › Sistem) okunur; buradaki rakamlar **varsayılanlardır** ve sabah kararıyla değişebilir.

---

## 1. Tek cümle, üç katman, fiyat çapası

**Tek cümle (her yüzeyde aynı):**

> Müşteriniz satın almadan önce yapay zekâya soruyor: sizi mi öneriyor, rakibinizi mi? Yanıt ölçer, nedenini gösterir,
> takip eder — siz düzeltin ya da Yanıt Agency düzeltsin.

**Üç katman:**

| Katman       | Ne                                                                                                     | Fiyat (varsayılan)                             | Kapı                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------------------- |
| Ücretsiz     | 11 site aracı + 9 sektör sayfası + kalıcı rapor (`/rapor/<token>`, 30 gün)                             | ₺0                                             | Hesap yok, e-posta duvarı yok, yapay zekâ puanlamada yok                   |
| Yanıt (SaaS) | ChatGPT · Claude · Gemini cevaplarında günlük ölçüm, rakipler, SoV, örnek cevap kanıtı, panel araçları | **₺2.490/ay** · KDV hariç · aylık · taahhütsüz | 14 gün deneme, kart yok                                                    |
| Yanıt Agency | Uygulama hizmeti: bulguları biz düzeltiriz (teknik + içerik sprint'i)                                  | **₺30.000/ay'dan**, teklifle                   | İletişim formu; capability **beta** (kodda hizmet akışı yok, sözleşme ile) |

**Fiyat çapası (sorulunca):** "Aylık, KDV hariç, taahhütsüz. Piyasada GEO ajansları aylık 30–60 bin TL istiyor
(Vayes fiyat sayfası; Onur Özden 17/35/60 bin paketleri); biz self-servisi 2.490'a, uygulamayı 30 binden başlatıyoruz."
Kaynaklar: https://www.vayes.com.tr/geo-ajansi , https://www.onurozden.com.tr/hizmet/yapay-zeka-seo/ , https://www.roicool.com/blog/seo-fiyatlari

---

## 2. 60 saniyelik pitch — ekran ekran

Hazır URL şablonları (`<host>` = müşterinin alan adı, `www.` yok; `<slug>` = sektör slug'ı):

| sn    | Söz                                                                                        | Ekran / URL                                                                       |
| ----- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 0–10  | "Ahmet Bey, izninizle sitenizi 20 saniyede tarayayım."                                     | `/arac/seo-karnesi?url=<host>` → hüküm "3 kritik, 4 uyarı, 9 tamam — 41/100"      |
| 10–25 | "Müşterinize attığınız link WhatsApp'ta böyle görünüyor."                                  | `/arac/whatsapp-onizleme?url=<host>` (WhatsApp/LinkedIn/X/Google kartı)           |
| 25–40 | "Sektörünüzde müşteri bu 5 soruyu soruyor; sitenizde 1'ine cevap var."                     | `/sektor/<slug>` ya da `/arac/satin-alma-sorusu-kapsama?url=<host>&sektor=<slug>` |
| 40–50 | "Rakibinizle yan yana: 14 maddenin 9'unda o önde. Bu rapor kalıcı, WhatsApp'tan atıyorum." | `/arac/rakip-kiyas?url=<host>` → `/rapor/<token>` (OG kartı + wa.me)              |
| 50–60 | "İki yol: panelde siz takip edin ya da Yanıt Agency yapsın."                               | `/pricing` → `/contact?src=rapor&site=<host>&token=<token>#form`                  |

Notlar:

- Her sonuç ekranında skorun altındaki satırı gösterin: **"N kontrol · tarih · deterministik tarayıcı · hazırlık ölçer, AI davranışını değil"**.
- Tüm araçlar tek kutudan: `/arac?url=<host>` — adres bir kez yazılır, her kart `?url=` ile açılır.
- `/arac/<slug>#nasil-hesaplanir` → "Skor nasıl hesaplanır?" (eksenler + ağırlıklar).
- Rapor sayfası CTA satırı: "Bunları biz düzeltelim" · "Kendim düzelteceğim" · "Yeniden tara" · "WhatsApp'ta paylaş" · "Bağlantıyı kopyala" · "Skor nasıl hesaplanır?".

---

## 3. Demo akışı

Ayrıntı: `docs/DEMO_AKISI.md`. Özet:

1. **Hazırlık:** mobil veri, sekmeler açık, kendi hesabınızda panel, telefonda WhatsApp.
2. **Tarama → rapor → sektör sorusu → panel** (yukarıdaki tablo).
3. **Kapanış:** formu müşteri doldurur (`/contact?src=demo&site=<host>&token=<token>#form`); KVKK kutusunu siz işaretlemeyin.
4. **Sonrası:** `/admin/leads` → NEW → "Arandı"; 3 gün sonra takip e-postası (§7) yalnız İYS izni varsa ticari içerikli olabilir.
5. **Demo hesabı yok.** Panel örnek verisi için kendi tenant'ınıza `POST /api/admin/seed-demo` (CRON_SECRET) — veriler "temsili" etiketiyle görünür.

---

## 4. İtirazlar (10) ve cevaplar

**4.1 "Bizim gibi firmalarla çalıştınız mı?"**

- Referans varsa: sektör + sonuç + tarih (isim izinle). Yoksa **"temsili senaryo"** deyin; uydurma vaka anlatmayın.
- "Şu an sizin sektörünüzden ilk müşterileri alıyoruz; landing'deki vaka temsilidir, öyle de yazıyor. Bu yüzden sizin sitenizle canlı gösteriyorum, slayt değil."
- Kanıt: canlı tarama + kalıcı rapor. EY araştırmasına göre alıcıların büyük çoğunluğu somut kanıt bekler (bkz. RESEARCH_BRIFING §C.4).

**4.2 "Müşterimiz ChatGPT kullanmıyor."**

- TÜİK 2025: 16–74 yaş bireylerin **%19,2**'si yapay zekâ kullandı; 16–24 yaşta **%39,4**. (TÜİK Yapay Zeka İstatistikleri 2025, 1 Eki 2025.)
- TÜİK 2026: internet kullanım oranı **%92,3**. (Yıl karışıklığı yapmayın: %92,3 = 2026, %19,2 = 2025.)
- Digital 2026 (We Are Social/Meltwater): Türkiye'de yapay zekâ araçlarından gelen web trafiğinde ChatGPT payı %94,49 (O — ikincil kaynak; sayfada kaynak adıyla).
- Söz: "Bugün beşte biri; gençlerde beşte iki. Siz iki yıl sonrasının müşterisini şimdi hazırlıyorsunuz; rakip de öyle."

**4.3 "SEO ajansımız var."**

- "Harika — kavga etmiyoruz, ölçüyoruz. Rakip kıyası ve raporu ajansınıza da atın; Yanıt onların işini görünür kılar."
- Ajans ortaklık programı: `/solutions/agencies#on-analiz` (beta). Ajans, müşteri çalışma alanlarını panelde yönetir.

**4.4 "Garanti var mı?"**

- "Hayır. Yapay zekâ cevapları oturumdan oturuma değişir; garanti veren yanıltıyor. Biz **ölçüyoruz, gösteriyoruz, takip ediyoruz**; her sayının yanında tarih + model + örnek cevap var."
- Yasak: "garanti", "hükmedin", "Türkiye'nin ilk".

**4.5 "Pahalı."**

- Çapa: ajanslar aylık 30–60 bin TL (Vayes), 17/35/60 bin paketleri (Onur Özden), AEO dahil SEO 40–90 bin (Roicool). Kaynak linkleri §1.
- "Self-servis ₺2.490; ilk ay kart yok. Ajans yolunu ancak bulgular çoksa ve ekibiniz yoksa öneririm."
- Yıllıkta tek taviz: **2 ay bedava** (12 ay öde, 14 ay kullan). Başka indirim yok.

**4.6 "Skor gerçek mi?"**

- "Deterministik: aynı sayfa aynı anda iki kez taranırsa aynı sonuç. Kaç kontrol, hangi tarih, hangi ağırlık — hepsi ekranda. Yapay zekâ puanlamada kullanılmıyor."
- Dürüstlük cümlesi: **"Skor sitenizin hazırlığını ölçer, yapay zekâ asistanlarının davranışını değil. Onu panel ölçer."**

**4.7 "Verimiz yurt dışına gidiyor mu?"**

- KVKK cümlesi (her formun altında aynı): **"Yalnızca herkese açık web sitenizi tarıyoruz; kişisel verinizi yapay zekâ servislerine göndermiyoruz."**
- Araçlar: ham IP saklanmaz (pseudonim özet), sonuç 30 gün, alan adı + skor lead kaydı (kişisel veri yok).
- Panel: yalnız marka adı + herkese açık site içeriği modellere gider; ad/telefon/e-posta asla. Barındırma: Supabase (Frankfurt) + Vercel; aydınlatma metninde açık.

**4.8 "Düşünelim."**

- Çoğu zaman kibar "hayır". Takip planı: "3 gün sonra raporu bir kez daha tarayıp **yeni bir bulguyla** geri döneyim mi?" (izin alın).
- Karar verici odada değilse: "Ortağınıza kalıcı raporu iletebilirsiniz; giriş istemez." Rapor bağlantısını WhatsApp'tan gönderin.

**4.9 "Bizim sektörde reklam yasak."** (sağlık, avukat, mali müşavir)

- "Bu reklam değil, **bilgilendirme ve görünürlük ölçümü**. 'En iyi klinik' sıralaması, 'hasta garantisi' gibi ifadeler bizde yok; sektör sayfalarında da yok."
- Sağlık Bakanlığı tanıtım kuralları, Avukatlık Kanunu, 3568 sayılı kanun — uzman incelemesi sabah kararı (spec §10-14).

**4.10 "Kendimiz yaparız."**

- "Tam da bunun için SaaS yolu var: rapor + panel + 'Kendim düzelteceğim' rehberleri. Ajans yolu yalnız isteyene."
- 14 gün denemede kart yok; panel araçları (11 site aracı) tenant limitiyle çalışır, ofis IP limitine takılmaz.

---

## 5. Fiyat konuşma kuralları (C.4)

1. **Sorulmadan söylemeyin.** Önce tarama, rapor, kanıt.
2. Sorulunca: "**Aylık, KDV hariç, taahhütsüz** — ₺2.490. Ajans çapası 30–60 bin."
3. Pazarlık payı: **tek taviz** yıllıkta 2 ay bedava. Yüzde indirim, "ilk 10 müşteri", "bugün geçerli" **yok** — güveni bozar.
4. Yanıt Agency: fiyat söylemeyin, "₺30.000/ay'dan başlar, kapsamı rapora göre teklif ederiz" deyin; teklif iletişim formu → satış.
5. Ödeme altyapısı yok (capability roadmap): abonelik **teklifle/faturayla** başlar; "kartla öde" demeyin.
6. Rakamı her zaman `/pricing`'den okuyun; admin › Sistem'den değişmiş olabilir.

---

## 6. Yasak ifadeler (tüm kanallar)

| Yasak                                       | Yerine                                                   |
| ------------------------------------------- | -------------------------------------------------------- |
| garanti, garantili görünürlük               | ölçüyoruz, gösteriyoruz, takip ediyoruz                  |
| hükmedin / own / dominate / win             | öneriliyor musunuz?                                      |
| Türkiye'nin ilk GEO …                       | ölçen ve kanıt gösteren                                  |
| kaynaksız yüzde ("%60 tıklamasız", "+%340") | yalnız TÜİK / Digital 2026 / EY / TÜSİAD, kaynak adıyla  |
| "6 ay ücretsiz" (kaldırıldı)                | 14 gün deneme, kart yok                                  |
| en iyi klinik / avukat / hasta garantisi    | bilgilendirme, görünürlük ölçümü                         |
| "SEO bitti, AIO geldi"                      | SEO + yapay zekâ görünürlüğü birlikte                    |
| GEO/AEO (KOBİ'ye)                           | "ChatGPT sizi öneriyor mu?", "yapay zekâ görünürlüğü"    |
| "24 saat içinde döneriz"                    | "ekibimiz sizinle iletişime geçecek" (süre taahhüdü yok) |
| "sizi önermiyor" (tek sorgudan)             | "bu tarihte, bu modelde, örnek yanıtta geçmediniz"       |

---

## 7. Takip e-postası şablonu (İYS notlu)

**Kural (D.3):** Ticari elektronik ileti yalnız **İYS izni** olan alıcıya gider (`Lead.iysConsentAt` dolu). B2B tacir
istisnası "kayıtsız gönder" demek değildir: gönderici İYS'ye kayıtlı olmalı, her iletide çıkış bağlantısı, ret 3 iş
gününde işlenir. İzni olmayan lead'e yalnız **talebine yanıt** yazılır (ticari teklif içermez). Kaynak:
https://www.gunespartners.com/makale/iys-nedir , https://mochatouch.com.tr/blog/cold-email-turkiyede-yasal-mi/

**7.1 Talebe yanıt (İYS izni şart değil — yalnız müşterinin sorusuna cevap):**

```
Konu: <host> raporu — konuştuğumuz 3 bulgu

Merhaba <Ad> Bey/Hanım,

Görüşmemizde açtığımız rapor burada (30 gün açık kalır, giriş istemez):
<reportUrl>

Öne çıkan üç bulgu:
1. <bulgu 1 — ne oldu / neden önemli / nasıl düzelir>
2. <bulgu 2>
3. <bulgu 3>

İsterseniz bunları ekibiniz düzeltir (rapordaki "Kendim düzelteceğim" rehberleri),
isterseniz Yanıt Agency üstlenir; ikisini de aynı raporla takip edersiniz.

Uygun olduğunuzda 20 dakikalık bir görüşme ayarlayabilirim.

<Ad Soyad> · Yanıt
Bu e-posta, iletişim formundan gönderdiğiniz talebe yanıttır.
```

**7.2 Ticari bilgilendirme (YALNIZ `iysConsentAt` dolu ise; çıkış linki zorunlu):**

```
Konu: Yanıt — <ay> güncellemesi: yeni araçlar ve sektör sayfanız

Merhaba <Ad> Bey/Hanım,

Bu ay <sektör> siteleri için yeni ölçümler ekledik: <araç 1>, <araç 2>. Sitenizi tek kutudan
yeniden tarayabilirsiniz: <SITE_URL>/arac?url=<host>

<kısa, kaynaklı tek istatistik — ör. TÜİK 2025: yapay zekâ kullanan bireyler %19,2>

Bu iletiyi, iletişim formunda verdiğiniz ticari ileti izniyle gönderiyoruz. Almak istemiyorsanız:
<çıkış bağlantısı> — talebiniz 3 iş günü içinde işlenir.

<Ad Soyad> · Yanıt · İYS kayıtlı gönderici: <marka kodu>
```

Notlar: `ad.soyad@firma.com` biçimindeki adresler kişisel veri sayılır; toplu gönderim yapmayın. LinkedIn mesajı ETK
dışıdır, ilk temas için daha güvenlidir.

---

## 8. Teknik SSS (araç ne ölçer / ne ölçmez)

| Araç                                           | Ölçer                                                                                                | Ölçmez                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| SEO karnesi                                    | title, meta, H1, canonical, OG, viewport, lang                                                       | sıralama, trafik, hız (PSI/CrUX kapsam dışı) |
| WhatsApp önizleme                              | OG/Twitter kartı, görsel erişimi (HEAD), başlık uzunluğu                                             | WhatsApp'ın gerçek render'ı (mockup'tır)     |
| Güvenlik başlıkları                            | HSTS, CSP, X-Frame-Options, TLS sertifikası/sürümü (A+–F)                                            | zafiyet taraması, WAF kuralları              |
| Yönlendirme zinciri                            | http/https × www/çıplak hop sayısı, döngü, kanonik host                                              | sayfa içi yönlendirmeler (JS)                |
| Kırık link bulucu                              | derinlik 2, ≤40 sayfa, dış link HEAD; bütçe dolunca "kısmi"                                          | JS ile üretilen linkler                      |
| robots.txt & sitemap                           | sözdizimi, felaket kuralları (`Disallow: /`), sitemap geçerliliği (≤3 alt sitemap; .gz desteklenmez) | Google'ın gerçek tarama davranışı            |
| hreflang                                       | ISO kodları, karşılıklılık, x-default (≤20 alternate)                                                | çeviri kalitesi                              |
| Schema denetimi                                | JSON-LD sözdizimi, tip başına eksik alan, sektör şablonu (`[DOLDURUN]`)                              | zengin sonuç garantisi                       |
| Satın alma sorusu kapsama                      | sektörün 20–25 sorusu ↔ sayfa başlıkları/FAQ (anahtar kelime)                                        | cevap kalitesi, yapay zekânın verdiği cevap  |
| Güven sinyalleri                               | ad/adres/telefon, KVKK/çerez, hakkımızda, iletişim (yalnız pass/warn)                                | hukuki uygunluk                              |
| Rakip kıyası                                   | 14 hızlı kontrolde iki site aynı formülle                                                            | "ChatGPT kimi öneriyor" (panel ölçer)        |
| E-ticaret / ürün sayfası / AI crawler (mevcut) | Product şeması, katalog yapısı, robots bot matrisi                                                   | satış, dönüşüm                               |

Ortak sınırlar: deterministik tarayıcı, JavaScript render yok (SPA'larda içerik görünmeyebilir → uyarı), WAF 403/503 →
"bot koruması nedeniyle taranamadı" (skor yok), eski charset (ISO-8859-9/windows-1254) → metin uzunluğu kontrolleri
uyarıya düşer, kalıcı rapor 30 gün, aynı adres 24 saat önbellekte (eski 3 araçta 10 dk), hedef site saatlik tavan 12 (çok istekli araçlarda 6).

**"Hazırlık ölçer, AI davranışını değil."** Panel: ChatGPT/Claude/Gemini cevaplarında görünürlük = markanın geçtiği
başarılı çalıştırma / toplam; SoV = kendi bahis / (kendi + rakip); her sayının arkasında tarih + model + örnek cevap.
Yapay zekâ cevapları stokastiktir; tek sorgudan hüküm çıkarmayın.

---

## 9. Rakip söylem tablosu (kaynaklı)

| Oyuncu                         | Söylem                                                                             | Fiyat çapası                                                | Bizim cevabımız                                                                             | Kaynak                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Vayes                          | "Türkiye'nin İlk GEO Uzmanı Ajansı"; "SEO bulunur yapar, GEO cevap haline getirir" | denetim 25–40k, aylık 30–60k TL, 12 ay 360–760k (KDV hariç) | "İlk" değil, ölçen ve kanıt gösteren; self-servis 2.490                                     | https://www.vayes.com.tr/geo-ajansi                             |
| Onur Özden                     | "Yapay zekâ cevabı kendi içinde veriyor, siteye göndermiyor"                       | 17k / 35k / 60k TL/ay                                       | Doğru tespit; biz önce ölçüp gösteriyoruz                                                   | https://www.onurozden.com.tr/hizmet/yapay-zeka-seo/             |
| Lein Digital                   | "Türkiye'nin İlk GEO Ajansı"; "+%340 AI görünürlük"; ücretsiz analiz 24 saatte     | —                                                           | Kaynaksız yüzde kullanmıyoruz; rapor 20 saniyede, kalıcı                                    | https://leindigital.com/hizmetlerimiz/geo-ajansi                |
| Sheltron                       | Sektör landing'leri + kayıtsız spot check; "%61 hasta AI'ya soruyor" (kaynaksız)   | —                                                           | Aynı model, kaynaklı istatistik (TÜİK) ve sektör reklam kurallarına uygun dil               | https://sheltron.com.tr/sektorler/saglik/                       |
| GEONI                          | Türk yapımı AI görünürlük SaaS; TR/EN ayrı; kullandıkça öde; ücretsiz ilk tarama   | —                                                           | Doğrudan ürün rakibi; farkımız Türkçe soru seti + site denetimi + neden/düzelt aynı ekranda | https://geoni.ai/rehber/ai-gorunurluk-araclari                  |
| Stratejik SEO / Sanal Yönetmen | "Yapay zekâda görünme garantisi"                                                   | —                                                           | Garanti vermiyoruz; ölçüm + kanıt                                                           | https://www.stratejikseo.com/geo-ajansi/                        |
| Cremicro                       | "Yapay zekâ da sizi görsün"; "klasik SEO bitti"                                    | —                                                           | SEO + yapay zekâ görünürlüğü birlikte                                                       | https://cremicro.com/geo-ajansi/                                |
| Zeo                            | "AI Visibility Dashboard", kurumsal referanslar, fiyat yok                         | kurumsal                                                    | KOBİ segmenti, şeffaf fiyat                                                                 | https://zeo.org/geo                                             |
| Semrush AI Visibility (global) | 0–100 skor, 3/gün ücretsiz, İngilizce soru seti                                    | $99/ay                                                      | Türkçe sorular, Türkiye kaynakları, e-posta duvarı yok                                      | https://tr.semrush.com/free-tools/ai-search-visibility-checker/ |
| Ahrefs Brand Radar             | mention/citation, motor başına fiyat                                               | $199/motor                                                  | "Tüm motorlar dahil" açıkça yazıyoruz                                                       | https://ahrefs.com/ai-visibility-checker                        |

Not: "SEOmentor" adlı oyuncu doğrulanamadı; listede yok.

---

## 10. Demo günü notları

1. **Ofis IP'si 10/saat limitine çarpar.** Public araçlar IP başına saatte 10 (tek sayfalı) / 5 (çok istekli) tarama alır; aynı Wi-Fi'daki herkes tek IP'dir. Çözüm: **mobil veri** ya da giriş yapıp `/dashboard/tools/*` (tenant limiti 30/saat, sabah kararıyla 60).
2. **Hedef site saatlik tavanı:** aynı alan adı saatte 12 (çok istekli araçlarda 6) kez taranabilir; sonrası 429 "Bu site son bir saatte çok tarandı". Aynı adres 24 saat önbellekten (`cached:true`) döner, yeniden tarama gerektirmez.
3. **Rapor bağlantısı görüşme öncesi üretilebilir:** tarama sabah yapılır, `/rapor/<token>` görüşmede açılır (30 gün geçerli; eski 3 araçta önbellek 10 dk ama rapor yine 30 gün).
4. **WAF'lı siteler:** "bot koruması nedeniyle taranamadı" hükmü gelir; WhatsApp önizleme ve güvenlik başlıkları başlıklardan çalışabilir. Manuel HTML yapıştırma gece kapsamı dışıdır.
5. **Yasaklı siteler:** admin listesindeki alan adları taranmaz; sayfa YouTube'a yönlenir. Beklenen davranıştır.
6. **KVKK:** müşteri bilgisini hiçbir yapay zekâ aracına yapıştırmayın; formu müşteri doldurur; KVKK ve İYS kutuları ayrıdır, ikisini de siz işaretlemeyin.
7. **Rakamlar:** fiyat `/pricing`'den; istatistik yalnız §4.2'deki kaynaklı set. Ekran görüntüsü alırken tarih ve model görünür olsun.
8. **Hitap:** "siz" + "Ad Bey/Hanım"; ilk görüşme tanışmadır, karar beklemeyin; odadaki kişi çoğu zaman nihai karar verici değildir — raporu ortağına iletmesini kolaylaştırın (WhatsApp).
9. **Ekipman:** telefon (WhatsApp + mobil hotspot), laptop, HDMI; internet yoksa önceden alınmış rapor ekran görüntüleri (üstünde tarih).
10. **Sonrası:** `/admin/leads` → aksiyon; 3 gün sonra §7.1 e-postası (yalnız talebe yanıt); ticari ileti yalnız İYS izniyle.

---

## Ek A — Kısa sözlük (müşteriye söylerken)

- **Görünürlük:** markanızın geçtiği cevap oranı (tarih + model damgalı).
- **Share of Voice:** siz + rakipler toplamında sizin payınız.
- **Hazırlık skoru (araçlar):** sitenizin teknik/içerik hazırlığı; deterministik; yapay zekâ davranışını ölçmez.
- **Kalıcı rapor:** `/rapor/<token>` — 30 gün, giriş yok, kişisel veri yok.
- **Yanıt Agency:** düzeltmeyi bizim yapmamız; teklifle; beta.

## Ek B — Kontrol listesi (görüşme öncesi 5 madde)

- [ ] Müşteri alan adı ve rakip alan adı elimde.
- [ ] Mobil veri açık; sekmeler hazır (`/arac?url=<host>`).
- [ ] Kendi hesabımda panel açık; örnek veri "temsili" etiketli.
- [ ] Fiyatı `/pricing`'den bir kez daha okudum.
- [ ] Yasak ifade listesini (§6) hatırlıyorum: garanti yok, ilk yok, kaynaksız yüzde yok.
