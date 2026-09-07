import { SolutionPage } from '@/components/marketing/solution-page';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'ikas için AI görünürlüğü — salt-okunur katalog bağlantısı (beta)',
  description:
    'ikas mağazanı Client ID / Client Secret ile bağla; ürün kataloğun salt-okunur senkronlanır. AI hazırlık skoru ve ChatGPT/Claude/Gemini izleme soruları ile ürünlerinin AI asistanlarında nasıl göründüğünü ölç.',
  path: '/solutions/ikas',
});

export default function IkasSolutionPage() {
  return (
    <SolutionPage
      config={{
        path: '/solutions/ikas',
        name: 'ikas entegrasyonu',
        eyebrow: 'Çözüm · ikas',
        breadcrumb: 'ikas',
        badges: ['beta', 'Client ID / Secret', 'salt-okunur'],
        title: (
          <>
            ikas mağazan AI asistanlarında nasıl görünüyor — <span className="text-brand">ölç, düzelt, izle.</span>
          </>
        ),
        intro:
          'ikas yönetim panelinde oluşturduğun özel uygulamanın Client ID ve Client Secret bilgileriyle bağlan; ürün kataloğun salt-okunur senkronlanır. AI hazırlık skoru ürün sayfalarındaki eksikleri gösterir, izleme soruları kategorindeki AI cevaplarını her gece ölçer.',
        setup: {
          title: 'ikas kurulumu — Client ID / Client Secret ile.',
          intro:
            'ikas entegrasyonu beta aşamasında. ikas Admin API’sine, panelinizde oluşturduğunuz özel uygulamanın kimlik bilgileriyle (client_credentials) bağlanır; erişim token’ı sunucuda otomatik yenilenir.',
          steps: [
            {
              t: 'Özel uygulama oluştur',
              d: 'ikas yönetim panelinde API erişimi için bir özel uygulama oluşturun; ürün okuma izni yeterlidir. Client ID ve Client Secret değerlerini not alın.',
            },
            {
              t: 'Panelde bağla',
              d: 'Entegrasyonlar → Mağaza bağla → ikas → mağaza adresinizi (magaza.myikas.com biçiminde) girin → Client ID ve Client Secret’ı yazın.',
            },
            {
              t: 'Doğrulama',
              d: 'Kimlik bilgileri ikas’ta doğrulanır. Geçersizse bağlantı "Hata" durumuna düşer ve nedeni kartta görünür; bilgileri düzelterek yeniden bağlanabilirsiniz.',
            },
            {
              t: 'Senkron ve güncelleme',
              d: 'İlk katalog senkronu hemen kuyruğa alınır. Ürün değişiklikleri için ikas webhook kaydı denenir; kayıt yapılamazsa katalog günde bir kez senkronlanır.',
            },
          ],
          notes: [
            'Client Secret yalnızca bağlantı sırasında iletilir; AES-256-GCM ile şifreli saklanır ve bir daha gösterilmez.',
            'Kısa ömürlü erişim token’ı (yaklaşık 4 saat) sunucuda otomatik yenilenir; Client Secret’ı değiştirirseniz yeniden bağlanın.',
            'Webhook teslimatları imza ile doğrulanır; tekrar eden teslimatlar bir kez işlenir.',
          ],
        },
        syncMode: 'Webhook ile güncelleme (kayıt başarılıysa) + günlük yedek senkron',
        faqs: [
          {
            question: 'Bağlanmak için hangi bilgiler gerekli?',
            answer:
              'Mağaza alan adınız ve ikas panelinde oluşturduğunuz özel uygulamanın Client ID / Client Secret değerleri. Ürün okuma izni yeterlidir.',
          },
          {
            question: 'Erişim token’ının süresi dolunca ne olur?',
            answer:
              'ikas erişim token’ları kısa ömürlüdür; sunucu süresi dolmadan Client ID/Secret ile yenisini alır. Client Secret iptal edilirse bağlantı "Hata" durumuna düşer ve panelde yeniden bağlanmanız istenir.',
          },
          {
            question: 'Webhook destekleniyor mu?',
            answer:
              'Ürün olayları için webhook kaydı bağlantı sırasında denenir. Başarılıysa değişiklikler kısa sürede yansır; değilse katalog günde bir kez senkronlanır ve "Şimdi senkronla" her zaman kullanılabilir.',
          },
          {
            question: 'Sipariş veya müşteri verisi okunur mu?',
            answer:
              'Hayır. Yalnızca ürün, kategori ve mağaza meta verisi. Sipariş, müşteri ve ödeme verisi istenmez; erişim salt-okunurdur.',
          },
        ],
        cta: {
          title: (
            <>
              ikas kataloğunu bağla, <span className="text-brand">AI’da nasıl göründüğünü gör.</span>
            </>
          ),
          body: 'Client ID/Secret ile salt-okunur bağlantı, şifreli saklama, dürüst hazırlık skoru. Kredi kartı yok.',
        },
      }}
    />
  );
}
