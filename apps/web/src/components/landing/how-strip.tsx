import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { CizSteps } from '@/components/marketing/ciz';

/** Landing'in görsel özeti: üç adım, üç çizim, az metin. */
export function HowStrip() {
  return (
    <section className="py-20 lg:py-24 border-t border-hairline">
      <Container>
        <Reveal>
          <div className="max-w-2xl">
            <div className="eyebrow">Üç adım</div>
            <h2 className="font-display text-[32px] lg:text-[42px] tracking-tight mt-3 leading-[1.05]">
              Bul, düzelt, tekrar ölç.
            </h2>
          </div>
        </Reveal>
        <Reveal delay={90}>
          <CizSteps
            className="mt-12"
            steps={[
              {
                name: 'analiz',
                alt: 'Büyüteçle taranan bir web sayfası ve üzerinde işaretlenmiş bulgular',
                step: 'Analiz',
                title: 'Sitenizi okuruz',
                body: 'Kurulum yok. Adresinizi yazın, eksikleri tek tek gösterelim.',
              },
              {
                name: 'yapilacaklar',
                alt: 'Üzerindeki ilk maddesi işaretlenmiş yapılacaklar listesi',
                step: 'Düzelt',
                title: 'Sıradaki işi söyleriz',
                body: 'Skor değil, iş listesi. Her maddede “nasıl yapılır” var.',
              },
              {
                name: 'olc',
                alt: 'Yükselen bir çizgi grafiği ve ucundaki küçük bayrak',
                step: 'Ölç',
                title: 'Değişimi izleriz',
                body: 'Aynı soru, aynı model, her sabah. Fark panelde görünür.',
              },
            ]}
          />
        </Reveal>
      </Container>
    </section>
  );
}
