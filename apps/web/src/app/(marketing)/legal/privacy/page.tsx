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
        <p className="text-[12px] text-ink-faint font-mono mb-12">Son güncelleme: 2026-09-07</p>

        <div className="space-y-8 text-[15px] leading-[1.7] text-ink">
          <Section h="1. Topladığımız veriler">
            <strong>Hesap bilgisi:</strong> E-posta, şifre (scrypt ile hashlenmiş), şirket adı, web sitesi (opsiyonel).
            <br />
            <strong>Kullanım verisi:</strong> Eklediğiniz marka, alias\'lar, rakipler ve izlediğiniz prompt metinleri.
            <br />
            <strong>Türetilen veri:</strong> AI provider\'lardan gelen cevap metinleri, çıkartılan marka mention\'ları,
            metrikler.
            <br />
            <strong>Teknik veri:</strong> Sunucu logları (IP, tarayıcı, sayfa görüntülemeleri) — anonim agregat hariç
            birey bazlı saklamayız.
          </Section>

          <Section h="1b. AI Discovery Sensor (siteye eklenen ölçüm script'i)">
            Sitenize <code className="font-mono text-[13px]">sensor/v1.js</code> script'ini eklerseniz, ziyaretçi
            davranışının <strong>sınırlı ve kişisel veri içermeyen</strong> bir özetini toplarız.
            <br />
            <strong>Toplanan:</strong> sayfa yolu (query string ve hash olmadan), yönlendiren sitenin yalnızca alan adı
            (tam URL değil), olay tipi (sayfa görüntüleme, tıklama, form gönderimi gibi), site sahibinin tanımladığı
            varlık etiketi ve hedef, olay zamanı, SDK sürümü ve izin verilen UTM alanları (kaynak, ortam, kampanya).
            <br />
            <strong>Toplanmayan:</strong> çerez, kalıcı ziyaretçi kimliği, parmak izi (fingerprint), form veya sayfa
            metni, oturum kaydı (session replay), e-posta/telefon gibi kişisel veriler ve kalıcı IP adresi. Ham IP
            yalnızca isteğin doğrulanması ve hız sınırı için anlık kullanılır, hiçbir telemetri kaydına yazılmaz.
            <br />
            <strong>Oturum:</strong> ziyaretçiyi tanımak için çerez kullanılmaz; sayfa sekmesinde yaşayan, en fazla 12
            saatlik anonim bir oturum anahtarı üretilir. Benzersiz kişi sayısı iddia edilmez.
            <br />
            <strong>Sunucu/edge telemetrisi:</strong> site sahibi isterse AI crawler isteklerini (bot adı, yol, HTTP
            durumu) imzalı bir kanaldan gönderir. Bu kayıtlar ziyaretçi değil, otomatik bot istekleridir.
            <br />
            <strong>Ziyaretçi bildirimi:</strong> site sahibi isteğe bağlı mini formu açarsa, ziyaretçinin gönüllü
            olarak yazdığı metin saklanır; içindeki e-posta/telefon benzeri veriler kayıttan önce temizlenir.
            <br />
            <strong>Saklama:</strong> ham olaylar site sahibinin seçtiği süre kadar (varsayılan 90 gün, en az 7)
            tutulur, sonra otomatik silinir; yalnızca kişisel veri içermeyen günlük toplamlar kalır. Site silindiğinde
            tüm telemetri verisi birlikte silinir.
            <br />
            <strong>Sorumluluk:</strong> script'i kendi sitesine ekleyen müşteri, kendi ziyaretçilerine karşı veri
            sorumlusudur; kendi gizlilik metnini güncellemekle yükümlüdür. Bu metin hukuki uygunluk garantisi vermez.
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
            Sadece izlediğiniz prompt metni AI provider\'lara (OpenAI, Anthropic, Google) gönderilir. Bu metinler,
            ilgili sağlayıcının gizlilik politikasına tabidir. Hesap bilgileriniz, kullanıcı bilgileriniz, marka
            aliasları gibi diğer hiçbir veri provider\'a gönderilmez.
          </Section>

          <Section h="4. Üçüncü taraf hizmetler">
            <strong>Hosting:</strong> Vercel (web), Supabase (Postgres) — Frankfurt, Almanya (AB).
            <br />
            <strong>AI:</strong> OpenAI, Anthropic, Google — sadece prompt metni gönderilir.
            <br />
            <strong>Analitik:</strong> Şu an üçüncü taraf analytics kullanmıyoruz.
          </Section>

          <Section h="5. Veri saklama süresi">
            Hesabınız aktif olduğu sürece verileriniz saklanır. Hesabınızı silmek isterseniz{' '}
            <a href="/contact" className="text-brand-deep hover:underline">
              destek
            </a>
            'e yazın, 30 gün içinde tüm verileriniz geri dönüşümsüz silinir (yedeklerden de).
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
            <a href="/legal/kvkk" className="text-brand-deep hover:underline mt-3 inline-block">
              → Detaylı KVKK aydınlatması
            </a>
          </Section>

          <Section h="7. Güvenlik">
            Tüm bağlantılar TLS 1.3 ile şifrelenir. Şifreler scrypt ile hashlenir, asla düz metin olarak saklanmaz.
            Veritabanı erişimi IP whitelist ve güçlü kimlik doğrulama ile korunur.
          </Section>

          <Section h="8. İletişim">
            Sorularınız için:{' '}
            <a href="mailto:destek@independentai.space" className="text-brand-deep hover:underline">
              destek@independentai.space
            </a>
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
