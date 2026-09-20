import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/json-ld';

/**
 * Ana sayfa koyu temada (Yanıt landing). Sarmalayıcı token'ları geçersiz kılar; header/footer aynı
 * bileşenler, yalnızca renk değişkenleri değişir. Diğer pazarlama sayfaları açık temada kalır.
 */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-dark min-h-screen">
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <Header themeClass="theme-dark" />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
