import { Container } from '@/components/container';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Gizlilik Politikası',
  description: 'Independent AI gizlilik politikası — hangi verileri toplarız, nasıl saklarız, kimle paylaşırız.',
  path: '/legal/privacy',
});

export default function Privacy() {
  return (
    <article className="py-24">
      <Container className="max-w-3xl prose">
        <div className="eyebrow">Yasal</div>
        <h1 className="font-display text-[48px] tracking-tight mt-3 mb-4">Gizlilik Politikası</h1>
        <p className="text-[12px] text-ink-faint font-mono mb-12">Son güncelleme: 2026-05-22</p>

        <div className="space-y-8 text-[15px] leading-[1.7] text-ink">
          <Section h="1. Topladığımız veriler">
            <strong>Hesap bilgisi:</strong> E-posta, şifre (scrypt ile hashlenmiş), şirket adı, web sitesi (opsiyonel).<br/>
            <strong>Kullanım verisi:</strong> Eklediğiniz marka, alias\'lar, rakipler ve izlediğiniz prompt metinleri.<br/>
            <strong>Türetilen veri:</strong> AI provider\'lardan gelen cevap metinleri, çıkartılan marka mention\'ları, metrikler.<br/>
            <strong>Teknik veri:</strong> Sunucu logları (IP, tarayıcı, sayfa görüntülemeleri) — anonim agregat hariç birey bazlı saklamayız.
          </Section>

          <Section h="2. Verilerinizi neden kullanırız">
            <ul className="list-disc list-inside space-y-1">
              <li>Hesabınızı yönetmek ve hizmetimizi sunmak</li>
              <li>Promptlarınızı AI provider\'lara göndererek sonuç üretmek</li>
              <li>Faturalandırma (6 ay lansman sonrası)</li>
              <li>Destek talepleri ve iletişim</li>
              <li>Toplam kullanım istatistikleri (kişisel bilgi içermeyen)</li>
            </ul>
          </Section>

          <Section h="3. AI provider'larla paylaşım">
            Sadece izlediğiniz prompt metni AI provider\'lara (OpenAI, Anthropic, Google) gönderilir. Bu metinler, ilgili
            sağlayıcının gizlilik politikasına tabidir. Hesap bilgileriniz, kullanıcı bilgileriniz, marka aliasları
            gibi diğer hiçbir veri provider\'a gönderilmez.
          </Section>

          <Section h="4. Üçüncü taraf hizmetler">
            <strong>Hosting:</strong> Vercel (web), Neon (Postgres) — ABD-doğu bölgesi.<br/>
            <strong>AI:</strong> OpenAI, Anthropic, Google — sadece prompt metni gönderilir.<br/>
            <strong>Analitik:</strong> Şu an üçüncü taraf analytics kullanmıyoruz.
          </Section>

          <Section h="5. Veri saklama süresi">
            Hesabınız aktif olduğu sürece verileriniz saklanır. Hesabınızı silmek isterseniz{' '}
            <a href="/contact" className="text-brand-deep hover:underline">destek</a>'e yazın, 30 gün içinde tüm verileriniz
            geri dönüşümsüz silinir (yedeklerden de).
          </Section>

          <Section h="6. KVKK hakları">
            6698 sayılı KVKK kapsamında veri sahibi olarak şu haklara sahipsiniz:
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Veri işlenip işlenmediğini öğrenme</li>
              <li>İşlenmişse buna ilişkin bilgi talep etme</li>
              <li>Eksik/yanlış işlenmişse düzeltilmesini isteme</li>
              <li>Silme veya yok etme talebi</li>
              <li>İşlemeye itiraz etme</li>
            </ul>
            <a href="/legal/kvkk" className="text-brand-deep hover:underline mt-3 inline-block">→ Detaylı KVKK aydınlatması</a>
          </Section>

          <Section h="7. Güvenlik">
            Tüm bağlantılar TLS 1.3 ile şifrelenir. Şifreler scrypt ile hashlenir, asla düz metin olarak saklanmaz.
            Veritabanı erişimi IP whitelist ve güçlü kimlik doğrulama ile korunur.
          </Section>

          <Section h="8. İletişim">
            Sorularınız için: <a href="mailto:destek@independentai.space" className="text-brand-deep hover:underline">destek@independentai.space</a>
          </Section>
        </div>
      </Container>
    </article>
  );
}

function Section({ h, children }: { h: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[22px] tracking-tight mb-3">{h}</h2>
      <div className="text-ink-muted">{children}</div>
    </section>
  );
}
