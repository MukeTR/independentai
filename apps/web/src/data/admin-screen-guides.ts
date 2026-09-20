/**
 * Admin ekran rehberleri — "Bu ekran ne işe yarar?" düğmesinin içeriği (Kârmatik screen-guides deseni).
 * Eşleşme: yol, `prefix` ile başlıyorsa; en uzun prefix kazanır. Yeni admin ekranı = yeni kayıt.
 * Yalnız metin; kod/veri içermez. Satıcının ve operatörün ekranı 30 saniyede anlatabilmesi için yazıldı.
 */

export type AdminGuideStep = { title: string; body: string };
export type AdminGuideTerm = { term: string; def: string };
export type AdminScreenGuide = {
  prefix: string;
  title: string;
  intro: string;
  steps: AdminGuideStep[];
  terms?: AdminGuideTerm[];
};

export const ADMIN_SCREEN_GUIDES: AdminScreenGuide[] = [
  {
    prefix: '/admin',
    title: 'Genel bakış ne işe yarar?',
    intro:
      'Platformun günlük nabzı: ücretsiz araç taramaları, yeni lead’ler, ajans adayları ve deneme süresi biten hesaplar tek şeritte. Her kutu tıklanabilir; ilgili filtreli listeye götürür.',
    steps: [
      {
        title: '1 · Şeridi oku',
        body: 'Bugün/7 gün tarama, yeni lead, dönüşüm (iletişim formu / tarama), ajans adayı, aktif duyuru, yasaklı site isabeti, 7 gün içinde biten deneme.',
      },
      {
        title: '2 · Kutuya tıkla',
        body: 'Örneğin “Yeni lead” → /admin/leads?status=NEW; “Deneme biten” → /admin/tenants?trial=7d.',
      },
      {
        title: '3 · Sparkline’a bak',
        body: 'Tarama kutusundaki çizgi son 14 günün günlük tarama sayısıdır (TSİ gün sınırı).',
      },
      {
        title: '4 · Platform sayıları',
        body: 'Alt bölüm tenant/kullanıcı/soru/çalıştırma ve AI maliyetidir; cron durumu Sistem ekranında.',
      },
    ],
    terms: [
      {
        term: 'Public tarama',
        def: 'Hesap gerektirmeyen /arac/* araçlarıyla yapılan tarama; 30 gün saklanır, ham IP tutulmaz.',
      },
      { term: 'Dönüşüm', def: 'Son 7 günde iletişim formu dolduran lead sayısı / son 7 gündeki tarama sayısı.' },
    ],
  },
  {
    prefix: '/admin/leads',
    title: 'Lead’ler ekranı ne işe yarar?',
    intro:
      'Ücretsiz araçları kullanan siteler (yalnız alan adı + skor) ve iletişim formunu dolduranlar (KVKK onaylı iletişim bilgisi) tek CRM listesinde. Satış takibi burada yapılır; lead verisi hiçbir yapay zekâ servisine gitmez.',
    steps: [
      {
        title: '1 · Kaynağı seç',
        body: 'Araç · İletişim · Kayıt sekmeleri; her sekmede aşama hapları (Yeni → İletişime geçildi → Nitelikli → Kazanıldı / Kaybedildi) sayılıdır.',
      },
      {
        title: '2 · Ara',
        body: 'Alan adı, e-posta ya da şirket adıyla arayın. Arama URL’ye yazılır; bağlantıyı paylaşabilirsiniz.',
      },
      {
        title: '3 · Aksiyon ver',
        body: '“Arandı”, “Mail atıldı”, “Teklif iletildi”, “Kazanıldı”, “Kaybedildi” düğmeleri durumu değiştirir ve aktivite günlüğüne yazar. Not ekleyin, sahip atayın.',
      },
      {
        title: '4 · E-postayı göster',
        body: 'E-posta maskeli gelir (a***@site.com). “Göster” tıklaması denetim kaydına düşer.',
      },
      {
        title: '5 · Raporu aç / CSV',
        body: 'Lead’in son taramasının kalıcı raporunu açın; listeyi CSV olarak indirin (e-posta yalnız onaylı satırlarda).',
      },
      {
        title: '6 · Sil',
        body: 'KVKK silme talebi için “Sil” — alan adını/e-postayı yazarak onaylanır, denetim kaydı tutulur.',
      },
    ],
    terms: [
      {
        term: 'Aşama',
        def: 'NEW yeni · CONTACTED iletişime geçildi · QUALIFIED nitelikli (teklif) · WON kazanıldı · LOST kaybedildi.',
      },
      {
        term: 'consentAt',
        def: 'KVKK aydınlatma onayı tarihi; iletişim bilgisi yalnız bu dolu olduğunda saklanır ve dışa aktarılır.',
      },
      { term: 'İYS', def: 'Ticari elektronik ileti izni — ayrı kutu; işaretsizse pazarlama e-postası gönderilmez.' },
    ],
  },
  {
    prefix: '/admin/scans',
    title: 'Taramalar ekranı ne işe yarar?',
    intro:
      'Ücretsiz araç kullanımının haritası: hangi araç ne kadar kullanılıyor, hangi siteler tekrar tekrar taranıyor, hangi sektörler ilgi görüyor, kaç tarama yarım kaldı ya da bot korumasına takıldı.',
    steps: [
      {
        title: '1 · Araç × gün',
        body: 'Son 14 günde araç türüne göre günlük tarama sayısı. Boş hücre = o gün o araç kullanılmadı.',
      },
      {
        title: '2 · En çok taranan siteler',
        body: 'Aynı siteyi çok tarayan biri ya ilgili ya da ajans; “Lead’e git” ile takibe alın.',
      },
      {
        title: '3 · Yarım / WAF oranı',
        body: 'Bütçe dolduğunda tarama “yarım” işaretlenir; Cloudflare vb. bot koruması “WAF” sayılır. Yüksek oran motor ayarı gerektirir.',
      },
      {
        title: '4 · Satır aksiyonları',
        body: '“Raporu aç” kalıcı raporu yeni sekmede açar; “Lead’e git” lead listesini alan adıyla filtreler; “Yasakla” yasaklı site formunu alan adıyla ön-doldurur.',
      },
    ],
    terms: [
      { term: 'Yarım (partial)', def: 'İstek/bayt/süre bütçesi dolduğu için tüm kontroller yapılamadı; skor kısmi.' },
      { term: 'WAF', def: 'Web uygulama güvenlik duvarı; tarayıcıyı bot sanıp 403/503 döndürdü — skor verilmez.' },
    ],
  },
  {
    prefix: '/admin/users',
    title: 'Kullanıcılar ekranı ne işe yarar?',
    intro:
      'Tüm hesap kullanıcıları, şirketleri ve deneme durumları. Şifre özeti dahil hiçbir gizli alan bu ekrana gelmez.',
    steps: [
      { title: '1 · Ara', body: 'E-posta ya da şirket adıyla arayın (İ/ı duyarsız).' },
      {
        title: '2 · Rozeti oku',
        body: 'Aktif = ücretli plan · Deneme = LAUNCH ve süre içinde · Süresi doldu = ek süre de bitti (hesap salt-okunur).',
      },
      {
        title: '3 · İşlemler',
        body: '“İşlemler” menüsünden şirket detayına gidin ya da hediye süre tanımlayın (şirket sayfasındaki diyalog).',
      },
      { title: '4 · Sayfala', body: 'Liste 50’şer gelir; “Sonraki sayfa” imleçle ilerler.' },
    ],
  },
  {
    prefix: '/admin/tenants',
    title: 'Şirketler (tenant) ekranı ne işe yarar?',
    intro: 'Her kayıtlı şirket bir tenant’tır. Buradan plan atanır, deneme süresi uzatılır, hediye süre tanımlanır.',
    steps: [
      {
        title: '1 · Filtrele',
        body: '“Deneme 7 gün içinde bitiyor” filtresi genel bakıştaki kutudan gelir; arama ad/web sitesiyle.',
      },
      { title: '2 · Detaya gir', body: 'Kullanıcılar, marka/rakipler, sorular ve plan formu.' },
      {
        title: '3 · Hediye süre',
        body: '7/14/30/90/365 gün ön ayarları deneme bitişini ileri alır; işlem denetim kaydına düşer.',
      },
      {
        title: '4 · Ücretli müşteri',
        body: 'Sözleşme elle yapıldıysa planı STARTER/GROWTH yapın; süreden bağımsız aktif olur.',
      },
    ],
    terms: [
      { term: 'Ek süre (grace)', def: 'Deneme bitince 7 gün daha yazma açık kalır; sonra salt-okunur, veri silinmez.' },
    ],
  },
  {
    prefix: '/admin/announcements',
    title: 'Duyurular ekranı ne işe yarar?',
    intro:
      'Ana sayfa, fiyatlandırma, araç sayfaları ve panelin üstünde görünen tek satırlık şerit. Kampanya, bakım uyarısı ya da yeni özellik duyurusu için.',
    steps: [
      {
        title: '1 · Yeni duyuru',
        body: 'Metin (≤300), ton (Bilgi / Kampanya / Uyarı), yerleşim, isteğe bağlı bağlantı + düğme etiketi, tarih aralığı.',
      },
      { title: '2 · Önizle', body: 'Form altındaki önizleme şeridin sitede görüneceği hâlidir.' },
      {
        title: '3 · Yayınla / kapat',
        body: '“Yayında” anahtarı anında etkili. Aynı yerleşimde en çok 3 duyuru üst üste gösterilir (en yeni üstte).',
      },
      {
        title: '4 · Kapatma davranışı',
        body: 'Ziyaretçi şeridi kapatınca tarayıcısında hatırlanır. Metni/bağlantıyı değiştirmek şeridi herkese yeniden gösterir; aç/kapa göstermez.',
      },
    ],
  },
  {
    prefix: '/admin/runs',
    title: 'Run kayıtları ne işe yarar?',
    intro:
      'Son model çalıştırmaları (tüm şirketler): sağlayıcı, gecikme, token ve mock durumu. Maliyet ve hata avı için.',
    steps: [
      {
        title: '1 · Mock rozeti',
        body: 'Mock = gerçek AI çağrısı yapılmadı (anahtar yok ya da test modu). Üretimde görünmemeli.',
      },
      {
        title: '2 · Gecikme',
        body: 'Sürekli yüksek gecikme sağlayıcı sorunudur; Sistem ekranındaki sağlık kutusuna bakın.',
      },
    ],
  },
  {
    prefix: '/admin/system',
    title: 'Sistem ekranı ne işe yarar?',
    intro:
      'Sağlayıcı anahtarları, cron kuyruğu, bildirim teslimatı ve teklif/fiyat ayarları. Değişiklikler anında etkilidir.',
    steps: [
      { title: '1 · Kuyruk', body: '“Bekleyen” sıfıra inmiyorsa manuel tur düğmesi kalanı işler.' },
      {
        title: '2 · Bildirimler',
        body: 'E-posta sağlayıcısı yoksa teslimatlar “skipped” görünür; iletişim formu lead’i yine kaydedilir.',
      },
      { title: '3 · Teklif', body: 'Deneme günü ve fiyatlar burada; site metinleri bu değerleri okur.' },
    ],
  },
  {
    prefix: '/admin/blocked-sites',
    title: 'Yasaklı siteler ne işe yarar?',
    intro:
      'Listedeki alan adları hiçbir araçla taranmaz; ziyaretçi belirlenen YouTube bağlantısına yönlendirilir. Alt alan adları da kapsanır.',
    steps: [
      { title: '1 · Ekle', body: 'Alan adı (www’siz) + yalnız youtube.com / youtu.be https bağlantısı.' },
      { title: '2 · İsabet', body: 'Her engellenen tarama isabet sayacını artırır; genel bakışta toplam görünür.' },
    ],
  },
  {
    prefix: '/admin/agency-candidates',
    title: 'Ajans adayları ne işe yarar?',
    intro:
      'Birden çok siteyi tarayan ziyaretçiler ve ajans sinyali veren hesaplar (skor ≥50). Ortaklık programı için satış listesi.',
    steps: [
      {
        title: '1 · Nedenleri oku',
        body: 'Farklı site sayısı, sektör çeşitliliği, e-posta anahtar kelimesi, rakip sayısı gibi kanıt çipleri.',
      },
      { title: '2 · Aksiyon', body: 'İletişime geç · Dönüştü · Yoksay; “Ben ajansım” diyenler DECLARED olarak gelir.' },
    ],
  },
];

/** En uzun prefix eşleşmesi; yoksa null. */
export function adminGuideForPath(path: string): AdminScreenGuide | null {
  const p = path.split('?')[0] ?? '';
  let best: AdminScreenGuide | null = null;
  for (const g of ADMIN_SCREEN_GUIDES) {
    if (p === g.prefix || p.startsWith(`${g.prefix}/`)) {
      if (!best || g.prefix.length > best.prefix.length) best = g;
    }
  }
  return best;
}
