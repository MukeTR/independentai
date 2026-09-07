# Ticimax entegrasyonu

Independent AI, Ticimax mağazanızın **ürün ve kategori** kataloğunu Ticimax Web Servisi (SOAP) üzerinden
salt-okunur çeker. Sipariş, üye ve ödeme servisleri **hiçbir zaman** çağrılmaz.

## Kurulum (mağaza sahibi)

1. Ticimax yönetim paneli → **Ayarlar → Entegrasyonlar / Web Servis** bölümünden web servis **üye
   kodunu (UyeKodu)** alın. (Menü adı sürüme göre değişebilir; Ticimax destek ekibi üye kodunu
   etkinleştirebilir.)
2. Servis adresiniz mağaza alan adınızdır: `https://www.magazaniz.com` (servis
   `https://www.magazaniz.com/Servis/UrunServis.svc` yolunda çalışır; WSDL `?wsdl` ile görülebilir).
3. Independent AI → **Entegrasyonlar → Ticimax → Bağla**: mağaza alan adını, ardından servis adresini
   ve üye kodunu girin. `.../Servis/UrunServis.svc?wsdl` gibi tam adres yapıştırırsanız kök otomatik
   çıkarılır.
4. Bağlantı `SelectUrunCount` ile doğrulanır; ilk katalog senkronu kuyruğa alınır.

Üye kodu sunucuda **AES-256-GCM ile şifreli** saklanır; API yanıtlarında, loglarda ve Realtime
olaylarında asla görünmez. Bağlantı "Kes" denince silinir.

## Teknik akış

- **Protokol:** SOAP 1.1 (WCF basicHttpBinding), `Content-Type: text/xml; charset=utf-8`,
  `SOAPAction: "http://tempuri.org/IUrunServis/<Metot>"`. Zarf elle kurulur; tüm değerler XML
  kaçışlanır (XML injection yok). Yanıt `fast-xml-parser` ile çözümlenir; DOCTYPE içeren yanıtlar
  reddedilir.
- **Metotlar:** `SelectUrunCount(UyeKodu, f)`, `SelectUrun(UyeKodu, f, s)`,
  `SelectKategori(UyeKodu, kategoriID=0)`, `SelectMarka(UyeKodu, markaID=0)`.
- **Filtre (`UrunFiltre`):** `Aktif=1` (yalnızca aktif ürünler), `Firsat/Indirimli/Vitrin=-1` (filtre
  yok), `KategoriID/MarkaID/UrunKartiID=0`.
- **Sayfalama (`UrunSayfalama`):** `BaslangicIndex`, `KayitSayisi` (≤100), `KayitSayisinaGoreGetir=true`,
  `SiralamaDegeri="ID"`, `SiralamaYonu="ASC"`. İmleç = `baslangicIndex:kayitSayisi`.
- **Gövde sınırı:** yanıt 5 MB'ı aşarsa istek kesilir ve sayfa boyutu otomatik yarıya iner (en az 5);
  böylece çok büyük ürün kartları olan mağazalarda senkron takılmaz.
- **SSRF:** servis adresi `parsePublicUrl` ile doğrulanır (yalnızca https, 443, public host; DNS
  çözümü de özel/dahili adres olamaz).

## Veri kapsamı ve normalizasyon

| Katalog alanı     | Ticimax kaynağı                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Başlık / açıklama | `UrunAdi`, `Aciklama` (HTML → düz metin; yoksa `OnYazi`)                                         |
| Marka             | `Marka`                                                                                          |
| Kategoriler       | `Kategoriler` (id) → `SelectKategori` ile ad eşlemesi (15 dk önbellek); ayrıca `AnaKategori`     |
| Fiyat             | Aktif varyantların `IndirimliFiyati` (>0 ve daha düşükse) yoksa `SatisFiyati`; min/max           |
| Para birimi       | Varyasyon `ParaBirimiKodu` (örn. `TRY`); ID→kod varsayımı yapılmaz, kod yoksa boş                |
| Stok              | Varyant `StokAdedi` toplamı (>0 stokta), yoksa `ToplamStokAdedi`                                 |
| Görsel            | `Resimler[0]` (yoksa ilk varyantın `Resimler[0]`); göreli yol mağaza alan adıyla tamamlanır      |
| SEO               | `SeoSayfaBaslik`, `SeoSayfaAciklama`; `SeoAnahtarKelime` → facts.keywords                        |
| Tanımlayıcılar    | İlk aktif varyant `StokKodu` (sku), `Barkod`, varyant sayısı                                     |
| Ürün URL'si       | `UrunSayfaAdresi` (varsa)                                                                        |
| Facts             | Varyant seçenekleri (`Ozellikler` → "Renk: Mavi, Kırmızı; Beden: S, M"), ücretsiz kargo, ağırlık |

`UrunKarti` içinde ürün güncelleme tarihi alanı yoktur; `sourceUpdatedAt` null'dur, değişiklik tespiti
içerik hash'i ile yapılır.

## Sınırlamalar

- **Webhook yok.** Ticimax olay bildirimi sağlamaz; katalog **günlük** cron senkronuyla güncellenir
  (`enqueueDailyCatalogSyncs`). Manuel "Şimdi senkronla" her zaman kullanılabilir.
- Artımlı senkron kapalıdır (`incremental:false`); her senkron tam listeyi gezer ve görünmeyen ürünleri
  soft-delete eder. (WSDL'de `DuzenlemeTarihiBaslangic` filtresi bulunuyor; ileride artımlı senkron için
  değerlendirilebilir.)
- Yalnızca aktif ürünler çekilir (`Aktif=1`); pasife alınan ürün bir sonraki senkronda silinmiş sayılır.
- Kategori adları alınamazsa (SelectKategori kapalı) yalnızca `AnaKategori` adı kullanılır.

## Yetenek keşfi

`verify` sırasında: `SelectUrunCount` başarılı → kimlik geçerli (`productCount`); `SelectKategori`
denemesi → `categories` açık/kapalı; `SelectMarka` denemesi → `brands`. Sonuçlar
`StoreConnection.capabilities.discovered` içine (`{ SelectUrunCount, SelectUrun, SelectKategori, SelectMarka }`)
yazılır ve arayüz buna göre "kategori eşlemesi kullanılamıyor" gibi durumları gösterebilir.

## Hata kodları (kullanıcıya dönen)

`AUTH_INVALID` (servis `Fault: "Hatalı Kullanıcı Kodu"` döndürdü → üye kodu yanlış), `INVALID_STORE`
(servis adresi https değil / dahili adres / `UrunServis.svc` 404), `UPSTREAM_ERROR` (diğer SOAP
Fault'ları, 5xx, 5 MB üstü yanıt), `NETWORK` (zaman aşımı/DNS), `RATE_LIMITED` (429).
