'use client';

import { useEffect, useId, useState } from 'react';
import { ExternalLink, ImageOff, Loader2, RefreshCw, Search } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { InlineAlert } from '@/components/ui/inline-alert';
import type { ConnectionStatus, ProductDto, ProductsResponse } from './integrations-types';

const PAGE = 20;

function formatPrice(p: ProductDto): string {
  const { min, max } = p.price;
  if (min == null && max == null) return '—';
  const fmt = (n: number) => {
    if (p.currency && /^[A-Z]{3}$/.test(p.currency)) {
      try {
        return new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: p.currency,
          maximumFractionDigits: 2,
        }).format(n);
      } catch {
        /* geçersiz para kodu → sade biçim */
      }
    }
    return `${n.toLocaleString('tr-TR')}${p.currency ? ` ${p.currency}` : ''}`;
  };
  if (min != null && max != null && max !== min) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min ?? max) as number);
}

const AVAIL: Record<ProductDto['availability'], { label: string; cls: string }> = {
  IN_STOCK: { label: 'Stokta', cls: 'text-positive' },
  OUT_OF_STOCK: { label: 'Stok yok', cls: 'text-danger' },
  UNKNOWN: { label: 'Bilinmiyor', cls: 'text-ink-faint' },
};

/**
 * Bağlantının katalog önizlemesi: ilk 20 ürün + arama. Salt-okunur; senkron verisinin doğru
 * çekildiğini kullanıcıya göstermek için (görsel, başlık, fiyat, stok, kategori, SEO başlığı var/yok).
 */
export function CatalogPreview({ connectionId, status }: { connectionId: string; status: ConnectionStatus }) {
  const searchId = useId();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (status === 'DISCONNECTED') return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: String(PAGE) });
    if (debounced) params.set('q', debounced);
    apiFetch<ProductsResponse>(`/api/integrations/${encodeURIComponent(connectionId)}/products?${params}`)
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Ürünler yüklenemedi'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [connectionId, debounced, status, tick]);

  if (status === 'DISCONNECTED') {
    return (
      <InlineAlert tone="info" className="mt-4">
        Bağlantı kesildi; katalog verisi arşivlendi. Yeniden bağlandığınızda ürünler ilk senkronla geri gelir.
      </InlineAlert>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-hairline bg-paper-2/40 p-4" aria-live="polite">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <label htmlFor={searchId} className="sr-only">
          Ürün ara
        </label>
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-ink-faint absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
          <input
            id={searchId}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Başlık, marka veya tür ara…"
            className="input !pl-8 !py-2 text-[13px]"
            maxLength={120}
          />
        </div>
        <div className="flex items-center gap-2 text-[12px] text-ink-faint">
          {data ? <span className="tabular">{data.total.toLocaleString('tr-TR')} ürün</span> : null}
          <button
            type="button"
            onClick={() => setTick((t) => t + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-hairline px-2 py-1 hover:bg-paper-3 transition"
            aria-label="Ürün listesini yenile"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} aria-hidden /> Yenile
          </button>
        </div>
      </div>

      {error && (
        <InlineAlert className="mt-3">
          {error}{' '}
          <button type="button" className="underline" onClick={() => setTick((t) => t + 1)}>
            Tekrar dene
          </button>
        </InlineAlert>
      )}

      {loading && !data && (
        <div className="mt-3 space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-paper-4/60 animate-pulse" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && !loading && (
        <p className="mt-3 text-[13px] text-ink-faint">
          {debounced
            ? `"${debounced}" için ürün bulunamadı.`
            : 'Henüz ürün yok — ilk senkron tamamlanınca ürünler burada görünür.'}
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-3 overflow-x-auto -mx-4 px-4">
          <table className="w-full min-w-[640px] text-[12.5px]">
            <caption className="sr-only">Katalog önizlemesi — ilk {PAGE} ürün</caption>
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wider text-ink-faint">
                <th scope="col" className="py-2 pr-3 font-medium w-12">
                  Görsel
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Ürün
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Fiyat
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Stok
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Kategori
                </th>
                <th scope="col" className="py-2 font-medium">
                  SEO başlığı
                </th>
              </tr>
            </thead>
            <tbody className={loading ? 'opacity-60' : ''}>
              {data.items.map((p) => (
                <tr key={p.id} className="border-t border-hairline align-top">
                  <td className="py-2 pr-3">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- sağlayıcı CDN alan adları değişken; next/image remotePatterns tanımlı değil
                      <img
                        src={p.imageUrl}
                        alt={p.imageAlt ?? ''}
                        width={40}
                        height={40}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-md object-cover bg-paper-4"
                      />
                    ) : (
                      <span
                        className="w-10 h-10 rounded-md bg-paper-4 flex items-center justify-center text-ink-faint"
                        aria-label="Görsel yok"
                      >
                        <ImageOff className="w-4 h-4" aria-hidden />
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 max-w-[260px]">
                    <div className="text-ink line-clamp-2">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-brand-deep inline-flex items-start gap-1"
                        >
                          {p.title}
                          <ExternalLink className="w-3 h-3 mt-0.5 shrink-0 text-ink-faint" aria-hidden />
                        </a>
                      ) : (
                        p.title
                      )}
                    </div>
                    {p.vendor && <div className="text-[11px] text-ink-faint mt-0.5">{p.vendor}</div>}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap tabular">{formatPrice(p)}</td>
                  <td className={`py-2 pr-3 whitespace-nowrap ${AVAIL[p.availability].cls}`}>
                    {AVAIL[p.availability].label}
                  </td>
                  <td className="py-2 pr-3 text-ink-muted max-w-[200px]">
                    <span className="line-clamp-2">
                      {[p.productType, ...p.categories].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="py-2">
                    {p.hasSeoTitle ? (
                      <span className="chip own !text-[10px]">var</span>
                    ) : (
                      <span
                        className="chip !text-[10px]"
                        title="SEO başlığı boş; ürün sayfası testinde puan kaybettirir"
                      >
                        yok
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.nextCursor && (
            <p className="text-[11.5px] text-ink-faint mt-2">
              İlk {PAGE} ürün gösteriliyor; tamamı için arama kutusunu kullanın.
            </p>
          )}
        </div>
      )}
      {loading && data && (
        <div className="text-[11.5px] text-ink-faint mt-2 inline-flex items-center gap-1" aria-busy="true">
          <Loader2 className="w-3 h-3 animate-spin" aria-hidden /> Güncelleniyor…
        </div>
      )}
    </div>
  );
}
