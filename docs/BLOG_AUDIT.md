# Blog içerik denetimi

Üretim: `node scripts/blog-audit.mjs` · Tarih: 2026-09-06 · Kaynak: `apps/web/src/data/blog-posts*.ts`

## Özet

| Kontrol                                     | Önce | Sonra |
| ------------------------------------------- | ---- | ----- |
| Toplam yazı                                 | 84   | 84    |
| Yinelenen slug                              | 0    | 0     |
| Yinelenen başlık (birebir)                  | 0    | 0     |
| Yakın-yinelenen başlık çifti                | 2    | 2     |
| İnce içerik (< 350 kelime)                  | 66   | 66    |
| Eski/emekli model adı (hata)                | 0    | 0     |
| Eskimeye yüz tutmuş model referansı (uyarı) | 4    | 0     |
| Perplexity/Grok "izliyoruz" iddiası         | 0    | 0     |
| Bayat yıl iddiası / geçmişte kalmış vaat    | 11   | 9     |
| Geçersiz veya gelecek publishedAt           | 0    | 0     |
| Gövdede iç link yok                         | 80   | 80    |
| Kaynaksız sayısal iddia (toplam cümle)      | 49   | 49    |

> Not: Blog gövdesi düz metin blokları (`p`/`h2`/`ul`…) olarak render edilir; gövde içinde tıklanabilir link desteği yoktur.
> "İç link yok" kontrolü metinde geçen `/blog/…`, `/features`, `/pricing`, `/resources/…` yollarını arar. Şablon tarafında
> `getRelatedPosts()` her yazıya 6 ilgili yazı bağladığı için crawl grafiği bağlıdır; ancak gövde-içi bağlamsal link sıfırdır.

## 1. Yinelenen slug

_Yok._

## 2. Yinelenen / yakın-yinelenen başlık

### Birebir (normalize edilmiş)

_Yok._

### Yakın (token Jaccard ≥ 0.5 veya Levenshtein benzerliği ≥ 0.8)

| Slug A                                          | Slug B                                        | Başlık A                                                           | Başlık B                                               | Jaccard | Benzerlik |
| ----------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ | ------- | --------- |
| geo-nedir-seo-nasil-degisti                     | geo-nedir-seo-farki-neden-kritik              | GEO nedir, SEO'dan ne farkı var?                                   | GEO nedir? SEO'dan farkı neden artık kritik?           | 0.50    | 0.56      |
| chatgpt-claude-gemini-marka-cevaplari-farkli-mi | claude-gemini-markalari-neden-farkli-oneriyor | ChatGPT, Claude ve Gemini aynı soruya farklı markalar mı öneriyor? | Claude ve Gemini aynı markaları neden farklı öneriyor? | 0.56    | 0.61      |

## 3. İnce içerik (< 350 kelime)

AI dolgu metniyle şişirilmedi; öneri sütunu editoryal karar içindir. Slug değiştirilmez (indeksli).

