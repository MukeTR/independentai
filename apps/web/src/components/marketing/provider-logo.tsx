import { saglayiciGorseli } from '@/lib/provider-logos';

/**
 * Sağlayıcı işareti — logo varsa maskeli SVG, yoksa monogram rozeti.
 *
 * NEDEN `<img>` DEĞİL: Simple Icons SVG'leri tek renklidir ama `<img>` içinde `currentColor`
 * çözülmez; logo siyah kalır ve sayfanın mürekkep tonuna uymaz. CSS maskesi kullanınca işaret
 * `bg-current` üzerinden metin rengini alır — yani `text-ink-muted` ne diyorsa logo o olur.
 * Marka renkleri hiçbir yerde taklit edilmez.
 *
 * ERİŞİLEBİLİRLİK: işaret dekoratiftir. Sağlayıcının adı her kullanımda metin olarak yanında
 * durur, bu yüzden `aria-hidden`. Ekran okuyucu aynı bilgiyi iki kez okumaz.
 */
export function ProviderLogo({
  slug,
  size = 16,
  className = '',
}: {
  slug: string;
  /** Kenar uzunluğu (px). Tablo hücresinde 14–16, kart başlığında 20–24 iyi durur. */
  size?: number;
  className?: string;
}) {
  const { src, monogram, label } = saglayiciGorseli(slug);

  if (src) {
    return (
      <span
        aria-hidden
        title={label}
        className={`inline-block shrink-0 bg-current align-[-0.15em] ${className}`}
        style={{
          width: size,
          height: size,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={label}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full border border-hairline font-mono leading-none tracking-tighter align-[-0.15em] ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(8, Math.round(size * 0.46)) }}
    >
      {monogram}
    </span>
  );
}
