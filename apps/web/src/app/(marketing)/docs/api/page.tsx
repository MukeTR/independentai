import Link from 'next/link';
import { Container } from '@/components/container';
import { BreadcrumbJsonLd } from '@/components/json-ld';
import { buildMetadata } from '@/lib/seo';
import { Clock, ArrowLeft } from 'lucide-react';

export const metadata = buildMetadata({
  title: 'API Referansı — Yakında',
  description: 'Independent AI REST API referansı. Şu an dahili olarak geliştiriliyor, kısa süre içinde herkese açılacak.',
  path: '/docs/api',
});

export default function ApiDocs() {
  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: 'Ana sayfa', href: '/' },
        { name: 'Dokümantasyon', href: '/docs' },
        { name: 'API', href: '/docs/api' },
      ]} />

      <section className="py-24">
        <Container className="max-w-3xl">
          <Link href="/docs" className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint hover:text-ink">
            <ArrowLeft className="w-3 h-3" /> Dokümantasyon
          </Link>

          <div className="card p-10 mt-8 text-center">
            <div className="chip own mx-auto mb-5">yakında</div>
            <Clock className="w-10 h-10 text-brand mx-auto" />
            <h1 className="font-display text-[36px] lg:text-[44px] tracking-tight mt-6">
              REST API yakında geliyor
            </h1>
            <p className="text-[15px] text-ink-muted mt-5 leading-relaxed max-w-xl mx-auto">
              Şu an API\'mizi dahili olarak geliştiriyoruz. Verilerinize programatik erişim, kendi araçlarınıza
              entegrasyon ve yığın iş akışları için tasarlanıyor.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 text-left">
              {[
                { t: 'Auth API', d: 'Bearer token tabanlı erişim, API key yönetimi.' },
                { t: 'Resource API', d: 'Brands, prompts, competitors için CRUD.' },
                { t: 'Metrics API', d: 'Dashboard verisinin programatik halinde sunulması.' },
              ].map((s) => (
                <div key={s.t} className="border-hairline border rounded-lg p-4">
                  <div className="font-display text-[14px]">{s.t}</div>
                  <p className="text-[12px] text-ink-muted mt-2 leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <Link href="/contact" className="btn-primary inline-flex items-center gap-2">
                Erken erişim için yazın
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