| Slug                                                | Kelime | Başlık                                                             | Öneri                                         |
| --------------------------------------------------- | ------ | ------------------------------------------------------------------ | --------------------------------------------- |
| geoda-icerik-uzunlugu-onemli-mi                     | 114    | GEO'da içerik uzunluğu önemli mi?                                  | genişlet; yakın vadede mümkün değilse noindex |
| headless-cms-yapilari-geoya-avantaj-saglar-mi       | 117    | Headless CMS yapıları GEO'ya avantaj sağlar mı?                    | genişlet; yakın vadede mümkün değilse noindex |
| llms-txt-rehberi-2026                               | 119    | llms.txt: AI crawler'lara markanızı doğrudan anlatın               | genişlet; yakın vadede mümkün değilse noindex |
| tr-pazarinda-geo-2026                               | 119    | Türkiye pazarında GEO 2026: ilk hareket avantajı kimde?            | genişlet; yakın vadede mümkün değilse noindex |
| ai-destekli-marka-monitoring-nasil-yapilir          | 120    | AI destekli marka monitoring nasıl yapılır?                        | genişlet; yakın vadede mümkün değilse noindex |
| geo-icin-api-erisilebilirligi-neden-onemli          | 128    | GEO için API erişilebilirliği neden önemli?                        | genişlet; yakın vadede mümkün değilse noindex |
| ai-crawler-budget-nedir                             | 129    | AI crawler budget nedir?                                           | genişlet; yakın vadede mümkün değilse noindex |
| ai-answer-engine-optimization-nedir                 | 131    | AI answer engine optimization nedir?                               | genişlet; yakın vadede mümkün değilse noindex |
| llm-citationlarinda-gorunmek-neden-kritik           | 133    | LLM citation'larında görünmek neden kritik?                        | genişlet; yakın vadede mümkün değilse noindex |
| ai-modelleri-pdf-iceriklerini-okuyor-mu             | 134    | AI modelleri PDF içerikleri okuyor mu?                             | genişlet; yakın vadede mümkün değilse noindex |
| ai-search-icin-en-iyi-cms                           | 136    | AI search için en iyi CMS hangisi?                                 | genişlet; yakın vadede mümkün değilse noindex |
| ai-aramalarinda-video-iceriklerin-yukselisi         | 136    | AI aramalarında video içeriklerin yükselişi                        | genişlet; yakın vadede mümkün değilse noindex |
| schema-markup-geoya-katki-saglar-mi                 | 137    | Schema markup GEO'ya katkı sağlar mı?                              | genişlet; yakın vadede mümkün değilse noindex |
| ai-modelleri-sosyal-medyayi-kaynak-kullaniyor-mu    | 141    | AI modelleri sosyal medyayı kaynak olarak kullanıyor mu?           | genişlet; yakın vadede mümkün değilse noindex |
| geo-icin-topluluk-yonetimi-neden-onemli             | 144    | GEO için topluluk yönetimi neden önemli?                           | genişlet; yakın vadede mümkün değilse noindex |
| geo-icin-multilingual-content-stratejisi            | 145    | GEO için multilingual content stratejisi                           | genişlet; yakın vadede mümkün değilse noindex |
| ai-caginda-organik-trafik-nasil-degisiyor           | 146    | AI çağında organik trafik nasıl değişiyor?                         | genişlet; yakın vadede mümkün değilse noindex |
| geo-icin-en-iyi-veri-kaynaklari                     | 146    | GEO için en iyi veri kaynakları                                    | genişlet; yakın vadede mümkün değilse noindex |
| geo-icin-en-guclu-icerik-formatlari                 | 148    | GEO için en güçlü içerik formatları                                | genişlet; yakın vadede mümkün değilse noindex |
| ai-crawlerlar-javascript-siteleri-okuyabiliyor-mu   | 151    | AI crawler'lar JavaScript siteleri okuyabiliyor mu?                | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-icin-ideal-site-mimarisi                        | 153    | GEO için ideal site mimarisi                                       | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-first-content-strategy-nasil-olusturulur         | 153    | AI-first content strategy nasıl oluşturulur?                       | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-search-future-google-sonrasi-donem               | 155    | AI search future: Google sonrası dönem                             | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-first-startup-olmak-ne-demek                     | 156    | AI-first startup olmak ne demek?                                   | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-visibility-tracking-tool-nasil-gelistirilir      | 157    | AI visibility tracking tool nasıl geliştirilir?                    | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-answer-ranking-faktorleri                        | 158    | AI answer ranking faktörleri neler?                                | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-search-trendleri-2026-ve-sonrasi                 | 159    | AI search trendleri: 2026 ve sonrası                               | genişlet (350+ kelime, özgün veri/örnek ekle) |
| chatgptde-rakiplerden-daha-fazla-gorunmenin-yollari | 160    | ChatGPT'de rakiplerden daha fazla görünmenin yolları               | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-icin-veri-odakli-icerik-neden-kritik            | 160    | GEO için veri odaklı içerik neden kritik?                          | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-stratejisinde-youtubun-rolu                     | 161    | GEO stratejisinde YouTube'un rolü                                  | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-odakli-saas-landing-page-ornekleri              | 161    | GEO odaklı SaaS landing page örnekleri                             | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-visibility-raporu-nasil-hazirlanir               | 163    | AI visibility raporu nasıl hazırlanır?                             | genişlet (350+ kelime, özgün veri/örnek ekle) |
| perplexity-seo-nedir                                | 164    | Perplexity SEO nedir?                                              | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ailarin-anlayacagi-landing-page-nasil-hazirlanir    | 164    | AI'ların anlayacağı landing page nasıl hazırlanır?                 | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ailar-markaniz-hakkinda-yanlis-bilgi-veriyorsa      | 164    | AI'lar markanız hakkında yanlış bilgi veriyorsa ne yapmalı?        | genişlet (350+ kelime, özgün veri/örnek ekle) |
| llm-optimization-teknik-stack-onerileri             | 165    | LLM optimization için teknik stack önerileri                       | genişlet (350+ kelime, özgün veri/örnek ekle) |
| neden-bazi-markalar-aida-surekli-oneriliyor         | 166    | Neden bazı markalar AI'da sürekli öneriliyor?                      | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-yatiriminin-roisi-nasil-olculur                 | 166    | GEO yatırımının ROI'si nasıl ölçülür?                              | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-araclari-karsilastirmasi                        | 167    | GEO araçları karşılaştırması                                       | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-aeo-seo-farklari                                | 169    | GEO vs AEO vs SEO farkları                                         | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-crawler-loglari-nasil-analiz-edilir              | 173    | AI crawler logları nasıl analiz edilir?                            | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-gorunurlugu-icin-structured-data-rehberi         | 174    | AI görünürlüğü için structured data rehberi                        | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-modelleri-rakip-analizini-nasil-etkiliyor        | 175    | AI modelleri rakip analizini nasıl etkiliyor?                      | genişlet (350+ kelime, özgün veri/örnek ekle) |
| openai-crawler-engellemek-mantikli-mi               | 176    | OpenAI crawler'ını engellemek mantıklı mı?                         | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-icin-dijital-pr-stratejileri                    | 179    | GEO için dijital PR stratejileri                                   | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-caginda-thought-leadership-neden-onemli          | 179    | AI çağında "thought leadership" neden önemli?                      | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-agentlar-web-sitelerini-nasil-kullaniyor         | 181    | AI agent'lar web sitelerini nasıl kullanıyor?                      | genişlet (350+ kelime, özgün veri/örnek ekle) |
| turk-markalari-geo-konusunda-neden-geride           | 181    | Türk markaları GEO konusunda neden geride?                         | genişlet (350+ kelime, özgün veri/örnek ekle) |
| chatgpt-claude-gemini-marka-cevaplari-farkli-mi     | 183    | ChatGPT, Claude ve Gemini aynı soruya farklı markalar mı öneriyor? | birleştir (yakın başlıklı yazı var)           |
| geo-odakli-blog-yazisi-nasil-yazilir                | 184    | GEO odaklı blog yazısı nasıl yazılır?                              | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-optimizasyonunda-semantic-web-rolu              | 187    | GEO optimizasyonunda semantic web'in rolü                          | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-icin-wikipedia-etkisi-gercek-mi                 | 192    | GEO için Wikipedia etkisi gerçek mi?                               | genişlet (350+ kelime, özgün veri/örnek ekle) |
| chatgpt-shopping-sonuclarina-nasil-girilir          | 193    | ChatGPT Shopping sonuçlarına nasıl girilir?                        | genişlet (350+ kelime, özgün veri/örnek ekle) |
| citation-economy-nedir                              | 197    | Citation economy nedir?                                            | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-recommendation-bias-nedir                        | 199    | AI recommendation bias nedir?                                      | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-caginda-domain-authority-onemli-mi               | 207    | AI çağında domain authority hâlâ önemli mi?                        | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-search-optimizasyonunda-gelecegin-meslekleri     | 209    | AI search optimizasyonunda geleceğin meslekleri                    | genişlet (350+ kelime, özgün veri/örnek ekle) |
| marka-mentionlari-seodan-daha-mi-degerli            | 237    | Marka mention'ları SEO'dan daha mı değerli oldu?                   | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-modelleri-icerik-guvenilirligini-nasil-olcuyor   | 244    | AI modelleri içerik güvenilirliğini nasıl ölçüyor?                 | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-icin-content-cluster-nasil-kurulur              | 257    | GEO için content cluster nasıl kurulur?                            | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-nedir-seo-nasil-degisti                         | 279    | GEO nedir, SEO'dan ne farkı var?                                   | birleştir (yakın başlıklı yazı var)           |
| llms-txt-nedir-nasil-kurulur                        | 297    | llms.txt nedir, nasıl kurulur?                                     | genişlet (350+ kelime, özgün veri/örnek ekle) |
| geo-audit-nasil-yapilir                             | 298    | GEO audit nasıl yapılır?                                           | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-recommendation-engine-nasil-calisiyor            | 306    | AI recommendation engine nasıl çalışıyor?                          | genişlet (350+ kelime, özgün veri/örnek ekle) |
| llmler-kullanici-yorumlarini-nasil-yorumluyor       | 323    | LLM'ler kullanıcı yorumlarını nasıl yorumluyor?                    | genişlet (350+ kelime, özgün veri/örnek ekle) |
| ai-visibility-score-nasil-hesaplanir                | 339    | AI visibility score nasıl hesaplanır?                              | genişlet (350+ kelime, özgün veri/örnek ekle) |

