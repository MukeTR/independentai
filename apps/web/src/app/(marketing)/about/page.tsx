import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Hakkımızda — Independent AI nedir?',
  description: 'Türkiye merkezli, bağımsız bir AI brand visibility platformu. Neden kurulduk, ne için varız, nereye gidiyoruz.',
  path: '/about',
});

export default function About() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Hakkımızda', href: '/about' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Hakkımızda</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Bir paragraf bizden:<br />
            <span className="text-brand">Markalar AI çağında körlemesine kalmasın diye varız.</span>
          </h1>
        </Container>
      </section>

      <Section id="mission" eyebrow="Misyon">
        <div className="max-w-3xl text-[17px] text-ink leading-[1.7] space-y-6">
          <p>
            Geleneksel SEO 25 yıldır markaların online görünürlüğünü ölçtü ve şekillendirdi. 2026 itibarıyla bu
            paradigma çatlıyor: milyonlarca kullanıcı artık Google'a değil, ChatGPT'ye, Claude'a, Gemini'ye
            soruyor. AI cevaplarında ilk 3'te değilseniz, bir Google sonucunun 5.sayfasında olmaktan beterdir —
            tıklayacak link bile yoktur.
          </p>
          <p>
            Bu yeni gerçeklikte markaların hâlâ "ne kadar görünüyoruz" sorusuna cevabı yok. Manuel olarak günde
            20 soru sorabilirsiniz, ama ölçüm yapamazsınız. SoV ya da trend göremezsiniz. <strong>Independent AI</strong>{' '}
            bu boşluğu doldurmak için var.
          </p>
          <p>
            Bağımsızlığımız temel taahhüdümüz: hiçbir AI sağlayıcısı ile menfaat ilişkimiz yok. Cevapları
            filtrelemiyoruz, sıralamayı bozmuyoruz. Olduğu gibi gösteriyoruz — siz ne yapacağınıza karar
            veriyorsunuz.
          </p>
        </div>
      </Section>

      <Section id="why-now" eyebrow="Neden şimdi" title="2026 GEO'nun dönüm noktası." className="bg-paper-2/40">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            { y: '2022', t: 'ChatGPT lansmanı', d: '5 günde 1M kullanıcı. Genel kamuoyu için AI çağı başladı.' },
            { y: '2024', t: 'Yapısal değişim başlıyor', d: 'Gartner: "2026\'da arama trafiğinin %25\'i geleneksel motorlardan AI\'ya kayacak."' },
            { y: '2026', t: 'Standartlaşma', d: 'GEO bir disiplin olarak yerleşiyor. llms.txt standartı ortaya çıkıyor. Markalar ölçüm aracı arıyor.' },
          ].map((m) => (
            <div key={m.y} className="card p-7">
              <div className="font-mono text-[24px] text-brand">{m.y}</div>
              <h3 className="font-display text-[20px] mt-3">{m.t}</h3>
              <p className="text-[13.5px] text-ink-muted mt-3 leading-relaxed">{m.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="principles" eyebrow="İlkeler" title="Hangi prensiplerle çalışıyoruz?">
        <div className="space-y-6">
          {[
            { t: 'Bağımsızlık', d: 'Hiçbir AI provider ile iş ortaklığımız, gelir paylaşımımız veya teşvikimiz yok. Sonuçlar ham veridir.' },
            { t: 'Şeffaflık', d: 'Ölçüm metodolojimiz dokümante, kod açık (planlanan). Sayıların nereden geldiği gizli değil.' },
            { t: 'Türkçe öncelik', d: 'Türkiye pazarına özel. Türkçe ek yapıları, marka isimleri, rakip dinamikleri için optimize.' },
            { t: 'Adil fiyatlandırma', d: 'Lansmanda 6 ay ücretsiz. Sonrasında düşük gelirli (öğrenci, startup, non-profit) için kalıcı indirim.' },
            { t: 'Veri sahipliği', d: 'Verileriniz size ait. Export edilebilir, silinebilir. AI provider\'lara prompt dışı veri gönderilmez.' },
          ].map((p) => (
            <div key={p.t} className="border-l-2 border-brand/40 pl-6 py-1">
              <h3 className="font-display text-[20px] tracking-tight">{p.t}</h3>
              <p className="text-[14px] text-ink-muted mt-2 leading-relaxed max-w-2xl">{p.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="team" eyebrow="Takım" title="Küçük ama odaklı." className="bg-paper-2/40">
        <div className="card p-8 max-w-2xl">
          <p className="text-[15px] text-ink-muted leading-relaxed">
            Independent AI 2026 başında Türkiye'de kuruldu. Solo bir founder + AI asistanı ile geliştiriliyor.
            Henüz erken aşamadayız — kullanıcı sayısı arttıkça takım da büyüyecek. Şimdilik tüm fokus: gerçek
            bir GEO ürünü inşa etmek ve kullanıcı geri bildirimi ile yön bulmak.
          </p>
        </div>
      </Section>

      <CtaBlock
        title={<>Erken kullanıcı ol, <span className="text-brand">geleceğe söz hakkı kazan.</span></>}
        body="Lansman kullanıcılarımıza kalıcı early-adopter indirimi söz veriyoruz. Üstelik özellik yol haritasını da birlikte şekillendireceğiz."
      />
    </>
  );
}
