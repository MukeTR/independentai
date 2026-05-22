import { Container } from '@/components/container';
import { Section } from '@/components/section';
import { CtaBlock } from '@/components/marketing/cta-block';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { ArrowRight, MessagesSquare, Bot, GitBranch, Database, BarChart3 } from 'lucide-react';
import Link from 'next/link';

export const metadata = buildMetadata({
  title: 'Nasıl çalışır — Veri akışı, sorgu hattı, ölçüm metodolojisi',
  description: 'Sorgularınız nasıl çalışır, mention\'lar nasıl çıkartılır, metrikler nasıl hesaplanır — Independent AI\'ın altında ne var, açıkça anlatıyoruz.',
  path: '/how-it-works',
});

const STAGES = [
  {
    n: '01',
    icon: MessagesSquare,
    title: 'İzlenebilir soru tanımı',
    body: 'Müşterilerinizin AI\'a sorabileceği soruları yazarsınız. Sorgular "categorical" (en iyi …) veya "comparative" (X mi Y mi) olabilir. Bizim önerimiz: somut, alıcı niyeti içeren, marka-içermeyen sorular. "En iyi muhasebe yazılımı" iyi bir izleme sorusu; "KarPanel iyi mi" değil — çünkü zaten markanız geçecek.',
  },
  {
    n: '02',
    icon: GitBranch,
    title: 'Multi-provider sorgu hattı',
    body: 'Her aktif soru için sistem 3 paralel API çağrısı yapar: OpenAI (gpt-4o-mini, temperature 0.7), Anthropic (claude-haiku-4-5), Google (gemini-1.5-flash). Cevap metinleri ve metadata (token, latency, cost) kaydedilir.',
  },
  {
    n: '03',
    icon: Bot,
    title: 'Marka mention extraction',
    body: 'Cevap metinlerinde markanızın tüm aliasları regex + word-boundary kontrolü ile aranır. Her hit için: pozisyon (kaçıncı bahsedilen marka), tonal değerlendirme (heuristic: pozitif/nötr/negatif anahtar kelimeler), bağlam (±80 karakter snippet).',
  },
  {
    n: '04',
    icon: Database,
    title: 'Veri saklama',
    body: 'Her ModelRun bir kayıt: prompt × model × tarih. Her run\'ın altında 0-N BrandMention. Postgres üzerinde saklanır, geçmiş tüm sorgular sorgulanabilir kalır. Veri 30 gün boyunca trend, 90+ gün arşivde.',
  },
  {
    n: '05',
    icon: BarChart3,
    title: 'Metrik agregasyonu',
    body: 'Dashboard\'a girince son 30 günlük tüm run\'lar agregate edilir. Görünürlük skoru: markanızın geçtiği run / toplam run. SoV: sizin mention / (sizin + rakipler). Trend: günlük gruplama. Modele göre dağılım: provider × görünürlük.',
  },
];

const DAILY_CRON = [
  '02:00 (TR) - Vercel Cron tetiklenir',
  '02:00:01 - Veri tabanından tüm aktif sorular çekilir',
  '02:00:02 - Her soru × 3 model paralel çalıştırılır',
  '02:00:30 - Sonuçlar BrandMention\'larla beraber DB\'ye yazılır',
  '02:00:32 - Anomali kontrolü (yakında: email alert)',
];

export default function HowItWorks() {
  return (
    <>
      <BreadcrumbJsonLd items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Nasıl çalışır', href: '/how-it-works' }]} />

      <section className="pt-24 pb-16">
        <Container className="max-w-4xl">
          <div className="eyebrow">Nasıl çalışır</div>
          <h1 className="font-display text-[52px] lg:text-[68px] tracking-tight mt-4 leading-[1.02]">
            Kara kutu değiliz.<br />
            <span className="text-brand">Altında ne var, açıkça anlatıyoruz.</span>
          </h1>
          <p className="text-[17px] text-ink-muted mt-7 leading-relaxed max-w-2xl">
            Independent AI'ın veri toplama hattı, ölçüm metodolojisi ve agregasyon mantığı. Sayılarınızın nereden
            geldiğini bilmek, onlara güvenmenin temelidir.
          </p>
        </Container>
      </section>

      {/* Stages */}
      <section className="py-16">
        <Container>
          <div className="space-y-6">
            {STAGES.map((s) => (
              <div key={s.n} className="card p-7 lg:p-9 grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-3 flex md:flex-col items-center md:items-start gap-4">
                  <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
                  <s.icon className="w-7 h-7 text-brand" />
                </div>
                <div className="col-span-12 md:col-span-9">
                  <h2 className="font-display text-[24px] lg:text-[28px] leading-snug">{s.title}</h2>
                  <p className="text-[15px] text-ink-muted mt-4 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Daily cron diagram */}
      <Section
        eyebrow="Günlük akış"
        title="Her gece 02:00'de ne oluyor?"
        intro="Vercel Cron tarafından tetiklenen bir job, tüm aktif soruları paralel olarak yeniden çalıştırır. Sabah uyanmadan dashboardunuz hazırdır."
        className="bg-paper-2/40"
      >
        <div className="card p-8">
          <div className="space-y-3">
            {DAILY_CRON.map((line, i) => (
              <div key={i} className="flex items-start gap-3 font-mono text-[13px]">
                <span className="text-brand">▶</span>
                <span className="text-ink">{line}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Why we built it this way */}
      <Section eyebrow="Tasarım kararları" title="Neden böyle yaptık?">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-7">
            <div className="eyebrow">Neden 3 model?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">Tek modelle gerçekçi ölçüm olmaz</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Kullanıcılar farklı modellerde farklı sorgular yapıyor. ChatGPT'de 1.sıradasınız diye Claude'da da
              öyle olduğunuzu varsayamazsınız — bazen tam tersi. 3 model paralel sorgulayarak gerçek bir tablo
              elde ediliyor.
            </p>
          </div>
          <div className="card p-7">
            <div className="eyebrow">Neden günde 1 kez?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">AI cevapları stabil — daha sık ölçmek lüks</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Aynı modele aynı soruyu 1 saat içinde 10 kez sorduğunuzda cevap büyük ölçüde aynı kalıyor. Günlük
              sıklık trend ölçmek için yeterli; daha sık sorgu = daha fazla maliyet, marjinal değer az.
            </p>
          </div>
          <div className="card p-7">
            <div className="eyebrow">Neden alias matching, LLM değil?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">Hız, maliyet ve şeffaflık üçgeni</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Her cevabı bir LLM\'e "bu markadan bahsediyor mu" diye sormak çok pahalı + sonuçlar değişken olur.
              Alias matching deterministik, hızlı, ucuz ve denetlenebilir. Düşük precision/recall ile sonuçlanırsa
              LLM-tabanlı extraction'ı opsiyonel olarak ekleyeceğiz.
            </p>
          </div>
          <div className="card p-7">
            <div className="eyebrow">Neden Türkçe öncelikli?</div>
            <h3 className="font-display text-[19px] mt-3 leading-snug">TR pazarında bağımsız bir oyuncu yok</h3>
            <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">
              Profound, Otterly, Athena gibi global oyuncular Türkçe sorgulara da cevap veriyor ama Türk pazarına
              özel yok. Biz TR markaları için, TR alias'ları için, TR'deki rakip dinamiklerine göre optimize ettik.
            </p>
          </div>
        </div>
      </Section>

      <CtaBlock />
    </>
  );
}
