import { Container } from '@/components/container';
import { Reveal } from '@/components/marketing/reveal';
import { publishedReferenceLogos } from '@/server/reference-logos';

/**
 * Referans şeridi — /admin/referanslar'dan yönetilir. Logolar gri tonda durur, fareyle üzerine
 * gelindiğinde (ya da klavyeyle odaklanıldığında) renklenir.
 *
 * Yayında kayıt yoksa HİÇBİR ŞEY render edilmez: boş şerit, yer tutucu ya da başlık kalmaz.
 * DB'ye erişilemezse `publishedReferenceLogos` boş liste döner, bölüm yine sessizce görünmez.
 *
 * Logolar `<img>` ile verilir: alan adları serbest, next/image remotePatterns tanımlı değil.
 */
export async function ReferenceLogos() {
  const items = await publishedReferenceLogos();
  if (items.length === 0) return null;

  return (
    <section className="py-12 lg:py-16 border-t border-hairline" aria-labelledby="referanslar-baslik">
      <Container>
        <Reveal>
          <h2 id="referanslar-baslik" className="eyebrow text-center">
            Birlikte çalıştığımız markalar
          </h2>
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-7 lg:gap-x-14">
            {items.map((item) => {
              const logo = (
                /* eslint-disable-next-line @next/next/no-img-element -- referans logoları serbest alan adlarından gelir; next/image remotePatterns tanımlı değil */
                <img
                  src={item.logoUrl}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-7 lg:h-8 w-auto max-w-[140px] object-contain grayscale opacity-55 transition duration-300 group-hover:grayscale-0 group-hover:opacity-100 group-focus-visible:grayscale-0 group-focus-visible:opacity-100"
                />
              );
              const title = item.sector ? `${item.name} — ${item.sector}` : item.name;

              return (
                <li key={item.id} className="shrink-0">
                  {item.siteUrl ? (
                    <a
                      href={item.siteUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      title={title}
                      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      {logo}
                    </a>
                  ) : (
                    <span className="group block" title={title}>
                      {logo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
