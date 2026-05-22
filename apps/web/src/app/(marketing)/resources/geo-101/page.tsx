import Link from 'next/link';
import { Container } from '@/components/container';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowLeft, BookOpen } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'GEO 101 — AI çağında marka görünürlüğü rehberi',
  description: '12 sayfalık başucu rehberi. GEO nedir, neden önemli, ne yapmalı? Türkiye pazarına uyarlı pratik rehber.',
  path: '/resources/geo-101',
});

const CHAPTERS = [
  { id: 'intro', n: '01', t: 'Giriş: SEO\'dan GEO\'ya' },
  { id: 'why', n: '02', t: 'Neden 2026\'dan itibaren GEO kritik?' },
  { id: 'how-llms-work', n: '03', t: 'AI modelleri marka önerirken nasıl çalışır?' },
  { id: 'measurement', n: '04', t: 'GEO\'da ölçüm nasıl yapılır?' },
  { id: 'content-strategy', n: '05', t: 'İçerik stratejinizi GEO için uyarlamak' },
  { id: 'llms-txt', n: '06', t: 'llms.txt: AI\'a doğrudan konuşmak' },
  { id: 'tr-market', n: '07', t: 'Türkiye pazarında özel durumlar' },
  { id: 'tools', n: '08', t: 'Hangi araçları kullanmalısınız?' },
  { id: 'kpis', n: '09', t: 'GEO\'da hangi KPI\'lara bakılır?' },
  { id: 'mistakes', n: '10', t: 'En sık yapılan 5 hata' },
  { id: 'roadmap', n: '11', t: '90 günlük başlangıç planı' },
  { id: 'future', n: '12', t: 'Geleceğe bakış: 2027 ve sonrası' },
];

