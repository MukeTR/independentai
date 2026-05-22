import { Container } from '@/components/container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'KVKK Aydınlatma Metni',
  description: '6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.',
  path: '/legal/kvkk',
});

export default function Kvkk() {
  return (
    <article className="py-24">
      <Container className="max-w-3xl">
        <div className="eyebrow">Yasal</div>
        <h1 className="font-display text-[40px] tracking-tight mt-3 mb-4">KVKK Aydınlatma Metni</h1>
        <p className="text-[12px] text-ink-faint font-mono mb-12">Son güncelleme: 2026-05-22</p>

        <div className="space-y-8 text-[15px] leading-[1.7] text-ink">
          <p className="text-ink-muted">
            6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla Independent AI
            tarafından aşağıdaki açıklamalar yapılmaktadır.
          </p>

          {[
            {
              h: 'Veri sorumlusu',
              c: 'Independent AI — independentai.space. Şirket bilgileri lansman sonrası tamamlanacaktır.',
            },
            {
              h: 'İşlenen kişisel veriler',
              c: 'Ad-soyad (opsiyonel), e-posta adresi, şirket adı, web sitesi, IP adresi ve oturum logları. Kredi kartı bilgisi şu an istenmemektedir.',
            },
            {
              h: 'İşleme amaçları',
              c: 'Üyelik hesabınızı oluşturmak, hizmeti sunmak, faturalandırma (gelecekte), destek talepleri, yasal yükümlülükler.',
            },
            {
              h: 'Aktarım',
              c: 'Verileriniz yurt dışında bulunan hosting altyapısında (Vercel ve Neon — ABD) saklanır. Yurt dışı aktarımı için açık rızanız kayıt sırasında alınır.',
            },
            {
              h: 'Saklama süresi',
              c: 'Hesabınız aktif olduğu sürece + 1 yıl. Talep ettiğinizde 30 gün içinde silinir.',
            },
            {
              h: 'Veri sahibi hakları',
              c: 'Madde 11 çerçevesinde tüm haklarınızı kullanmak için destek@independentai.space adresine yazabilirsiniz. 30 gün içinde size dönüş yaparız.',
            },
          ].map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-[20px] tracking-tight mb-3">{s.h}</h2>
              <p className="text-ink-muted">{s.c}</p>
            </section>
          ))}
        </div>
      </Container>
    </article>
  );
}
