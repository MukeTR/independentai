import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Bot, Database, GitBranch, Search, Sparkles, Wrench } from 'lucide-react';
import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Nasıl çalışır — Analiz → Düzelt → Ölç',
  description:
    'Yanıt sitenizi tarar, müşteri sorularını üç modele sorar, nedenini ve önerileri çıkarır; düzeltirsiniz, her sabah yeniden ölçülür.',
  path: '/how-it-works',
});

const STEPS = [
  {
    n: '01',
    icon: Search,
    title: 'Analiz: site araçları deterministik tarar',
    body: 'Alan adınızı girersiniz. Ücretsiz araçlar yalnızca herkese açık sayfalarınızı okur: başlık, meta, şema, robots, yönlendirme zinciri, güvenlik başlıkları, satın alma sorularına cevap veren içerik. Tarayıcı deterministiktir: aynı girdi, aynı skor. LLM yok, JavaScript render yok, kişisel veri yok.',
    note: 'Sonuç: hüküm (“3 kritik, 4 uyarı, 9 tamam”), her bulguda ne oldu / neden önemli / nasıl düzelir.',
  },
  {
    n: '02',
    icon: GitBranch,
    title: 'Analiz: müşteri soruları 3 modele, tarih damgalı',
    body: 'Panelde müşterilerinizin satın almadan önce sorduğu türden soruları tanımlarsınız; sektörünüze göre öneriler gelir. Yanıt her soruyu ChatGPT, Claude ve Gemini’ye sorar; cevabı, modeli, tarihi ve maliyeti kaydeder. Tek sorguya hüküm bağlamayız: cevaplar oturumdan oturuma değişir, seriye bakarız.',
    note: 'Marka tespiti alias eşleşmesiyle, deterministik. Pozisyon ve bağlam cümlesi saklanır.',
  },
  {
    n: '03',
    icon: Bot,
    title: 'Neden + öneriler',
    body: 'Rakibiniz önerilip siz önerilmiyorsanız neden? Atıf kaynakları, sahipsiz sorular, sayfa düzeyinde bulgular ve içerik boşlukları tek listede birleşir. Her öneri zorluk ve etki etiketi taşır; “nasıl yapılır” bağlantısı rehbere gider.',
    note: 'Haftalık tek “Yapılacaklar” ekranı yol haritasında; bugün öneriler araç bazında gelir.',
  },
  {
    n: '04',
    icon: Wrench,
    title: 'Düzelt: siz ya da Yanıt Agency',
    body: 'Listeyi kendi ekibiniz uygular; ya da Yanıt Agency aylık sprintle teknik düzeltme, şema/entity, içerik ve kaynak çalışmasını üstlenir (teklifle). İki yolda da ilerleme aynı panelden izlenir.',
    note: 'Sonuç sözü vermiyoruz; ölçüm ve kanıt veriyoruz.',
  },
  {
    n: '05',
    icon: Database,
    title: 'Ölç: her sabah yeniden',
    body: 'Her gece (~02:00 TR, ±1 saat) tüm aktif sorular yeniden çalıştırılır. Görünürlük, Share of Voice, pozisyon ve modele göre kırılım güncellenir; düşüşte e-posta/Slack uyarısı, haftada bir özet rapor.',
    note: 'Aynı veri Public API ile de çekilir (salt-okunur).',
  },
];

const DAILY_CRON = [
  '~02:00 (TR, ±1 saat) · Vercel Cron tetiklenir (23:00 UTC)',
  '+1 sn · Aktif sorular veri tabanından çekilir',
  '+2 sn · Her soru × 3 model paralel çalıştırılır',
  '+30 sn · Cevaplar ve marka bahisleri kaydedilir',
  '+32 sn · Düşüş uyarısı kontrolü (e-posta/Slack)',
  'Kuyrukta kalan işler zincirleme tetikleyiciyle tamamlanır',
];

