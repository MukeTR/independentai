import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { OrganizationJsonLd } from '@/components/json-ld';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OrganizationJsonLd />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
