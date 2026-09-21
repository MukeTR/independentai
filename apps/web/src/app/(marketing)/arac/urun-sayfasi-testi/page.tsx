import { Suspense } from 'react';
import { buildMetadata } from '@/lib/seo';
import { CommerceToolPage } from '@/components/marketing/commerce-tool-page';
import { ProductPageTool } from '@/components/marketing/product-page-tool';
import { PRODUCT_PAGE_AXES } from '@/server/commerce/product-page-audit';

const PATH = '/arac/urun-sayfasi-testi';

export const metadata = buildMetadata({
  title: 'Ürün Sayfası Testi — Ürününüz AI cevaplarında doğru okunuyor mu?',
  description:
    'Bir ürün sayfası adresi girin; Product JSON-LD alanlarını, açıklama özgünlüğünü, görsel alt metinlerini, SSS/özellik tablosunu ve AI cevap uyumunu puanlayalım. Ücretsiz, kayıt gerekmez.',
  path: PATH,
});

const FAQ = [
  {
    question: 'Hangi Product şeması alanları zorunlu sayılıyor?',
    answer:
      'name, image, description ve offers (price + priceCurrency + availability) çekirdek alanlardır; brand, sku/gtin ve offers.url ikinci halkadır. aggregateRating yalnızca gerçek yorum verisi varsa beklenir; yoksa uyarı olarak geçer, hata değil.',
  },
  {
    question: '“Özgünlük” nasıl ölçülüyor? Yazımı bir yapay zeka mı değerlendiriyor?',
    answer:
      'Hayır. İki deterministik sezgi kullanılır: boilerplate oranı (menü, altbilgi, çerez bandı gibi tekrarlayan bloklardaki metnin toplam metne payı) ve tekrarlanan cümle oranı. Bu, sayfaya özgü içeriğin ne kadar olduğuna dair kaba ama tutarlı bir göstergedir.',
  },
  {
    question: '“AI cevap uyumu” ne demek?',
    answer:
      'ChatGPT veya Perplexity gibi motorların doğrudan alıntılayabileceği kısa cevap birimlerinin varlığı: madde listesi, özellik tablosu, soru biçiminde başlıklar, kısa cümleler ve HTML’de açıkça okunan fiyat.',
  },
  {
    question: 'Fiyatım sayfada görünüyor ama test “fiyat yok” diyor. Neden?',
    answer:
      'Fiyat büyük olasılıkla JavaScript ile sonradan yükleniyor veya yalnızca görselde yer alıyor. Crawler ilk HTML yanıtını okur; fiyatı HTML metninde ve Product şemasında sunmanız gerekir.',
  },
  {
    question: 'Shopify / ikas / Ticimax için önerileri nasıl uygulayacağım?',
    answer:
      'Öneri kartlarında “Nasıl yapılır?” bölümü tespit edilen platforma göre panel yollarını listeler. Emin olmadığımız yerlerde genel ifade kullanırız; uydurma menü yolu yazmayız.',
  },
];

export default function Page() {
  return (
    <CommerceToolPage
      path={PATH}
      eyebrow="Ürün sayfası"
      title={
        <>
          Ürününüz <span className="text-brand">AI'a</span> ne kadar net anlatılıyor?
        </>
      }
      intro="Tek bir ürün sayfası adresi girin. Product JSON-LD alanlarını, açıklamanın uzunluğunu ve özgünlüğünü, görsel alt metinlerini, breadcrumb/SSS/özellik tablosunu ve indekslenebilirliği kontrol edelim; AI motorlarının bu ürünü doğru cevaplamasını neyin engellediğini gösterelim."
      tool={
        <Suspense fallback={<div className="card p-6 text-[13px] text-ink-faint">Araç yükleniyor…</div>}>
          <ProductPageTool />
        </Suspense>
      }
      axes={PRODUCT_PAGE_AXES}
      scoringNotes={[
        'Şema ekseni Product düğümü bulunamazsa yalnızca “Product JSON-LD yok” kontrolüyle puanlanır; alan bazlı kontroller şema varsa devreye girer.',
        'İçerik ekseninde açıklama kelime sayısı için önce şemadaki description, yoksa ana içerik bölgesinin metni kullanılır.',
        'İndekslenebilirlik ekseninde robots.txt kuralları bu sayfanın yolu için çözülür (Googlebot + GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot).',
      ]}
      limitations={[
        'JavaScript render edilmez; varyant seçimiyle değişen fiyat/stok bilgisi yalnızca ilk HTML’de görüldüğü kadarıyla değerlendirilir.',
        'Özgünlük sezgileri sayfa içi tekrarı ölçer; site genelindeki veya tedarikçi kataloğuyla kopya karşılaştırması yapılmaz.',
        'Yorum/puan kontrolü şema veya metindeki “N yorum” ifadesine bakar; yorumların gerçekliğini doğrulamaz.',
        'Sonuç anlık bir fotoğraftır; tema veya uygulama güncellemelerinden sonra yeniden test edin.',
      ]}
      faq={FAQ}
    />
  );
}