## 4. Model referansları

### Eski / emekli model adları (hata — otomatik düzeltme kapsamı)

_Yok._

### Eskimeye yüz tutmuş referanslar (uyarı — elle gözden geçir)

_Yok._

### Perplexity / Grok "izliyoruz" iddiaları (ürün: yol haritası)

_Yok._

## 5. Bayat yıl iddiaları (listelenir, otomatik düzeltilmez)

Eski bir yıl (≤ 2025) şimdiki zamanla ("itibarıyla", "-yor" …) sunuluyor ya da geçmişte kalmış bir çeyrek hedef olarak veriliyor.

| Slug                                        | Konum            | Yıl  | Tür                     | Alıntı                                                                                                                                                  |
| ------------------------------------------- | ---------------- | ---- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| geo-nedir-seo-nasil-degisti                 | body[1]          | 2025 | eski yıl, şimdiki zaman | 2025 itibarıyla milyonlarca insan artık "en iyi muhasebe yazılımı" sorusunu Google'a değil, ChatGPT'ye veya Claude'a soruyor.                           |
| geo-nedir-seo-nasil-degisti                 | body[9]          | 2025 | eski yıl, şimdiki zaman | Bu standart 2025'te ortaya çıktı, hızla yayılıyor.                                                                                                      |
| llms-txt-rehberi-2026                       | excerpt          | 2025 | eski yıl, şimdiki zaman | llms.txt standardı 2025'te ortaya çıktı, 2026'da Türkiye'de hızla yayılıyor.                                                                            |
| geo-nedir-seo-farki-neden-kritik            | body[9].items[2] | 2025 | eski yıl, şimdiki zaman | Gartner'ın 2025 raporu: 2027 itibarıyla geleneksel arama trafiğinin %25'i AI motorlarına kayacak.                                                       |
| geo-nedir-seo-farki-neden-kritik            | body[14]         | 2025 | eski yıl, şimdiki zaman | Bu standart 2025'te ortaya çıktı, 2026'da hızla yayılıyor.                                                                                              |
| chatgpt-markanizi-neden-onermiyor           | body[2]          | 2024 | eski yıl, şimdiki zaman | Eğer markanız 2024'te lansman yaptıysa veya o döneme kadar dijital varlığınız zayıfsa model sizi tanımıyor.                                             |
| chatgpt-markanizi-neden-onermiyor           | body[8]          | 2021 | eski yıl, şimdiki zaman | Eğer 2021'de bir veri ihlali yaşadıysanız ve hâlâ Google'da "X veri ihlali" sorgusunda öne çıkıyorsanız, ChatGPT de bunu hatırlar.                      |
| perplexity-seo-nedir                        | body[6]          | 2024 | eski yıl, şimdiki zaman | Perplexity 2024'te "Pages" özelliğini lansman etti — kullanıcılar AI tarafından oluşturulan sayfaları paylaşabiliyor.                                   |
| ai-agentlar-web-sitelerini-nasil-kullaniyor | body[0]          | 2025 | eski yıl, şimdiki zaman | 2025 sonu ve 2026'da yeni bir paradigma yükseliyor: AI agent'lar — kullanıcının görev verdiği, kendi başlarına web'de gezen, formlar dolduran, satın a… |

