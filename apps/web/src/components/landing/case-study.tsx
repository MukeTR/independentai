import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { DEMO } from './demo';

/**
 * Adım 7 · Temsili senaryo. Gerçek bir müşteri vakası DEĞİLDİR: alan adları .example, rakamlar DEMO'dan.
 * Amaç yöntemi göstermek; "şu müşteriyi 1. sıraya taşıdık" iddiası kurmak değil. Gerçek sonuçlar sorgu,
 * model ve tarih damgasıyla panelde görülür.
 */

const PROBLEMS = [
  'Organization şeması eksik',
  'Hizmet sayfası soruya cevap vermiyor',
  'Karşılaştırma içeriği yok',
  'Dizin ve kaynaklarda kayıt yok',
  'Marka adı yazımı tutarsız',
  'Yönlendirme zinciri 3 adım',
];

function AnswerCard({
  title,
  items,
  highlight,
  tone,
}: {
  title: string;
  items: string[];
  highlight: number;
  tone: 'before' | 'after';
}) {
  return (
    <div className="card p-6 h-full">
      <div className="flex items-center justify-between">
        <span className={`chip !text-[10.5px] ${tone === 'after' ? 'own' : ''}`}>{title}</span>
        <span className="text-[10px] font-mono text-ink-faint uppercase tracking-wider">temsili · ChatGPT</span>
      </div>
      <div className="mt-4 rounded-xl border border-hairline bg-paper-2/70 p-4">
        <div className="text-[11px] font-mono text-ink-faint">Soru</div>
        <p className="text-[13.5px] text-ink mt-1 leading-snug">
          Türkiye’de Trendyol mağazamı yönetecek iyi bir ajans arıyorum.
        </p>
      </div>
      <ol className="mt-4 space-y-2">
        {items.map((it, i) => (
          <li
            key={it}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] ${
              i === highlight ? 'bg-brand-glow text-ink border border-brand/30' : 'text-ink-muted'
            }`}
          >
            <span className="font-mono text-[11px] w-4 text-ink-faint">{i + 1}.</span> {it}
          </li>
        ))}
      </ol>
      {tone === 'before' && <p className="text-[12.5px] text-danger mt-4">{DEMO.domain} cevapta yok.</p>}
      {tone === 'after' && (
        <p className="text-[12.5px] text-positive mt-4">{DEMO.domain} cevapta geçiyor (temsili hedef).</p>
      )}
    </div>
  );
}

export function CaseStudy() {
  return (
    <section className="py-20 lg:py-28 border-t border-hairline">
      <Container>
        <Reveal>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="eyebrow text-brand-deep">Adım 7 · Yöntem uçtan uca</div>
            <span className="chip !text-[10.5px]">Temsili senaryo — gerçek vaka değil</span>
          </div>
          <h2 className="font-display text-[34px] lg:text-[48px] tracking-tight mt-3 max-w-3xl leading-[1.05]">
            Bul, düzelt, yeniden ölç. <span className="accent-text">Aynı soruyla, aynı modelde.</span>
          </h2>
          <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 max-w-2xl leading-relaxed">
            Aşağıdaki akış {DEMO.domain} adlı hayali bir şirket üzerinden yöntemi gösterir; alan adları ve sayılar
            temsilidir. Gerçek sonuç sorguya, modele ve tarihe bağlıdır ve panelde ekran görüntüsüyle durur; “her
            sorguda birincilik” gibi bir söz vermiyoruz.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-stretch">
          <Reveal>
            <AnswerCard
              title="Önce"
              items={['rakip-a.example', 'rakip-b.example', 'rakip-c.example']}
              highlight={-1}
              tone="before"
            />
          </Reveal>

          <Reveal delay={90}>
            <div className="card grad-border p-6 h-full lg:w-[300px] flex flex-col justify-center">
              <div className="font-mono text-[11px] tracking-eyebrow text-brand">Yanıt raporu · temsili</div>
              <div className="font-display text-[30px] mt-2">{DEMO.issues} bulgu</div>
              <ul className="mt-4 space-y-1.5">
                {PROBLEMS.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[13.5px] text-ink-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" /> {p}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center gap-2 text-[12px] text-ink-faint">
                <span className="lg:hidden">↓</span>
                <ArrowRight className="hidden lg:block w-4 h-4" aria-hidden /> siz ya da Yanıt Agency düzeltir
              </div>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <AnswerCard
              title="Sonra"
              items={[DEMO.domain, 'rakip-a.example', 'rakip-b.example']}
              highlight={0}
              tone="after"
            />
          </Reveal>
        </div>

        <Reveal delay={220}>
          <div className="mt-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="font-display text-[22px] lg:text-[28px] tracking-tight">
              Ölçüm her sabah tekrar eder; <span className="accent-text">değişim panelde görünür.</span>
            </p>
            <Link
              href="/how-it-works"
              className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1.5 font-mono"
            >
              Yöntemi okuyun <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
