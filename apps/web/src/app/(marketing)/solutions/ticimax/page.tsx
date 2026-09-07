import { SolutionPage } from '@/components/marketing/solution-page';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Ticimax için AI görünürlüğü — günlük katalog senkronu (beta)',
  description:
    'Ticimax mağazanı ürün web servisi ve üye kodunla bağla; katalog günde bir kez salt-okunur senkronlanır. AI hazırlık skoru ve ChatGPT/Claude/Gemini izleme soruları ile ürünlerinin AI asistanlarında nasıl göründüğünü ölç.',
  path: '/solutions/ticimax',
});

export default function TicimaxSolutionPage() {
  return (
    <SolutionPage
      config={{
        path: '/solutions/ticimax',
        name: 'Ticimax entegrasyonu',
        eyebrow: 'Çözüm · Ticimax',
        breadcrumb: 'Ticimax',
        badges: ['beta', 'günlük senkron', 'salt-okunur'],
        title: (
          <>
            Ticimax mağazan AI asistanlarında nasıl görünüyor — <span className="text-brand">ölç, düzelt, izle.</span>
          </>
        ),
        intro:
          'Ticimax ürün web servisine üye kodunla bağlan; katalog günde bir kez salt-okunur senkronlanır (Ticimax webhook sunmaz). AI hazırlık skoru ürün sayfalarındaki eksikleri gösterir, izleme soruları kategorindeki AI cevaplarını her gece ölçer.',
        setup: {
          title: 'Ticimax kurulumu — servis adresi ve üye kodu ile.',
          intro:
            'Ticimax entegrasyonu beta aşamasında. Ticimax ürün web servisine (SOAP, UrunServis) servis üye kodunuzla bağlanır; webhook olmadığı için katalog günde bir kez yenilenir.',
          steps: [
            {
              t: 'Üye kodunu al',
              d: 'Ticimax yönetim panelinizden web servis üye kodunuzu alın; servis erişiminin açık olduğundan emin olun.',
            },
            {
              t: 'Servis adresini belirle',
              d: 'Mağazanızın https servis kökü (örn. https://www.magaza.com). /Servis/UrunServis.svc yolunu biz ekleriz. Yalnızca herkese açık https adresleri kabul edilir; IP ve yerel ağ adresleri reddedilir.',
              code: 'https://www.magaza.com  →  https://www.magaza.com/Servis/UrunServis.svc',
            },
            {
              t: 'Panelde bağla',
              d: 'Entegrasyonlar → Mağaza bağla → Ticimax → alan adı, servis adresi ve üye kodunu girin → "Doğrula ve bağla".',
            },
            {
              t: 'Günlük senkron',
              d: 'İlk senkron hemen kuyruğa alınır; sonrasında her gün otomatik çalışır. İstediğinizde bağlantı kartından "Şimdi senkronla" ile tetikleyin.',
            },
          ],
          notes: [
            'Webhook yok: mağazadaki ürün değişiklikleri en geç bir sonraki günlük senkronda yansır.',
            'Üye kodu AES-256-GCM ile şifreli saklanır; bağlantıyı kestiğinizde silinir.',
            'Servis yanıt vermezse veya üye kodu reddedilirse bağlantı "Hata" durumuna düşer; neden kartta görünür.',
          ],
        },
        syncMode: 'Günlük senkron (webhook yok); "Şimdi senkronla" ile anında tetikleme',
        faqs: [
          {
            question: 'Neden günlük senkron, canlı değil?',
            answer:
              'Ticimax ürün olayları için webhook sunmuyor; katalog SOAP servisinden sayfalı olarak çekilir. Bu yüzden günde bir kez otomatik senkron yaparız; panelden istediğiniz an "Şimdi senkronla" ile tetikleyebilirsiniz.',
          },
          {
            question: 'Servis adresi nedir, nereden bulurum?',
            answer:
              'Mağazanızın web servis kökü, genellikle mağaza alan adınızla aynıdır (https://www.magaza.com). Ürün servisi yolu /Servis/UrunServis.svc biz tarafından eklenir. Emin değilseniz Ticimax destek ekibinize "web servis adresi ve üye kodu" diye sorabilirsiniz.',
          },
          {
            question: 'Hangi verileri okuyorsunuz?',
            answer:
              'Yalnızca ürün ve kategori verisi: ürün adı, açıklama, fiyat, stok durumu, görsel, kategori, SEO alanları. Sipariş, müşteri ve ödeme servisleri hiç çağrılmaz; erişim salt-okunurdur.',
          },
          {
            question: 'Üye kodum güvende mi?',
            answer:
              'Üye kodu AES-256-GCM ile şifreli saklanır, panelde ve loglarda görünmez, yalnızca senkron sırasında sunucu belleğinde çözülür. Bağlantıyı kestiğinizde silinir.',
          },
        ],
        cta: {
          title: (
            <>
              Ticimax kataloğunu bağla, <span className="text-brand">AI’da nasıl göründüğünü gör.</span>
            </>
          ),
          body: 'Servis üye kodu ile salt-okunur bağlantı, günlük senkron, dürüst hazırlık skoru. Kredi kartı yok.',
        },
      }}
    />
  );
}
