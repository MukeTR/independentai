import { Container } from '@/components/container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Kullanım Şartları',
  description: 'Independent AI kullanım şartları ve hizmet sözleşmesi.',
  path: '/legal/terms',
});

export default function Terms() {
  return (
    <article className="py-24">
      <Container className="max-w-3xl">
        <div className="eyebrow">Yasal</div>
        <h1 className="font-display text-[48px] tracking-tight mt-3 mb-4">Kullanım Şartları</h1>
        <p className="text-[12px] text-ink-faint font-mono mb-12">Son güncelleme: 2026-05-22</p>

        <div className="space-y-8 text-[15px] leading-[1.7] text-ink">
          {[
            {
              h: '1. Hizmetin kapsamı',
              c: 'Independent AI, kullanıcılarının tanımladığı sorgular için OpenAI, Anthropic ve Google\'ın yapay zeka modellerine API çağrısı yapar, cevap metinlerinde marka tespiti yapar ve sonuçları görselleştirir. Hizmet "olduğu gibi" sunulur; sonuçların doğruluğu, tamlığı veya güncelliği garanti edilmez.',
            },
            {
              h: '2. Lansman promosyonu',
              c: '2026-05-22 tarihinde kayıt olan tüm kullanıcılar 6 ay boyunca tüm özelliklere ücretsiz erişir. 6 ay sonunda otomatik ücretlendirme YAPILMAZ; kullanmaya devam etmek için aktif bir tercih yapmanız gerekir.',
            },
            {
              h: '3. Kullanıcı sorumlulukları',
              c: 'İzlediğiniz prompt metinleri AI provider\'lara aktarılır. Telif hakkı ihlali, kişisel veri içeren veya yasa dışı içerik gönderemezsiniz. Hesap güvenliği (güçlü şifre, paylaşmama) sizin sorumluluğunuzdadır.',
            },
            {
              h: '4. Bizim sorumluluğumuz',
              c: 'Hizmet kesintilerine, AI provider hatalarına veya sonuçların yanlış yorumlanmasına bağlı zararlardan sorumlu değiliz. Maksimum sorumluluğumuz son 12 ay içindeki ödediğiniz toplam ücret ile sınırlıdır.',
            },
            {
              h: '5. Üyeliği sonlandırma',
              c: 'Hesabınızı istediğiniz an silebilirsiniz. Biz de Kullanım Şartları ihlali durumunda hesabı askıya alma hakkını saklı tutarız. Tüm verileriniz silme talebiniz sonrası 30 gün içinde geri dönüşümsüz silinir.',
            },
            {
              h: '6. Değişiklikler',
              c: 'Bu şartları zamanla güncelleyebiliriz. Önemli değişiklikleri email ile size bildirip 30 gün önce duyururuz.',
            },
            {
              h: '7. Yetkili mahkeme',
              c: 'Türkiye hukukuna tabidir. Anlaşmazlık halinde İstanbul mahkemeleri yetkilidir.',
            },
          ].map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-[22px] tracking-tight mb-3">{s.h}</h2>
              <p className="text-ink-muted">{s.c}</p>
            </section>
          ))}
        </div>
      </Container>
    </article>
  );
}
