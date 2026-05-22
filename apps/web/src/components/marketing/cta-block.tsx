import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Container } from '../container';

export function CtaBlock({
  eyebrow = 'Lansman promosyonu',
  title = (
    <>
      İlk 6 ay tüm kullanıcılara <span className="text-brand">tamamen ücretsiz.</span>
    </>
  ),
  body = 'Kayıt ol, markanı tanıt, sorular ekle. Her sabah uyandığında dashboardun seni bekliyor olacak.',
  primaryHref = '/register',
  primaryLabel = 'Hemen ücretsiz başla',
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
  return (
    <section className="py-20">
      <Container>
        <div className="card bg-paper-3 p-12 relative overflow-hidden">
          <div
            className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.12), transparent 70%)' }}
          />
          <div className="absolute -bottom-24 -left-24 w-[360px] h-[360px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.08), transparent 70%)' }}
          />
          <div className="relative max-w-3xl">
            <div className="inline-flex items-center gap-2 chip">
              <Sparkles className="w-3 h-3 text-brand" />
              <span className="font-mono tracking-eyebrow">{eyebrow}</span>
            </div>
            <h2 className="font-display text-[40px] lg:text-[52px] tracking-tight mt-5 leading-[1.05]">{title}</h2>
            <p className="text-[16px] text-ink-muted mt-5">{body}</p>
            <div className="mt-9 flex items-center gap-3 flex-wrap">
              <Link href={primaryHref} className="btn-primary inline-flex items-center gap-2">
                {primaryLabel} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href={secondaryHref} className="btn-secondary">
                {secondaryLabel}
              </Link>
              <span className="text-[12px] text-ink-faint font-mono ml-2">kredi kartı yok · taahhüt yok</span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
