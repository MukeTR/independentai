'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Counts from 0 → `to` once the element scrolls into view (rAF-driven).
 *
 * Erişilebilirlik / SEO:
 *  - Sunucu çıktısında ve JS kapalıyken nihai değer HTML'de bulunur (animasyon yalnızca
 *    hydration sonrası, görünür ekranda başlar). Bu sayede crawler ve ekran okuyucu
 *    "0" değil gerçek sayıyı görür.
 *  - Ekran okuyucuya hep nihai değer okunur (sr-only span); animasyonlu metin `aria-hidden`.
 *  - `prefers-reduced-motion: reduce` ise animasyon hiç başlamaz.
 */
export function Counter({
  to,
  duration = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  // İlk render (SSR + hydration) nihai değeri gösterir; animasyon karar verildikten sonra 0'dan başlar.
  const [val, setVal] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setVal(to);
      return;
    }

    let raf = 0;
    let started = false;
    const run = () => {
      let startTs = 0;
      const tick = (ts: number) => {
        if (!startTs) startTs = ts;
        const p = Math.min(1, (ts - startTs) / duration);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(to * eased);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            setVal(0);
            run();
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);

  const fmt = (n: number) =>
    n.toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const finalText = `${prefix}${fmt(to)}${suffix}`;

  return (
    <span ref={ref} className={className}>
      {/* Görsel/animasyonlu değer — ekran okuyucudan gizli; nihai değer aşağıdaki sr-only span'da */}
      <span aria-hidden="true">
        {prefix}
        {fmt(val)}
        {suffix}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