const FLOW = [
  'Siteniz + müşteri soruları',
  'ChatGPT · Claude · Gemini',
  'Siz mi, rakibiniz mi?',
  'Neden + öneriler',
  'Düzelt',
  'Her sabah ölç',
];

export default function HowItWorks() {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Ana sayfa', href: '/' },
          { name: 'Nasıl çalışır', href: '/how-it-works' },
        ]}
      />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Nasıl çalışır</div>
          <h1 className="font-display text-[48px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Analiz → Düzelt → Ölç.
            <br />
            <span className="text-brand">Kara kutu değil; her adım açık.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Sayılarınızın nereden geldiğini bilmek onlara güvenmenin temelidir. Aşağıda veri akışı, ölçüm yöntemi ve
            skor formülleri var; ekran örnekleri temsilidir.
          </p>
          <ol className="mt-8 flex flex-wrap items-center gap-2 text-[12px] font-mono text-ink-faint" aria-label="Akış">
            {FLOW.map((p, i) => (
              <li key={p} className="inline-flex items-center gap-2">
                <span className="text-ink-muted">{p}</span>
                {i < FLOW.length - 1 && <ArrowRight className="w-3 h-3" aria-hidden />}
              </li>
            ))}
          </ol>

          <figure className="mt-10 max-w-[460px] mx-auto rounded-2xl border border-hairline bg-paper-3 overflow-hidden">
            <Image
              src="/img/ciz/analiz-duzelt-olc.webp"
              alt="Büyüteç, anahtar ve yükselen çizgi grafiği; üçü kavisli oklarla bir döngü oluşturuyor"
              width={1200}
              height={675}
              unoptimized
              className="w-full h-auto"
            />
            <figcaption className="text-[12.5px] text-ink-faint px-6 py-4 border-t border-hairline">
              Aynı üç adım her gün baştan çalışır: tara, düzelt, yeniden ölç.
            </figcaption>
          </figure>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="space-y-6">
            {STEPS.map((s) => (
              <div key={s.n} className="card p-7 lg:p-9 grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-3 flex md:flex-col items-center md:items-start gap-4">
                  <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
                  <s.icon className="w-7 h-7 text-brand" aria-hidden />
                </div>
                <div className="col-span-12 md:col-span-9">
                  <h2 className="font-display text-[24px] lg:text-[28px] leading-snug">{s.title}</h2>
                  <p className="text-[15px] text-ink-muted mt-4 leading-relaxed">{s.body}</p>
                  <p className="text-[12.5px] text-ink-faint mt-3 font-mono">{s.note}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <Section
        id="skor"
        eyebrow="Skoru nasıl hesaplıyoruz"
        title="Her skorun altında formül, tarih ve kapsam yazar."
        intro="Açıklamasız 0–100 sahte kesinliktir. Site araçlarında skor = eksen ağırlığı × kontrol sonucu (geç/uyar/kal); panelde görünürlük = markanızın geçtiği başarılı cevap / başarılı cevap × 100. Ayrıntı ve tüm formüller dokümantasyonda."
        className="bg-paper-2/40"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="card p-6">
            <div className="eyebrow">Site araçları</div>
            <p className="font-mono text-[12.5px] mt-3 leading-relaxed text-ink">
              eksen skoru = kazanılan / mümkün × 100
              <br />
              toplam = Σ(eksen × ağırlık) / Σ ağırlık
            </p>
            <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">
              Kontroller geç (1) / uyar (0,5) / kal (0). Yalnızca uygulanabilen kontroller sayılır. Hazırlık ölçer, AI
              davranışını değil.
            </p>
          </div>
          <div className="card p-6">
            <div className="eyebrow">Görünürlük</div>
            <p className="font-mono text-[12.5px] mt-3 leading-relaxed text-ink">
              markanın geçtiği SUCCESS cevap
              <br />÷ SUCCESS cevap × 100
            </p>
            <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">
              Hatalı çalıştırmalar paydaya girmez. Bir cevapta marka kaç kez geçerse geçsin o cevap bir kez sayılır.
            </p>
          </div>
          <div className="card p-6">
            <div className="eyebrow">Share of Voice</div>
            <p className="font-mono text-[12.5px] mt-3 leading-relaxed text-ink">
              kendi bahis
              <br />÷ (kendi + rakip bahis) × 100
            </p>
            <p className="text-[13px] text-ink-muted mt-3 leading-relaxed">
              Cevap başına marka başına en fazla 1 bahis. Yalnızca panelde tanımlı rakipler hesaba girer.
            </p>
          </div>
        </div>
        <Link
          href="/docs#skorlar"
          className="mt-8 inline-flex items-center gap-1.5 text-[14px] text-brand-deep hover:text-brand"
        >
          Tüm skor formülleri ve sınırlamalar <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </Section>

      <Section eyebrow="Günlük akış" title="Her gece ~02:00’de ne oluyor?">
        <div className="card p-8">
          <div className="space-y-3">
            {DAILY_CRON.map((line) => (
              <div key={line} className="flex items-start gap-3 font-mono text-[13px]">
                <span className="text-brand">▶</span>
                <span className="text-ink">{line}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section eyebrow="Tasarım kararları" title="Neden böyle yaptık?" className="bg-paper-2/40">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-7">
            <div className="eyebrow">Neden 3 model?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">Tek modelle gerçekçi ölçüm olmaz</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              ChatGPT’de ilk sıradaysanız Claude’da da öyle olduğunuzu varsayamazsınız; bazen tam tersi. Üç modeli aynı
              soruyla, aynı gün sorgulayarak karşılaştırılabilir bir tablo çıkar.
            </p>
          </div>
          <div className="card p-7">
            <div className="eyebrow">Neden günde 1 kez?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">Trend için yeterli, maliyet için makul</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Cevaplar oturumdan oturuma değişebilir; bu yüzden tek sorguya değil seriye bakarız. Günlük sıklık trendi
              gösterir; daha sık sorgu maliyeti artırır, marjinal değer düşer.
            </p>
          </div>
          <div className="card p-7">
            <div className="eyebrow">Neden alias eşleşmesi, LLM değil?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">Hız, maliyet ve denetlenebilirlik</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Her cevabı bir modele “bu markadan bahsediyor mu” diye sormak pahalı ve değişken olur. Alias eşleşmesi
              deterministik, hızlı ve denetlenebilir; neyin eşleştiğini görürsünüz.
            </p>
          </div>
          <div className="card p-7">
            <div className="eyebrow">Neden Türkçe öncelikli?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">Türkçe sorular, Türkçe rakipler</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Küresel araçlar Türkçe soruya cevap verir ama Türkçe ek yapıları, marka yazımları ve yerel rakip
              dinamikleri için ayarlı değildir. Yanıt Türkçe pazarı için ayarlandı.
            </p>
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3 flex-wrap text-[13px] text-ink-muted">
          <Sparkles className="w-4 h-4 text-brand" aria-hidden />
          <span>
            Kısıtlar: JavaScript ile render edilen içerik ham HTML’de görünmeyebilir (uyarı, hata değil); PSI/CrUX hız
            verisi yok; LLM cevapları değişkendir.
          </span>
        </div>
      </Section>

      <CtaBlock
        eyebrow="25 saniyede başlayın"
        title={
          <>
            Sitenizi tarayalım; <span className="text-brand">hükmü siz okuyun.</span>
          </>
        }
        body="Ücretsiz araçlar hesap istemez: müşterinizin sorduğu sorular, sitenizdeki karşılıkları ve yapay zekâ tarayıcılarının erişimi tek ekranda. Sonra isterseniz sürekli ölçüm için hesap açın; kart gerekmez."
        primaryHref="/arac/musteriniz-nasil-soruyor"
        primaryLabel="Müşteriniz sizi nasıl soruyor?"
        secondaryHref="/arac"
        secondaryLabel="Tüm ücretsiz araçlar"
      />
    </>
  );
}
