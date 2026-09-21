import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/json-ld';

/**
 * Ana sayfa açık temada (Yanıt landing): beyaz zemin, 1px hairline kartlar, tek sıcak vurgu.
 * Header/footer sitenin geri kalanıyla aynı.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
