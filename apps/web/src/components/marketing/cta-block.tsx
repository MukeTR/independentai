import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '../container';
import { getOffer } from '@/server/offer';

/**
 * Pazarlama kapanış CTA'sı (sunucu bileşeni). Deneme süresi getOffer()'dan gelir; sayfalar
 * varsayılan metni ezmek için title/body/eyebrow geçebilir.
 */
export async function CtaBlock({
  eyebrow = 'Önce ücretsiz',
  title,
  body = 'Alan adınızı girin, şok raporunuzu görün. Sürekli ölçüm ve yapılacaklar için hesap açın; kart gerekmez.',
  primaryHref = '/register',
  primaryLabel,
  secondaryHref = '/pricing',
  secondaryLabel = 'Fiyatlandırmayı gör',
}: {
  eyebrow?: string;
  title?: React.ReactNode;
  body?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const offer = await getOffer();
  const heading = title ?? (
    <>
      Rapor ücretsiz, <span className="text-brand">Yanıt {offer.trialDays} gün deneme.</span>
    </>
  );
  const primary = primaryLabel ?? `${offer.trialDays} gün ücretsiz dene`;
  return (
    <section className="py-20">
      <Container>
        <div className="card bg-paper-3 p-12 relative overflow-hidden">
          <div
            className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.12), transparent 70%)' }}
          />
          <div
            className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.08), transparent 70%)' }}
          />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 chip">
              <Sparkles className="w-3 h-3 text-brand" aria-hidden />
              <span className="font-mono tracking-eyebrow">{eyebrow}</span>
            </div>
            <h2 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">{heading}</h2>
            <p className="text-[16px] text-ink-muted mt-5">{body}</p>
            <div className="mt-9 flex items-center gap-3 flex-wrap">
              <Link href={primaryHref} className="btn-primary inline-flex items-center gap-2">
                {primary} <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
              <Link href={secondaryHref} className="btn-secondary">
                {secondaryLabel}
              </Link>
              <span className="text-[12px] text-ink-faint font-mono ml-2">kart gerekmez · istediğiniz zaman iptal</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
