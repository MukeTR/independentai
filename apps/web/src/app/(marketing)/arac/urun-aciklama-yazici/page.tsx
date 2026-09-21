import { buildMetadata } from '@/lib/seo';
import { CommerceToolPage } from '@/components/marketing/commerce-tool-page';
import { ProductWriterTool } from '@/components/marketing/product-writer-tool';

const PATH = '/arac/urun-aciklama-yazici';

export const metadata = buildMetadata({
  title: 'Ürün Açıklama Yazıcı — AI alıntılamasına uygun açıklama, SSS, meta ve JSON-LD',
  description:
    'Ürün adı ve özelliklerini girin; yalnızca verdiğiniz bilgilerle ürün açıklaması, 5 SSS, meta başlık/açıklama ve Product JSON-LD iskeleti üretilsin. Uydurma spesifikasyon yok. Ücretsiz, kayıt gerekmez.',
  path: PATH,
});

const FAQ = [
  {
    question: 'Model ürünüm hakkında bilmediği şeyleri uydurur mu?',
    answer:
      'Uydurmaması için tasarlandı: sistem talimatı yalnızca girdiğiniz özellikleri kullanmayı, verilmeyen ölçü/malzeme/sertifika/fiyat/garanti bilgisini yazmamayı ve abartılı üstünlük iddialarından kaçınmayı zorunlu kılar. Fiyat, SKU, görsel ve URL alanları JSON-LD’de boş bırakılır ve size “doldurun” diye işaretlenir. Yine de yayınlamadan önce metni okuyun.',
  },
  {
    question: 'Çıktı neden bazen “AI sağlayıcı yapılandırılmamış” diyor?',
    answer:
      'Bu araç gerçek bir dil modeli çağırır. Sunucuda geçerli bir sağlayıcı anahtarı yoksa sahte çıktı üretmek yerine dürüstçe 503 döneriz.',
  },
  {
    question: 'SSS bloğu Google/AI için nasıl işaretlenir?',
    answer:
      'Araç, ürettiği 5 soru-cevabı FAQPage JSON-LD olarak da verir. Ürün sayfanıza görünür SSS bölümüyle birlikte ekleyin; yalnızca şema eklemek yeterli değildir.',
  },
  {
    question: 'Türkçe dışında dil destekleniyor mu?',
    answer:
      'Türkçe ve İngilizce. Meta başlık 60, meta açıklama 155 karakter sınırına göre üretilir; uzunluklar çıktıda gösterilir.',
  },
  {
    question: 'Kullanım sınırı var mı?',
    answer:
      'Kayıtsız kullanımda saatte 5 üretim (IP başına) ve küresel bir tavan vardır. Ücretsiz hesapla panel içindeki kopyayı daha yüksek limitle kullanabilirsiniz.',
  },
];

export default function Page() {
  return (
    <CommerceToolPage
      path={PATH}
      eyebrow="Üretici"
      title={
        <>
          Ürün açıklaması, <span className="text-brand">yalnızca gerçeklerle</span>
        </>
      }
      intro="Ürün adını ve doğru bildiğiniz özellikleri girin. AI, yalnızca bu özellikleri kullanarak alıntılanabilir bir açıklama, 5 müşteri sorusu ve cevabı, meta başlık/açıklama ve doldurmanız gereken alanları işaretlenmiş bir Product JSON-LD iskeleti üretir."
      tool={<ProductWriterTool />}
      limitations={[
        'Gerçek bir dil modeli kullanılır; sağlayıcı yapılandırılmamışsa araç 503 döner, sahte metin göstermez.',
        'Model yalnızca verdiğiniz özellikleri kullanmakla yükümlüdür ama dil modelleri hata yapabilir; yayınlamadan önce metni doğrulayın.',
        'Fiyat, SKU/GTIN, görsel ve URL üretilmez; JSON-LD iskeletinde boş bırakılır.',
        'Üretilen metin telif açısından size aittir; aynı özelliklerle benzer metinler üretilebileceğini unutmayın, kendi sesinizi ekleyin.',
      ]}
      faq={FAQ}
    />
  );
}
