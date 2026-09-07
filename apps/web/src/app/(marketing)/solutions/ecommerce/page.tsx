import { SolutionPage } from '@/components/marketing/solution-page';
import { buildMetadata } from '@/lib/seo';
import { LAUNCH_OFFER } from '@independentai/shared';

const fair = LAUNCH_OFFER.fairUse;

export const metadata = buildMetadata({
  title: 'E-ticaret için AI görünürlüğü — mağazanı bağla, ürünlerini ölç',
  description:
    'Shopify, ikas veya Ticimax mağazanı bağla; ürün kataloğun salt-okunur senkronlanır, AI hazırlık skoru ve ChatGPT/Claude/Gemini izleme soruları ile ürünlerinin AI asistanlarında nasıl göründüğünü ölç.',
  path: '/solutions/ecommerce',
});

export default function EcommerceSolutionPage() {
  return (
    <SolutionPage
      config={{
        path: '/solutions/ecommerce',
        name: 'E-ticaret entegrasyonları',
        eyebrow: 'Çözüm · E-ticaret',
        breadcrumb: 'E-ticaret',
        badges: ['beta', 'salt-okunur katalog'],
        title: (
          <>
            AI asistanlarında mağazan ve ürünlerin nasıl görünüyor —{' '}
            <span className="text-brand">ölç, düzelt, izle.</span>
          </>
        ),
        intro:
          'Alışveriş soruları artık önce ChatGPT, Claude ve Gemini’ye soruluyor. Mağazanı bağla; ürün kataloğunu salt-okunur senkronlayıp AI hazırlık skorunu çıkaralım, kategorindeki soruları her gece izleyelim ve neyi düzelteceğini söyleyelim. Sipariş, müşteri ve ödeme verisine dokunmayız.',
        setup: null,
        syncMode: 'Shopify ve ikas: webhook ile canlı güncelleme + günlük yedek senkron · Ticimax: günlük senkron',
        faqs: [
          {
            question: 'Hangi e-ticaret platformlarını destekliyorsunuz?',
            answer:
              'Shopify, ikas ve Ticimax — üçü de beta aşamasında. Başka bir altyapı kullanıyorsanız mağaza bağlamadan ücretsiz araçları (e-ticaret AI görünürlük testi, ürün sayfası testi, AI crawler testi) kullanabilirsiniz; bağlama sihirbazındaki "platformumu bilmiyorum" adımı herkese açık sayfanızdan altyapınızı tespit eder.',
          },
          {
            question: 'Sipariş veya müşteri verisi çekiyor musunuz?',
            answer:
              'Hayır. İlk sürüm yalnızca ürün, kategori ve mağaza meta verisini okur: ürün adı, açıklama, fiyat aralığı, stok durumu, görsel, kategori, SEO alanları. Sipariş, sepet, müşteri, adres ve ödeme verisi hiçbir zaman istenmez; bağlantı izinleri de buna göre sınırlıdır.',
          },
          {
            question: 'Mağazama bir şey yazar mısınız?',
            answer:
              'Hayır. Erişim salt-okunurdur; ürünlerinizi, fiyatlarınızı veya ayarlarınızı değiştirmeyiz. Düzeltme önerilerini siz uygularsınız.',
          },
          {
            question: 'Bağlantıyı kesersem ya da silersem ne olur?',
            answer:
              '"Bağlantıyı kes" saklanan kimlik bilgisini siler, senkronu durdurur ve katalogu arşivler (yeniden bağlanınca geri gelir). "Sil" bağlantıyı ve senkronlanan tüm katalog verisini kalıcı olarak kaldırır. Mağazanızdaki veriye dokunulmaz.',
          },
          {
            question: 'Ücreti nedir?',
            answer: `Lansman döneminde ücretsiz. Adil kullanım sınırları: hesap başına ${fair.storeConnections} mağaza bağlantısı, bağlantı başına ${fair.catalogProducts.toLocaleString('tr-TR')} ürün. Ücretli planlar ve fiyatlar henüz duyurulmadı.`,
          },
          {
            question: 'AI görünürlüğünü nasıl ölçüyorsunuz?',
            answer:
              'İzleme sorularınızı her gece ChatGPT, Claude ve Gemini’de çalıştırıp markanızın ve ürünlerinizin geçme oranını, sırasını ve tonunu kaydederiz. Mağaza tarafında ise katalogunuzdan AI hazırlık skoru ve düzeltme bulguları üretiriz. Hiçbir AI sağlayıcısıyla ticari ilişkimiz yok; sonuçlar olduğu gibi gösterilir.',
          },
        ],
        cta: {
          title: (
            <>
              Ürünlerin AI’da görünsün: <span className="text-brand">önce ölç.</span>
            </>
          ),
          body: 'Kayıt ol, mağazanı bağla veya önce ücretsiz testi çalıştır. Kredi kartı yok; salt-okunur erişim.',
        },
      }}
    />
  );
}