## 6. Geçersiz veya gelecek tarihli publishedAt

_Yok._

## 7. Gövdede iç link olmayan yazılar

| Slug                                                | Başlık                                                             | Kelime |
| --------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| geo-nedir-seo-nasil-degisti                         | GEO nedir, SEO'dan ne farkı var?                                   | 279    |
| chatgpt-claude-gemini-marka-cevaplari-farkli-mi     | ChatGPT, Claude ve Gemini aynı soruya farklı markalar mı öneriyor? | 183    |
| tr-pazarinda-geo-2026                               | Türkiye pazarında GEO 2026: ilk hareket avantajı kimde?            | 119    |
| geo-nedir-seo-farki-neden-kritik                    | GEO nedir? SEO'dan farkı neden artık kritik?                       | 541    |
| chatgpt-markanizi-neden-onermiyor                   | ChatGPT markanızı neden önermiyor olabilir?                        | 417    |
| ai-aramalarinda-gorunurluk-nasil-olculur            | AI aramalarında görünürlük nasıl ölçülür?                          | 358    |
| geo-icin-ilk-90-gun-stratejisi                      | GEO için ilk 90 gün stratejisi                                     | 401    |
| llmler-markalari-hangi-kaynaklara-gore-oneriyor     | LLM'ler markaları hangi kaynaklara göre öneriyor?                  | 410    |
| ai-crawlerlari-sitenizi-nasil-tariyor               | AI crawler'ları sitenizi nasıl tarıyor?                            | 398    |
| ai-seo-checklist-2026                               | AI SEO checklist: 2026 versiyonu                                   | 378    |
| chatgptde-onerilen-markalar-nasil-seciliyor         | ChatGPT'de önerilen markalar nasıl seçiliyor?                      | 368    |
| claude-gemini-markalari-neden-farkli-oneriyor       | Claude ve Gemini aynı markaları neden farklı öneriyor?             | 401    |
| geo-audit-nasil-yapilir                             | GEO audit nasıl yapılır?                                           | 298    |
| geo-icin-teknik-seo-hala-gerekli-mi                 | GEO için teknik SEO hâlâ gerekli mi?                               | 367    |
| yapay-zeka-caginda-backlink-yeni-rolu               | Yapay zekâ çağında backlink'in yeni rolü                           | 364    |
| ai-visibility-score-nasil-hesaplanir                | AI visibility score nasıl hesaplanır?                              | 339    |
| ai-search-optimizasyonu-7-buyuk-hata                | AI search optimizasyonunda en büyük 7 hata                         | 381    |
| eticaret-siteleri-icin-geo-rehberi                  | E-ticaret siteleri için GEO rehberi                                | 421    |
| saas-sirketleri-icin-geo-stratejisi                 | SaaS şirketleri için GEO stratejisi                                | 434    |
| lokal-isletmeler-icin-geo-calisir-mi                | Lokal işletmeler için GEO çalışır mı?                              | 380    |
| ai-snippetlerine-girmenin-yollari                   | AI snippet'lerine girmenin yolları                                 | 366    |
| reddit-icerikleri-ai-sonuclarinda-neden-guclu       | Reddit içerikleri neden AI sonuçlarında güçlü?                     | 414    |
| forum-seo-geri-mi-donuyor                           | Forum SEO geri mi dönüyor?                                         | 382    |
| llmler-kullanici-yorumlarini-nasil-yorumluyor       | LLM'ler kullanıcı yorumlarını nasıl yorumluyor?                    | 323    |
| ai-recommendation-engine-nasil-calisiyor            | AI recommendation engine nasıl çalışıyor?                          | 306    |
| marka-mentionlari-seodan-daha-mi-degerli            | Marka mention'ları SEO'dan daha mı değerli oldu?                   | 237    |
| ai-caginda-domain-authority-onemli-mi               | AI çağında domain authority hâlâ önemli mi?                        | 207    |
| geo-odakli-blog-yazisi-nasil-yazilir                | GEO odaklı blog yazısı nasıl yazılır?                              | 184    |
| ai-crawler-loglari-nasil-analiz-edilir              | AI crawler logları nasıl analiz edilir?                            | 173    |
| openai-crawler-engellemek-mantikli-mi               | OpenAI crawler'ını engellemek mantıklı mı?                         | 176    |
| perplexity-seo-nedir                                | Perplexity SEO nedir?                                              | 164    |
| chatgpt-shopping-sonuclarina-nasil-girilir          | ChatGPT Shopping sonuçlarına nasıl girilir?                        | 193    |
| ai-answer-engine-optimization-nedir                 | AI answer engine optimization nedir?                               | 131    |
| geo-araclari-karsilastirmasi                        | GEO araçları karşılaştırması                                       | 167    |
| geo-aeo-seo-farklari                                | GEO vs AEO vs SEO farkları                                         | 169    |
| ai-search-future-google-sonrasi-donem               | AI search future: Google sonrası dönem                             | 155    |
| neden-bazi-markalar-aida-surekli-oneriliyor         | Neden bazı markalar AI'da sürekli öneriliyor?                      | 166    |
| ai-gorunurlugu-icin-structured-data-rehberi         | AI görünürlüğü için structured data rehberi                        | 174    |
| schema-markup-geoya-katki-saglar-mi                 | Schema markup GEO'ya katkı sağlar mı?                              | 137    |
| geo-icin-en-guclu-icerik-formatlari                 | GEO için en güçlü içerik formatları                                | 148    |
| ailarin-anlayacagi-landing-page-nasil-hazirlanir    | AI'ların anlayacağı landing page nasıl hazırlanır?                 | 164    |
| ai-modelleri-icerik-guvenilirligini-nasil-olcuyor   | AI modelleri içerik güvenilirliğini nasıl ölçüyor?                 | 244    |
| citation-economy-nedir                              | Citation economy nedir?                                            | 197    |
| geo-icin-dijital-pr-stratejileri                    | GEO için dijital PR stratejileri                                   | 179    |
| ai-caginda-thought-leadership-neden-onemli          | AI çağında "thought leadership" neden önemli?                      | 179    |
| geo-icin-wikipedia-etkisi-gercek-mi                 | GEO için Wikipedia etkisi gerçek mi?                               | 192    |
| ai-modelleri-rakip-analizini-nasil-etkiliyor        | AI modelleri rakip analizini nasıl etkiliyor?                      | 175    |
| geo-optimizasyonunda-semantic-web-rolu              | GEO optimizasyonunda semantic web'in rolü                          | 187    |
| ailar-markaniz-hakkinda-yanlis-bilgi-veriyorsa      | AI'lar markanız hakkında yanlış bilgi veriyorsa ne yapmalı?        | 164    |
| chatgptde-rakiplerden-daha-fazla-gorunmenin-yollari | ChatGPT'de rakiplerden daha fazla görünmenin yolları               | 160    |
| ai-agentlar-web-sitelerini-nasil-kullaniyor         | AI agent'lar web sitelerini nasıl kullanıyor?                      | 181    |
| ai-first-content-strategy-nasil-olusturulur         | AI-first content strategy nasıl oluşturulur?                       | 153    |
| geoda-icerik-uzunlugu-onemli-mi                     | GEO'da içerik uzunluğu önemli mi?                                  | 114    |
| ai-modelleri-pdf-iceriklerini-okuyor-mu             | AI modelleri PDF içerikleri okuyor mu?                             | 134    |
| geo-icin-api-erisilebilirligi-neden-onemli          | GEO için API erişilebilirliği neden önemli?                        | 128    |
| ai-crawler-budget-nedir                             | AI crawler budget nedir?                                           | 129    |
| ai-search-icin-en-iyi-cms                           | AI search için en iyi CMS hangisi?                                 | 136    |
| headless-cms-yapilari-geoya-avantaj-saglar-mi       | Headless CMS yapıları GEO'ya avantaj sağlar mı?                    | 117    |
| ai-destekli-marka-monitoring-nasil-yapilir          | AI destekli marka monitoring nasıl yapılır?                        | 120    |
| geo-icin-veri-odakli-icerik-neden-kritik            | GEO için veri odaklı içerik neden kritik?                          | 160    |
| ai-recommendation-bias-nedir                        | AI recommendation bias nedir?                                      | 199    |
| geo-stratejisinde-youtubun-rolu                     | GEO stratejisinde YouTube'un rolü                                  | 161    |
| ai-aramalarinda-video-iceriklerin-yukselisi         | AI aramalarında video içeriklerin yükselişi                        | 136    |
| llm-optimization-teknik-stack-onerileri             | LLM optimization için teknik stack önerileri                       | 165    |
| geo-odakli-saas-landing-page-ornekleri              | GEO odaklı SaaS landing page örnekleri                             | 161    |
| ai-visibility-tracking-tool-nasil-gelistirilir      | AI visibility tracking tool nasıl geliştirilir?                    | 157    |
| ai-search-trendleri-2026-ve-sonrasi                 | AI search trendleri: 2026 ve sonrası                               | 159    |
| ai-caginda-organik-trafik-nasil-degisiyor           | AI çağında organik trafik nasıl değişiyor?                         | 146    |
| geo-yatiriminin-roisi-nasil-olculur                 | GEO yatırımının ROI'si nasıl ölçülür?                              | 166    |
| ai-crawlerlar-javascript-siteleri-okuyabiliyor-mu   | AI crawler'lar JavaScript siteleri okuyabiliyor mu?                | 151    |
| geo-icin-multilingual-content-stratejisi            | GEO için multilingual content stratejisi                           | 145    |
| turk-markalari-geo-konusunda-neden-geride           | Türk markaları GEO konusunda neden geride?                         | 181    |
| ai-first-startup-olmak-ne-demek                     | AI-first startup olmak ne demek?                                   | 156    |
| geo-icin-topluluk-yonetimi-neden-onemli             | GEO için topluluk yönetimi neden önemli?                           | 144    |
| ai-modelleri-sosyal-medyayi-kaynak-kullaniyor-mu    | AI modelleri sosyal medyayı kaynak olarak kullanıyor mu?           | 141    |
| geo-icin-en-iyi-veri-kaynaklari                     | GEO için en iyi veri kaynakları                                    | 146    |
| ai-visibility-raporu-nasil-hazirlanir               | AI visibility raporu nasıl hazırlanır?                             | 163    |
| ai-answer-ranking-faktorleri                        | AI answer ranking faktörleri neler?                                | 158    |
| llm-citationlarinda-gorunmek-neden-kritik           | LLM citation'larında görünmek neden kritik?                        | 133    |
| ai-search-optimizasyonunda-gelecegin-meslekleri     | AI search optimizasyonunda geleceğin meslekleri                    | 209    |

