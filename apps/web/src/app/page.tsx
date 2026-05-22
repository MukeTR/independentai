import Link from 'next/link';
import { ArrowRight, Sparkles, BarChart3, Users, Bell, Globe2 } from 'lucide-react';
import { Logo } from '@/components/logo';

const PROVIDERS = [
  { name: 'ChatGPT', sub: 'OpenAI' },
  { name: 'Claude', sub: 'Anthropic' },
  { name: 'Gemini', sub: 'Google' },
];

const SAMPLE_PROMPTS = [
  'Restoranlar için en iyi kar-zarar yazılımı hangisi?',
  'Türkiye\'de hangi e-ticaret platformu önerirsin?',
  'KOBİ\'ler için en iyi muhasebe programı nedir?',
];

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Top nav */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-7 flex items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-7 text-[13px] text-ink-muted">
          <a href="#nasil-calisir" className="hover:text-ink">Nasıl çalışır</a>
          <a href="#kimler-icin" className="hover:text-ink">Kimler için</a>
          <a href="#fiyat" className="hover:text-ink">Fiyatlandırma</a>
          <Link href="/login" className="hover:text-ink">Giriş</Link>
          <Link href="/register" className="btn-primary inline-flex items-center gap-1.5">
            Ücretsiz Başla <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="rise-1 inline-flex items-center gap-2 chip">
          <Sparkles className="w-3 h-3 text-brand" />
          <span className="font-mono tracking-eyebrow">Lansman · İlk 6 ay tüm kullanıcılara ücretsiz</span>
        </div>

        <h1 className="rise-2 font-display text-[64px] leading-[1.02] tracking-tight mt-7 max-w-4xl">
          Yapay zekalar şirketinizden{' '}
          <span className="text-brand">bahsediyor mu?</span>
        </h1>

        <p className="rise-3 text-[18px] text-ink-muted mt-6 max-w-2xl leading-relaxed">
          Müşterileriniz artık Google'da değil, ChatGPT'de, Claude'da, Gemini'de
          öneri istiyor. Independent AI; bu sohbetlerde markanızın ne kadar geçtiğini,
          rakiplerinizle nasıl konumlandığınızı, hangi modelde nasıl göründüğünüzü
          bağımsız bir gözle ölçer.
        </p>

        <div className="rise-4 flex items-center gap-3 mt-9">
          <Link href="/register" className="btn-primary inline-flex items-center gap-2">
            6 ay ücretsiz dene <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/login" className="btn-secondary">Hesabım var</Link>
          <span className="text-[12px] text-ink-faint ml-2 font-mono">kredi kartı gerekmez</span>
        </div>

        {/* Provider strip */}
        <div className="rise-5 mt-16 card p-7">
          <div className="eyebrow mb-5">İzlediğimiz Modeller</div>
          <div className="grid grid-cols-3 gap-6">
            {PROVIDERS.map((p) => (
              <div key={p.name} className="flex items-baseline justify-between border-b-hairline border-hairline pb-3">
                <div>
                  <div className="font-display text-[22px]">{p.name}</div>
                  <div className="font-mono text-[10px] tracking-eyebrow text-ink-faint mt-1">{p.sub}</div>
                </div>
                <span className="chip">aktif</span>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-ink-faint mt-5 font-mono">
            // Perplexity, Grok, Mistral sonraki sürümlerde
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="nasil-calisir" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow">Nasıl çalışır</div>
        <h2 className="font-display text-[40px] tracking-tight mt-3 max-w-3xl">
          Üç adım — sonra her sabah size rapor.
        </h2>

        <div className="grid grid-cols-3 gap-6 mt-12">
          {[
            {
              n: '01',
              title: 'Markanızı tanıtın',
              body: 'Şirket adı, alternatif yazımlar, web sitesi ve 3-5 rakip ekleyin. 2 dakika sürer.',
            },
            {
              n: '02',
              title: 'İzlenecek soruları girin',
              body: 'Müşterilerinizin AI\'a sorabileceği soruları yazın — örneğin "en iyi muhasebe yazılımı".',
            },
            {
              n: '03',
              title: 'Her sabah rapor',
              body: 'Sistem her gece 3 modelde tüm soruları çalıştırır, sabah görünürlüğünüzü ve rakip dağılımınızı dashboard\'da görürsünüz.',
            },
          ].map((s) => (
            <div key={s.n} className="card p-7">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">{s.n}</div>
              <h3 className="font-display text-[20px] mt-4">{s.title}</h3>
              <p className="text-[14px] text-ink-muted mt-3 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sample prompts mock */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        <div className="card p-8">
          <div className="eyebrow mb-4">Örnek izlenebilir sorular</div>
          <div className="space-y-3">
            {SAMPLE_PROMPTS.map((p) => (
              <div key={p} className="flex items-center justify-between border-b-hairline border-hairline pb-3 last:border-0 last:pb-0">
                <div className="font-mono text-[13px] text-ink">{p}</div>
                <div className="flex gap-2">
                  <span className="chip own">KarPanel · 1.sırada</span>
                  <span className="chip comp">2 rakip</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section id="kimler-icin" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="eyebrow">Kimler için</div>
        <h2 className="font-display text-[40px] tracking-tight mt-3 max-w-3xl">
          Müşterileri AI'dan öneri alan herkes için.
        </h2>

        <div className="grid grid-cols-4 gap-5 mt-12">
          {[
            { icon: BarChart3, t: 'SaaS şirketleri', d: 'Yazılım önerilerinde geçiyor musunuz?' },
            { icon: Users, t: 'Ajanslar', d: 'Müşterilerinizin GEO performansını ölçün.' },
            { icon: Globe2, t: 'E-ticaret', d: '"En iyi … markası" sorularında siz misiniz?' },
            { icon: Bell, t: 'Pazarlama ekipleri', d: 'AI görünürlüğünüzde düşüş olunca anında haberdar olun.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="card p-6">
              <Icon className="w-5 h-5 text-brand" />
              <h3 className="font-display text-[17px] mt-4">{t}</h3>
              <p className="text-[13px] text-ink-muted mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing — 6 months free */}
      <section id="fiyat" className="relative z-10 max-w-6xl mx-auto px-6 py-20">
        <div className="card p-10 bg-paper-3 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.10), transparent 70%)' }} />
          <div className="relative">
            <div className="eyebrow">Lansman promosyonu</div>
            <h2 className="font-display text-[48px] tracking-tight mt-3 leading-[1.05]">
              İlk 6 ay tüm kullanıcılara <span className="text-brand">tamamen ücretsiz.</span>
            </h2>
            <p className="text-[16px] text-ink-muted mt-5 max-w-2xl">
              Bugün kayıt olan herkes, hesap kuruluş tarihinden itibaren 6 ay boyunca tüm özellikleri sınırsız kullanır.
              Kredi kartı bilgisi istemiyoruz. 6 ay sonunda devam etmek isterseniz fiyatlandırmamızı paylaşırız —
              istemiyorsanız hesabınız donar, kalır.
            </p>

            <ul className="grid grid-cols-2 gap-4 mt-9 text-[14px] text-ink-muted">
              <li className="flex items-start gap-3"><span className="text-brand mt-0.5">✓</span> 3 model: ChatGPT, Claude, Gemini</li>
              <li className="flex items-start gap-3"><span className="text-brand mt-0.5">✓</span> Sınırsız izlenebilir soru</li>
              <li className="flex items-start gap-3"><span className="text-brand mt-0.5">✓</span> Sınırsız rakip takibi</li>
              <li className="flex items-start gap-3"><span className="text-brand mt-0.5">✓</span> Günlük otomatik rerun + trend grafikleri</li>
              <li className="flex items-start gap-3"><span className="text-brand mt-0.5">✓</span> Share of Voice rakip karşılaştırması</li>
              <li className="flex items-start gap-3"><span className="text-brand mt-0.5">✓</span> Anında manuel "şimdi çalıştır"</li>
            </ul>

            <div className="mt-10 flex items-center gap-3">
              <Link href="/register" className="btn-primary inline-flex items-center gap-2">
                Hemen ücretsiz başla <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-[12px] text-ink-faint font-mono">kredi kartı yok · taahhüt yok</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 max-w-6xl mx-auto px-6 py-10 mt-10 border-t-hairline border-hairline flex items-center justify-between text-[12px] text-ink-faint">
        <div>© 2026 Independent AI · independentai.space</div>
        <div className="font-mono">v0.1 · lansman edition</div>
      </footer>
    </main>
  );
}
