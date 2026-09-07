import { SolutionPage } from '@/components/marketing/solution-page';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Shopify için AI görünürlüğü — salt-okunur katalog bağlantısı (beta)',
  description:
    'Shopify mağazanı OAuth ile bağla (yalnızca read_products). Ürün kataloğun webhook ile güncel kalır; AI hazırlık skoru ve ChatGPT/Claude/Gemini izleme soruları ile ürünlerinin AI asistanlarında nasıl göründüğünü ölç.',
  path: '/solutions/shopify',
});

export default function ShopifySolutionPage() {
  return (
    <SolutionPage
      config={{
        path: '/solutions/shopify',
        name: 'Shopify entegrasyonu',
        eyebrow: 'Çözüm · Shopify',
        breadcrumb: 'Shopify',
        badges: ['beta', 'OAuth', 'read_products'],
        title: (
          <>
            Shopify mağazan AI asistanlarında nasıl görünüyor — <span className="text-brand">ölç, düzelt, izle.</span>
          </>
        ),
        intro:
          'Shopify mağazanı OAuth ile bağla; yalnızca salt-okunur ürün izni isteriz. Katalog webhook’larla dakikalar içinde güncel kalır, AI hazırlık skoru ürün sayfalarındaki eksikleri gösterir, izleme soruları kategorindeki AI cevaplarını her gece ölçer.',
        setup: {
          title: 'Shopify kurulumu — özel uygulama ile.',
          intro:
            'Shopify entegrasyonu beta aşamasında ve Shopify App Store’da listelenmiyor. Kurulum, Partner hesabında tanımlı özel bir uygulama üzerinden standart OAuth (authorization code) akışıyla yapılır.',
          steps: [
            {
              t: 'Özel uygulama tanımı',
              d: 'Shopify Partner Dashboard’da (veya mağaza yöneticisinde Ayarlar → Uygulamalar → Uygulama geliştir) bir uygulama oluşturun. İzinli yönlendirme adresi olarak aşağıdaki geri çağrı adresini ekleyin.',
              code: 'https://independentai.space/api/integrations/shopify/callback',
            },
            {
              t: 'İzin kapsamı',
              d: 'Yalnızca read_products. Sipariş, müşteri veya ödeme izni istenmez; onay ekranında farklı bir kapsam görürseniz kurulumu durdurun ve bize yazın.',
              code: 'read_products',
            },
            {
              t: 'Panelde bağla',
              d: 'Entegrasyonlar → Mağaza bağla → Shopify → magaza.myshopify.com adresinizi girin → Shopify’a yönlendirilirsiniz ve izinleri onaylarsınız.',
            },
            {
              t: 'Doğrulama ve ilk senkron',
              d: 'Geri döndüğünüzde bağlantı doğrulanır, ilk katalog senkronu kuyruğa alınır; ilerlemeyi bağlantı kartındaki çubuktan izlersiniz.',
            },
            {
              t: 'Canlı güncelleme',
              d: 'products/create, products/update, products/delete ve app/uninstalled webhook’ları otomatik kaydedilir. Kayıt başarısız olursa günlük senkron devreye girer; uygulama Shopify’dan kaldırılınca bağlantı kesilir.',
            },
          ],
          notes: [
            'Panelde "Sunucuda yapılandırılmamış" görüyorsanız Shopify uygulama anahtarları henüz tanımlı değildir; kurulum için bize yazın.',
            'Webhook teslimatları HMAC-SHA256 imzasıyla doğrulanır; imzasız veya tekrar eden teslimatlar işlenmez.',
            'Süreli (expiring) çevrimdışı token kullanılıyorsa yenileme sunucuda otomatik yapılır; yenilenemezse bağlantı "Hata" durumuna düşer ve kartta yeniden bağlanma önerilir.',
          ],
        },
        syncMode: 'Webhook ile canlı güncelleme + günlük yedek senkron (webhook kaydı başarısızsa yalnızca günlük)',
        faqs: [
          {
            question: 'Uygulamanız Shopify App Store’da mı?',
            answer:
              'Henüz değil. Entegrasyon beta aşamasında; kurulum Partner hesabında tanımlı özel (custom) uygulama üzerinden OAuth ile yapılır. App Store listesi için başvuru planlanıyor, tarih vermiyoruz.',
          },
          {
            question: 'Hangi izinleri istiyorsunuz?',
            answer:
              'Yalnızca read_products (salt-okunur ürün ve koleksiyon verisi). Sipariş, müşteri, ödeme veya yazma izni istenmez.',
          },
          {
            question: 'Ürün değişiklikleri ne kadar hızlı yansır?',
            answer:
              'Webhook kaydı başarılıysa ürün oluşturma/güncelleme/silme olayları dakikalar içinde işlenir. Webhook yoksa katalog günde bir kez senkronlanır; panelden "Şimdi senkronla" ile anında tetikleyebilirsiniz.',
          },
          {
            question: 'Birden fazla Shopify mağazam var; hepsini bağlayabilir miyim?',
            answer:
              'Her mağaza ayrı bir bağlantıdır. Lansman adil kullanımında hesap başına 2 mağaza bağlantısı vardır; daha fazlası için bize yazın.',
          },
          {
            question: 'Özel alan adımı mı, myshopify adresimi mi gireceğim?',
            answer:
              'Yönetim panelindeki magaza.myshopify.com adresini. Ürün bağlantıları için mağazanızın birincil alan adı senkron sırasında otomatik alınır.',
          },
        ],
        cta: {
          title: (
            <>
              Shopify kataloğunu bağla, <span className="text-brand">AI’da nasıl göründüğünü gör.</span>
            </>
          ),
          body: 'Salt-okunur OAuth izni, webhook ile güncel katalog, dürüst hazırlık skoru. Kredi kartı yok.',
        },
      }}
    />
  );
}
