import type { AuthorShare } from '@/server/openrouter-rankings';

/**
 * Sağlayıcı dağılımı — tek çubukta %100 yığılmış şerit.
 *
 * NE İŞE YARAR: altındaki liste sağlayıcıları tek tek gösterir; bu şerit ise tüm listeyi TEK
 * bakışta verir. "İlk üç sağlayıcı çubuğun yarısından fazlasını kaplıyor" gibi bir çıkarım,
 * on üç satırı okumadan görünür.
 *
 * ERİŞİLEBİLİRLİK: şerit `aria-hidden`. Aynı sayılar hemen altındaki listede ve model
 * tablosunda metin olarak zaten var; ekran okuyucuya üçüncü kez okutmanın faydası yok.
 * Bu yüzden dilimler odaklanabilir de değildir — fare üstüne gelince adı ve payı belirir.
 *
 * KÜTÜPHANE YOK: saf CSS. Dilim genişliği doğrudan `sharePct` değeridir, ölçeklenmez.
 * Tonlar tek bir maviden türetilir (koyudan açığa), marka renkleri kullanılmaz.
 */
export function ProviderStackBar({ authors }: { authors: AuthorShare[] }) {
  if (authors.length === 0) return null;
  const toplam = authors.reduce((a, x) => a + x.sharePct, 0);
  if (toplam <= 0) return null;

  return (
    <div aria-hidden className="select-none">
      <div className="flex w-full h-11 rounded-lg overflow-hidden border border-hairline bg-paper-4">
        {authors.map((a, i) => {
          // Dilim payın kendisidir; yalnız toplam 100'den saparsa normalize edilir.
          const genislik = (a.sharePct / toplam) * 100;
          // 1,00 → 0,28 arası düşen tek renk tonu: ilk sağlayıcı en koyu, son sağlayıcı en açık.
          // Karekök eğrisi, baştaki geniş dilimlerin birbirinden ayrılmasını sağlar; doğrusal
          // rampada ilk dört dilim neredeyse aynı tonda kalıyordu.
          const ton = 1 - Math.sqrt(i / Math.max(1, authors.length - 1)) * 0.72;
          return (
            <span
              key={a.author}
              title={`${a.author} — token payı %${a.sharePct.toLocaleString('tr-TR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              className="group relative h-full min-w-0 flex items-center justify-center transition-[filter] duration-150 hover:brightness-110"
              style={{
                width: `${genislik}%`,
                backgroundColor: 'var(--brand)',
                opacity: ton,
                boxShadow: i === authors.length - 1 ? undefined : 'inset -1px 0 0 rgba(255,255,255,0.85)',
              }}
            >
              {/*
                Ad yalnız sığdığı yerde yazılır: telefonda çubuk dar olduğu için eşik yüksek,
                geniş ekranda düşük. Sığmayan dilimin adı fareyle üzerine gelince `title`'da görünür.
              */}
              {genislik >= 6 && (
                <span
                  className={`px-1 text-[10.5px] font-mono text-white/95 truncate leading-none ${
                    genislik >= 12 ? '' : 'hidden sm:inline-block'
                  }`}
                >
                  {a.author}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {/* Ölçek — şeridin neyi kapladığını gösteren ince cetvel. */}
      <div className="flex justify-between mt-1.5 text-[10.5px] font-mono text-ink-faint tabular">
        <span>%0</span>
        <span>%25</span>
        <span>%50</span>
        <span>%75</span>
        <span>%100</span>
      </div>
    </div>
  );
}