export default function Geo101() {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Ana sayfa', href: '/' },
        { name: 'Kaynaklar', href: '/resources' },
        { name: 'GEO 101', href: '/resources/geo-101' },
      ]} />

      <section className="pt-20 pb-12">
        <Container className="max-w-4xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Tüm kaynaklar
          </Link>
          <div className="flex items-center gap-3 mt-6">
            <BookOpen className="w-5 h-5 text-brand" />
            <span className="eyebrow">Rehber · 12 bölüm</span>
          </div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            GEO 101: <span className="text-brand">AI çağında marka görünürlüğü rehberi</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-6 leading-relaxed">
            Türkiye pazarına uyarlı, pratik bir başucu rehberi. ChatGPT, Claude ve Gemini cevaplarında
            görünür olmak isteyen markalar için 90 günlük başlangıç planına kadar her şey.
          </p>
        </Container>
      </section>

      {/* TOC */}
      <section className="pb-12">
        <Container className="max-w-4xl">
          <div className="card p-7">
            <div className="eyebrow mb-4">İçindekiler</div>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
              {CHAPTERS.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="flex items-baseline gap-3 text-[13.5px] text-ink-muted hover:text-brand-deep transition">
                    <span className="font-mono text-[11px] text-brand">{c.n}</span>
                    <span>{c.t}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Chapters */}
      <article className="pb-20">
        <Container className="max-w-3xl">
          <Chapter id="intro" n="01" t="Giriş: SEO'dan GEO'ya">
            <p>1999\'da Google geldi. 25 yıl boyunca markanın online görünürlüğü "Google\'da sıralama"
              ile özdeşleşti. Backlink, içerik, teknik SEO — hepsi tek bir hedef için: arama sonuçlarında üst sıralarda yer almak.</p>
            <p>2022\'de ChatGPT lansmanı oldu. 5 günde 1 milyon, 2 ayda 100 milyon kullanıcı. 2025\'te kullanıcılar
              "en iyi …" sorularını AI\'ya sormaya başladı. 2026\'da bu davranış mainstream oldu.</p>
            <p>GEO (Generative Engine Optimization), bu yeni gerçeklikte markaları izleme ve optimize etme disiplinidir.
              SEO\'nun yerine geçmez — yanına eklenir, çünkü Google da hâlâ var.</p>
          </Chapter>

          <Chapter id="why" n="02" t="Neden 2026'dan itibaren GEO kritik?">
            <p>Üç sayı: (1) ChatGPT Türkiye\'de 8M aktif kullanıcı. (2) Bunların %43\'ü satın alma kararında AI önerisinden etkilendi. (3) "En iyi …" sorularında AI 2-3 marka öneriyor — daha fazlasını değil.</p>
            <p>Bu yapı, satın alma hunisinin en üst noktasında <strong>radikal bir filtrasyon</strong> yarattı. Eskiden 10
              markanın listede olduğu yerlerde şimdi sadece 2-3 var. O 2-3\'te değilseniz, dönüşüm hunisine bile girmiyorsunuz.</p>
          </Chapter>

          <Chapter id="how-llms-work" n="03" t="AI modelleri marka önerirken nasıl çalışır?">
            <p>İki ana kaynak: (1) eğitim verisi (model train edildiğindeki internet snapshot\'u) ve (2) gerçek zamanlı arama (bazı modeller cevap üretirken canlı web araması yapar).</p>
            <p>Modeller bir kategorik soruya cevap verirken: (a) kategoriyi tanır, (b) eğitim verisinden + canlı aramadan
              ilgili markaları bulur, (c) "popülerlik + yetkililik + güncellik" karışımı ile birkaçını seçer, (d) doğal dilde cümlelere döker.</p>
            <p>Anahtar: <strong>popülerlik metrik değil, signal'dir.</strong> AI hangi markanın daha çok bahsedildiğini, ne tür
              sitelerde bahsedildiğini, son zamanlarda ne sıklıkla bahsedildiğini değerlendirir.</p>
          </Chapter>

          <Chapter id="measurement" n="04" t="GEO'da ölçüm nasıl yapılır?">
            <p>SEO\'da Google Search Console, Ahrefs, SEMrush gibi araçlar olgun. GEO\'da henüz benzer olgunluk yok. Şu üç metriği temel alın:</p>
            <ul>
              <li><strong>Görünürlük Skoru:</strong> İzlenen sorgularda markanızın geçtiği oran (0-100%).</li>
              <li><strong>Share of Voice:</strong> Sizin + rakiplerinizin toplam bahsetme sayısı içindeki payınız.</li>
              <li><strong>Pozisyon:</strong> Cevapta kaçıncı bahsedilen markasınız.</li>
            </ul>
            <p>Ek olarak: tonal değerlendirme (positive/neutral/negative), modele göre dağılım (ChatGPT vs Claude vs Gemini), zaman içinde trend.</p>
          </Chapter>

          <Chapter id="content-strategy" n="05" t="İçerik stratejinizi GEO için uyarlamak">
            <p>AI modellerinin sevdiği içerik türleri: (a) yapılandırılmış, başlık hiyerarşisi temiz, (b) tarafsız ton (objektif), (c) yetkili kaynaklara atıflı, (d) güncel ve doğru.</p>
            <p>SEO için yazdığınız "Top 10 …" listeleri GEO için de işe yarar. Ancak markanızı çok methetmeyin — AI bunu fark edip listeden çıkarabilir. Daha çok "X markanın artıları ve eksileri" tarzı içerik üretin.</p>
          </Chapter>

          <Chapter id="llms-txt" n="06" t="llms.txt: AI'a doğrudan konuşmak">
            <p>llms.txt, sitenizin köküne koyduğunuz bir markdown dosyası. AI crawler\'larına markanız hakkında yapılandırılmış,
              özlü bilgi verir. Detaylı rehber: <Link href="/blog/llms-txt-rehberi-2026" className="text-brand-deep underline">llms.txt rehberi</Link>.</p>
          </Chapter>

          <Chapter id="tr-market" n="07" t="Türkiye pazarında özel durumlar">
            <p>(1) Türkçe içerik AI modellerinde İngilizceye göre biraz daha hatalı yorumlanıyor — özellikle ek yapıları.
              Açık, net cümleler ve doğru özel ad yazımı önemli. (2) TR\'deki markaların çoğu yurt dışı GEO araçlarında yok — yerel araç (Independent AI) kullanmak avantajlı. (3) TR pazarında rakip tanıma kültürü düşük — bu sizin için fırsat.</p>
          </Chapter>

          <Chapter id="tools" n="08" t="Hangi araçları kullanmalısınız?">
            <p>(1) Bir GEO ölçüm aracı (Independent AI — TR\'ye özel) (2) Geleneksel SEO aracı (Google Search Console + 1 paid: Ahrefs/SEMrush) (3) Content analytics (kendi web sitenizde — Google Analytics yeterli)</p>
          </Chapter>

          <Chapter id="kpis" n="09" t="GEO'da hangi KPI'lara bakılır?">
            <ul>
              <li><strong>Aylık Görünürlük Skoru hedefi</strong> (örn. 60%\'dan başla, 80%\'e çek)</li>
              <li><strong>Rakip SoV vs sizin SoV</strong> (her ay)</li>
              <li><strong>Yeni izlenen soru sayısı</strong> (her ay 5-10 yeni soru)</li>
              <li><strong>Sentiment trend</strong> (negatif sentiment\'in 0\'da kalması)</li>
            </ul>
          </Chapter>

          <Chapter id="mistakes" n="10" t="En sık yapılan 5 hata">
            <ul>
              <li><strong>Tek modelle ölçüm:</strong> Sadece ChatGPT\'ye bakmak yeterli sanmak.</li>
              <li><strong>Kendi markanızı sorgulamak:</strong> "Acme iyi mi?" sorgu izlemek anlamsız — markanız zaten geçer. "En iyi muhasebe yazılımı" sorgu izleyin.</li>
              <li><strong>Çok az alias eklemek:</strong> Sadece ana ad yetmez. Domain, alternatif yazımlar, kısaltmalar — hepsi.</li>
              <li><strong>Trend yerine snapshot:</strong> "Bugün %65" bilgisi tek başına anlamsız. 30 günlük trend kritik.</li>
              <li><strong>Rakipsiz ölçüm:</strong> Görünürlüğünüz yüksek ama rakipleriniz daha yüksekse, hâlâ kaybediyorsunuz.</li>
            </ul>
          </Chapter>

          <Chapter id="roadmap" n="11" t="90 günlük başlangıç planı">
            <p><strong>Gün 1-7:</strong> Independent AI hesabı aç. 5-10 izlenebilir soru tanımla. İlk dashboard\'unu ölç.</p>
            <p><strong>Gün 8-30:</strong> Rakiplerini düzgün tanımla. llms.txt ekle. AI modellerinin sevdiği içerik tipinde 2-3 makale yayınla.</p>
            <p><strong>Gün 31-60:</strong> Trend analizi yap. Hangi modellerde zayıfsın? Oraya özel içerik üret.</p>
            <p><strong>Gün 61-90:</strong> SoV\'unu 10 puan artırmayı hedefle. Yeni sorgular ekle, content çalışmalarını 2x\'le.</p>
          </Chapter>

          <Chapter id="future" n="12" t="Geleceğe bakış: 2027 ve sonrası">
            <p>2027\'de AI modelleri muhtemelen kendi içlerinde "premium öneri" mekanizması açacak (Google\'daki ads gibi). Bu olmadan önce organik görünürlüğünüzü maksimuma çıkarmak hayati.</p>
            <p>2028\'de kişiselleştirilmiş AI cevapları yaygınlaşacak — kullanıcının önceki etkileşimlerine, lokasyonuna, tercihlerine göre farklı markalar önerilecek. GEO o zaman çok daha karmaşıklaşacak.</p>
            <p>Şu an erken aşamadayız. Bugün GEO\'ya yatırım yapan markalar 2027-2028\'de avantajlı konumda olacak.</p>
          </Chapter>
        </Container>
      </article>

      <CtaBlock />
    </>
  );
}

function Chapter({ id, n, t, children }: { id: string; n: string; t: string; children: React.ReactNode }) {
  return (
    <section id={id} className="py-10 border-b-hairline border-hairline last:border-0">
      <div className="font-mono text-[11px] tracking-eyebrow text-brand">BÖLÜM {n}</div>
      <h2 className="font-display text-[28px] lg:text-[32px] tracking-tight mt-3">{t}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-[1.75] text-ink-muted [&_strong]:text-ink [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
