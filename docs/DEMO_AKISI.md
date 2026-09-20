# Demo akışı — `/demo` sayfası ve canlı görüşme senaryosu

Bu belge satıcı içindir. `/demo` herkese açık, indekslenen bir **rehber sayfadır**; demo hesabı, `demo-login` ucu
veya `/login?demo=1` **yoktur** (seed hesabı süper admin yetkilidir; halka açılmaz — spec MF-5). Satıcı panel
demosunu **kendi hesabında** gösterir; örnek veri gerekiyorsa `POST /api/admin/seed-demo` (CRON_SECRET ile, süper admin)
kendi tenant'ına temsili veri basar ve panelde "temsili" etiketiyle görünür.

## 0. Hazırlık (görüşmeden 10 dakika önce)

1. Müşterinin alan adını öğrenin; **mobil veri** ile bağlanın (ofis IP'si 10/saat public limitine çarpar — bkz. SATIS_KITI §10).
2. Aşağıdaki URL'leri sekmelerde açık tutun (`<host>` = müşterinin alan adı, `www.` olmadan):
   - `/arac/seo-karnesi?url=<host>` (INTEGRATE sonrası; şimdilik `/arac/ai-crawler-testi?url=<host>`)
   - `/arac/whatsapp-onizleme?url=<host>`
   - `/arac/rakip-kiyas?url=<host>` (rakip alan adını araçta girersiniz)
   - `/arac` (hub; tek kutu → tüm araçlar)
   - `/pricing`, `/contact?src=demo&site=<host>#form`
3. Kendi hesabınızda panel açık: `/dashboard` (giriş yapılmış).
4. Telefonda WhatsApp açık: rapor bağlantısını müşteriye **görüşme sırasında** atacaksınız.

## 1. Tarama (0–20 sn)

- Söz: "Ahmet Bey, izninizle sitenizi 20 saniyede tarayayım."
- Ekran: `/arac/seo-karnesi?url=<host>` otomatik başlar. Hüküm satırını yüksek sesle okuyun: "3 kritik, 4 uyarı, 9 tamam — 41/100".
- Skorun altındaki satırı gösterin: "N kontrol · tarih · deterministik tarayıcı · hazırlık ölçer, AI davranışını değil".
  Bu satır "skor gerçek mi?" itirazını baştan kapatır.
- Site WAF ile korunuyorsa hüküm "bot koruması nedeniyle taranamadı" olur; skor yok. Söz: "Siteniz otomatik ziyaretçiyi
  kapıda çeviriyor; yapay zekâ botları da aynı kapıya geliyor. Bunu birlikte açalım." Alternatif araçla devam edin (WhatsApp önizleme başlıklardan çalışır).

## 2. Kalıcı rapor (20–35 sn)

- Ekran: sonuç altındaki **Kalıcı rapor bağlantısı** → "WhatsApp'ta paylaş". Telefonunuzdan müşteriye atın.
- Söz: "Bu rapor kalıcı; 30 gün açık kalır, giriş istemez. Ortağınıza şimdi iletebilirsiniz."
- Müşteri telefonunda açtığında OG kartı (skor halkası + alan adı) görünür; `/rapor/<token>` sayfasında ilk 5 öneri
  "Önce bunları düzeltin" başlığıyla listelenir.
- CTA satırını gösterin: "Bunları biz düzeltelim" (form, bağlam dolu gelir) · "Kendim düzelteceğim" (öneriler) · "Yeniden tara".

## 3. Sektör sorusu (35–50 sn)

- Ekran: `/arac/satin-alma-sorusu-kapsama?url=<host>&sektor=<slug>` (INTEGRATE sonrası) ya da sektör sayfası `/sektor/<slug>`.
- Söz: "Sektörünüzde müşteri bu 5 soruyu soruyor; sitenizde 1'ine cevap var." Soru kartlarını gösterin; "en yakın sayfa" sütununu okuyun.
- Dürüstlük cümlesi (mutlaka): "Bu anahtar kelime eşleşmesi; cevabın kalitesini ve yapay zekânın ne dediğini ölçmez. Onu panel ölçer."
- Rakip: `/arac/rakip-kiyas` → "Rakibinizle yan yana: 14 maddenin 9'unda o önde." Rakibin **kendi** sitesini de tarattığınızı söyleyin (aynı formül).

## 4. Panel (50–60 sn)

- Ekran: kendi hesabınızda `/dashboard` — görünürlük, SoV, rakipler; bir soruya tıklayıp **tarih + model damgalı örnek cevabı** gösterin.
- Söz: "İki yol: panelde siz takip edin — ₺2.490/ay, 14 gün deneme, kart yok — ya da Yanıt Agency yapsın, teklifle."
  (Rakamlar `getOffer()` ile `/pricing`'den okunur; sabah kararında değişebilir.)
- Kapanış: `/contact?src=demo&site=<host>&token=<token>#form` — formu **müşteri** doldurur; KVKK kutusunu siz işaretlemeyin.

## Admin tarafı (görüşme sonrası, 2 dk)

`/admin/leads` → kaynak sekmesi "İletişim" → NEW lead; "Arandı" / "Teklif" aksiyonları; e-posta maskeli, tıkla-göster audit'lidir.
Tarama lead'i (yalnız hostname + skor) ile form lead'i aynı hostname'de **birleşir** (scanCount korunur, kaynak CONTACT olur).

## Yapılmayacaklar

- "Garanti", "hükmedin", "Türkiye'nin ilk" demeyin; "ölçüyoruz, gösteriyoruz, takip ediyoruz".
- Tek bir ChatGPT ekran görüntüsünü "sizi önermiyor" hükmüne çevirmeyin; tarih + model + "örnek yanıt" deyin.
- Müşteri verisini (ad, telefon, e-posta) hiçbir yapay zekâ aracına yapıştırmayın (KVKK md. 9 yurt dışı aktarımı).
- Fiyatı sorulmadan söylemeyin; "bugün geçerli teklif" yok.

## Sorun giderme

| Belirti                                  | Sebep                              | Çözüm                                                             |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- |
| 429 "Çok fazla istek"                    | Ofis IP'si 10/saat public limiti   | Mobil veri ya da giriş yapıp `/dashboard/tools/*` (tenant limiti) |
| 429 "Bu site son bir saatte çok tarandı" | Aynı hedef için saatlik tavan (12) | Önbellek 24 s: aynı adresi yeniden tarayın, `cached:true` döner   |
| "bot koruması nedeniyle taranamadı"      | WAF 403/503                        | Başka araç; müşteriye YanıtBot'a izin vermesini söyleyin (`/bot`) |
| Rapor 410                                | 30 gün doldu                       | "Yeniden tara" düğmesi                                            |
| Yasaklı site yönlendirmesi               | Admin listesinde alan adı          | Beklenen davranış; `/admin/blocked-sites`                         |
