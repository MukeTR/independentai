import Link from 'next/link';
import { Container } from '@/components/container';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { Webhook, ArrowLeft } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'Webhooks — Yakında',
  description: 'Independent AI webhooks. Olay tabanlı entegrasyon için tasarlanıyor.',
  path: '/docs/webhooks',
});

export default function WebhooksDocs() {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Ana sayfa', href: '/' },
        { name: 'Dokümantasyon', href: '/docs' },
        { name: 'Webhooks', href: '/docs/webhooks' },
      ]} />

      <section className="py-24">
        <Container className="max-w-3xl">
          <Link href="/docs" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Dokümantasyon
          </Link>

          <div className="card p-10 mt-8 text-center">
            <div className="chip own mx-auto mb-5">yakında</div>
            <Webhook className="w-10 h-10 text-brand mx-auto" />
            <h1 className="font-display text-[36px] lg:text-[44px] tracking-tight mt-6">
              Webhooks yakında
            </h1>
            <p className="text-[15px] text-ink-muted mt-5 leading-relaxed max-w-xl mx-auto">
              Olay tabanlı bildirimler için webhooks API\'sini hazırlıyoruz. Görünürlük düşüşü, yeni rakip
              tespiti veya cron tamamlanması gibi olayları kendi sistemlerinize iletmek için kullanılacak.
            </p>

            <div className="text-left mt-10" id="events">
              <h2 className="font-display text-[20px] tracking-tight mb-4">Planlanan olaylar</h2>
              <ul className="space-y-3">
                {[
                  { t: 'run.completed', d: 'Bir prompt için 3 modelin tamamı çalıştı.' },
                  { t: 'visibility.dropped', d: 'Markanızın görünürlüğü dünden bugüne %20+ düştü.' },
                  { t: 'competitor.surge', d: 'Bir rakibin görünürlüğü hızla arttı.' },
                  { t: 'cron.daily_completed', d: 'Günlük cron tüm aktif promptları tamamladı.' },
                ].map((e) => (
                  <li key={e.t} className="flex items-start gap-3 border-b-hairline border-hairline pb-3 last:border-0">
                    <code className="font-mono text-[12px] bg-paper-4 px-2 py-1 rounded shrink-0">{e.t}</code>
                    <span className="text-[13.5px] text-ink-muted">{e.d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
