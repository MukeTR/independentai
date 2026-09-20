import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';

const SAAS = [
  'AI görünürlük takibi',
  'Rakip analizi',
  'Site audit',
  'Yapılacaklar listesi',
  'İçerik önerileri',
  'Kaynak fırsatları',
  'Haftalık ilerleme',
];
const AGENCY = [
  'Teknik düzenlemeler',
  'İçerik üretimi',
  'GEO / SEO',
  'PR & citation',
  'Entity building',
  'Dijital PR',
  'Rakip stratejisi',
  'Aylık growth sprint',
];

export function TwoPaths() {
  return (
    <section id="agency" className="py-20 lg:py-28 border-t border-hairline scroll-mt-16">
      <Container>
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <div className="eyebrow text-brand-deep">Adım 5 · Uygula</div>
            <h2 className="font-display text-[34px] lg:text-[48px] tracking-tight mt-3 leading-[1.05]">
              Nasıl ilerlemek istediğinize <span className="accent-text">siz karar verin.</span>
            </h2>
            <p className="text-[16px] lg:text-[18px] text-ink-muted mt-5 leading-relaxed">
              Aynı motor, iki kullanım şekli. Analizi Yanıt yapar; uygulamayı siz de yapabilirsiniz, ekibimiz de.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Reveal>
            <div className="card p-8 lg:p-10 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-display text-[26px]">Yanıt</div>
                <span className="chip !text-[10.5px]">SaaS</span>
              </div>
              <p className="font-display text-[20px] text-ink mt-4">Biz bulalım. Siz uygulayın.</p>
              <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">
                Danışman tutmadan ne yapacağınızı bilin. Her hafta "yapmanız gereken 7 şey" listesi; ekibiniz uygular.
              </p>
              <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {SAAS.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {s}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-9">
                <Link href="/register" className="btn-primary inline-flex items-center gap-2">
                  Yanıt'ı kullan <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <span className="block sm:inline text-[12px] text-ink-faint font-mono mt-3 sm:mt-0 sm:ml-3">
                  ilk 6 ay ücretsiz · kart yok
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="card grad-border p-8 lg:p-10 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <div className="font-display text-[26px]">
                  Yanıt <span className="accent-text">Agency</span>
                </div>
                <span className="chip own !text-[10.5px]">Ekiple</span>
              </div>
              <p className="font-display text-[20px] text-ink mt-4">Biz bulalım. Biz uygulayalım.</p>
              <p className="text-[14.5px] text-ink-muted mt-2 leading-relaxed">
                Soyut "GEO çalışması" değil: "53 sorun var, 11'i kritik, bu sprintte çözüyoruz." Yanıt'taki listeyi
                ekibimiz uygular, ilerlemeyi aynı panelden izlersiniz.
              </p>
              <ul className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                {AGENCY.map((s) => (
                  <li key={s} className="flex items-center gap-2 text-[14px]">
                    <Check className="w-3.5 h-3.5 text-brand shrink-0" aria-hidden /> {s}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-9">
                <Link href="/contact#sales" className="btn-secondary inline-flex items-center gap-2">
                  Ekiple görüş <ArrowRight className="w-4 h-4" aria-hidden />
                </Link>
                <span className="block sm:inline text-[12px] text-ink-faint font-mono mt-3 sm:mt-0 sm:ml-3">
                  aylık sprint · rapor Yanıt'ta
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