## 8. Kaynaksız sayısal iddialar (ilk 30 / toplam 49)

Cümlede `%` ya da "araştırma/çalışma/rapor/anket" geçiyor, sayı var, yakınında link veya "kaynak:" yok. Uyarı niteliğindedir.

| Slug                                          | Konum             | Etiket                  | Alıntı                                                                                                                                                                      |
| --------------------------------------------- | ----------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| geo-icin-veri-odakli-icerik-neden-kritik      | body[0]           | kaynaksız               | AI cevaplarında "%73 oranında" veya "200 firma üzerinde yapılan araştırma" gibi sayısal ifadeler içeren içerikler basit fikir yazılarından çok daha sık kaynak olarak göst… |
| geo-nedir-seo-farki-neden-kritik              | body[9].items[2]  | isimli kaynak, link yok | Gartner'ın 2025 raporu: 2027 itibarıyla geleneksel arama trafiğinin %25'i AI motorlarına kayacak.                                                                           |
| geo-nedir-seo-farki-neden-kritik              | body[9].items[0]  | kaynaksız               | Bu kullanıcıların %43'ü son satın alma kararında AI önerisinden etkilendiğini söylüyor.                                                                                     |
| ai-aramalarinda-gorunurluk-nasil-olculur      | body[7].items[0]  | kaynaksız               | Modele göre dağılım: ChatGPT'de %80, Gemini'de %30 olmak farklı stratejiler ister.                                                                                          |
| geo-icin-ilk-90-gun-stratejisi                | body[13]          | kaynaksız               | 90 gün sonunda gerçekçi beklentiler: Visibility Score'unuz başlangıçtan %30-40 daha yüksek olabilir.                                                                        |
| ai-crawlerlari-sitenizi-nasil-tariyor         | body[11]          | kaynaksız               | Düzgün kurulmuş bir kurumsal site için aylık AI bot trafiği toplam trafiğin %5-15'i arasında olmalı.                                                                        |
| ai-crawlerlari-sitenizi-nasil-tariyor         | body[11]          | kaynaksız               | Çok düşük (%1 altı) ise görünmüyorsunuz — robots.txt'i kontrol edin, llms.txt ekleyin.                                                                                      |
| ai-crawlerlari-sitenizi-nasil-tariyor         | body[11]          | kaynaksız               | Çok yüksek (%30+) ise sunucu yükünüze yansıyabilir, optimizasyon gerek.                                                                                                     |
| chatgptde-onerilen-markalar-nasil-seciliyor   | body[3]           | kaynaksız               | Frekans hesabı kaba değil — modele "X marka bu kategorideki sohbetlerin %12'sinde geçiyor" gibi istatistiksel bilgi sağlar.                                                 |
| claude-gemini-markalari-neden-farkli-oneriyor | body[15]          | kaynaksız               | Tek bir modelde %90 olmak, üç modelde %50-50-50 olmaktan kıymetlidir gibi görünür ama gerçekte tek modelin algoritma değişikliği sizi anında düşürür.                       |
| geo-audit-nasil-yapilir                       | body[12].items[2] | kaynaksız               | Güçlü sorular (mention rate %75+).                                                                                                                                          |
| geo-audit-nasil-yapilir                       | body[12].items[3] | kaynaksız               | Zayıf sorular (mention rate %25 altı).                                                                                                                                      |
| ai-visibility-score-nasil-hesaplanir          | body[7].items[0]  | kaynaksız               | Niş B2B SaaS'ta %40 iyi olabilir; tüketici e-ticaretinde %40 düşük.                                                                                                         |
| ai-visibility-score-nasil-hesaplanir          | body[7].items[1]  | kaynaksız               | 40-60% iyi başlangıç; 70+% mükemmel; 90+% pratikte zor ve sıklıkla "kategori lideri" durumudur.                                                                             |
| ai-visibility-score-nasil-hesaplanir          | body[7].items[3]  | kaynaksız               | Modele göre dağılım da kritik — toplam %60 ama Gemini'de %20 ise problem var.                                                                                               |
| ai-visibility-score-nasil-hesaplanir          | body[10].items[0] | kaynaksız               | B2B SaaS: 30-60% normal, 70+% sektör lideri.                                                                                                                                |
| ai-visibility-score-nasil-hesaplanir          | body[10].items[1] | kaynaksız               | E-ticaret (genel ürün): 40-70% normal, 80+% kategori dominasyonu.                                                                                                           |
| ai-visibility-score-nasil-hesaplanir          | body[10].items[2] | kaynaksız               | Yerel hizmetler: 20-50% normal (kategorik sorular sınırlı), 60+% mükemmel.                                                                                                  |
| ai-visibility-score-nasil-hesaplanir          | body[10].items[3] | kaynaksız               | Niş SaaS: 50-80% (rakip sayısı az).                                                                                                                                         |
| ai-visibility-score-nasil-hesaplanir          | body[10].items[5] | kaynaksız               | Eğitim/danışmanlık: 25-55% normal.                                                                                                                                          |
| ai-visibility-score-nasil-hesaplanir          | body[15]          | kaynaksız               | Score haftada %1-2 artıyorsa harika; yatay ise stratejinizi gözden geçirin.                                                                                                 |
| ai-search-optimizasyonu-7-buyuk-hata          | body[3].items[0]  | kaynaksız               | Sadece tek modeli izlemek: "ChatGPT'de %80, ne güzel" dediğiniz an Gemini'de %20 olabilir.                                                                                  |
| ai-search-optimizasyonu-7-buyuk-hata          | body[6].items[0]  | kaynaksız               | Snapshot mentaliyesi: "Bugünkü %65" tek başına anlamsız.                                                                                                                    |
| ai-search-optimizasyonu-7-buyuk-hata          | body[6].items[0]  | kaynaksız               | Geçen ay %50 idiyse iyileşiyorsunuz, %75 idiyse düşüyorsunuz.                                                                                                               |
| saas-sirketleri-icin-geo-stratejisi           | body[0]           | kaynaksız               | Alıcı ürün araştırmaya G2'dan değil, ChatGPT'den başlıyor; sonra G2'a giderek seçilen 2-3 marka için detay araştırıyor.                                                     |
| ai-snippetlerine-girmenin-yollari             | body[3].items[2]  | kaynaksız               | Sayısal veri içeren ifadeler ("kullanıcıların %73'ü…").                                                                                                                     |
| marka-mentionlari-seodan-daha-mi-degerli      | body[11]          | kaynaksız               | PR ve link building bütçenizin %60'ını mention odaklı çalışmalara, %40'ını backlink odaklı çalışmalara ayırın.                                                              |
| ai-crawler-loglari-nasil-analiz-edilir        | body[4].items[2]  | kaynaksız               | 404 oranı (%1'in altında olmalı).                                                                                                                                           |
| ai-crawler-loglari-nasil-analiz-edilir        | body[4].items[3]  | kaynaksız               | 5xx oranı (%0.5'in altı).                                                                                                                                                   |
| ai-crawler-loglari-nasil-analiz-edilir        | body[6].items[3]  | kaynaksız               | Toplam AI bot trafiği toplam trafiğin %5-15'i ideal.                                                                                                                        |

## Uygulanan güvenli düzeltmeler

Slug değişmedi, yazı silinmedi, gövde yeniden yazılmadı; yalnızca eskimiş model adı / geçmişte kalmış vaat cümleleri güncellendi.

| Tarih      | Slug                                            | Dosya                                   | Önce                                                                         | Sonra                                                                                                            | Neden                                                       |
| ---------- | ----------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 2026-09-06 | chatgpt-markanizi-neden-onermiyor               | apps/web/src/data/blog-posts-batch-1.ts | GPT-4 örneğin Nisan 2023 kesimi ile çalışıyor olabilir.                      | GPT-5 ailesi örneğin kendi kesim tarihinden sonrasını doğrudan bilmez.                                           | Eski nesil model + 2023 eğitim kesimi bilgisi bayattı       |
| 2026-09-06 | llmler-markalari-hangi-kaynaklara-gore-oneriyor | apps/web/src/data/blog-posts-batch-1.ts | GPT-4 örneğin Nisan 2023 kesimi ile eğitilmiş olabilir; sonrası bilgisi yok. | GPT-5 ailesi örneğin kendi kesim tarihine kadarki veriyle eğitilmiştir; sonrasının bilgisi eğitim verisinde yok. | Eski nesil model + 2023 eğitim kesimi bilgisi bayattı       |
| 2026-09-06 | perplexity-seo-nedir                            | apps/web/src/data/blog-posts-batch-2.ts | Yol haritamızda Q2 2026 için Perplexity entegrasyonu var.                    | Yol haritamızda Perplexity entegrasyonu planlanıyor.                                                             | Q2 2026 geçti; Perplexity hâlâ yol haritasında (izlenmiyor) |

## Öneriler

- **İnce içerik (66 yazı):** yakın başlıklı olanları tek yazıda birleştirip eski slug'dan 301 verin; 150 kelime altı ve birleşmeyecekler için genişletme takvimi yoksa `robots: noindex` düşünün. Slug'lara dokunmayın.
- **Gövde-içi link (80 yazı):** `BlogBody`'ye bir `link` alanı ya da satır-içi `[metin](/yol)` desteği eklenmeden gövde içinden bağlamsal iç link verilemiyor. Bu şablon işi; içerik işi değil.
- **Kaynaksız iddialar (49 cümle):** yüzdeli iddialara kaynak adı + yıl ekleyin ya da "kendi panel verimize göre" diye netleştirin; link desteği gelince URL ekleyin.
- **Bayat yıl iddiaları (9):** "2025 itibarıyla … soruyor" gibi cümleleri "2025'ten bu yana" / "2026 itibarıyla" biçimine editör elden geçirsin.
- **Model adları:** yeni yazılarda sürümlü model adı yerine ürün adı (ChatGPT, Claude, Gemini) kullanın; sürüm gerekiyorsa güncel olanı yazın (GPT-5 / GPT-4o mini, Claude Haiku 4.5 / Sonnet 4.6, Gemini 2.5 Flash / Pro).
