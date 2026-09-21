'use client';

/**
 * Panel: bağlı katalog hazırlığı (GET /api/tools/catalog-readiness) ve ticari izleme sorusu önerileri
 * (GET /api/tools/commerce-prompts → POST /api/prompts ile takibe ekle). Polling yok; kullanıcı yeniler.
 */
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Plus, RefreshCw } from 'lucide-react';
import { InlineAlert } from '@/components/ui/inline-alert';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import {
  AxisBars,
  FindingsList,
  RecommendationCards,
  ScoreRing,
  type Axis,
  type Finding,
  type Recommendation,
} from '@/components/marketing/audit-result-view';

type Readiness = {
  productCount: number;
  sampleSize: number;
  score: number;
  breakdown: Record<string, number>;
  axes: Axis[];
  findings: Finding[];
  recommendations: Recommendation[];
  coverage: Record<string, number>;
  connections: { id: string; provider: string; storeDomain: string; lastSyncAt: string | null }[];
  computedAt: string;
};

export function CatalogReadinessPanel() {
  const hydrated = useHydrated();
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await apiFetch<Readiness>('/api/tools/catalog-readiness'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card p-6" aria-labelledby="catalog-readiness-title" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 id="catalog-readiness-title" className="font-display text-[18px]">
            Bağlı katalog hazırlığı
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1">
            Senkronlanan tüm ürünler üzerinden veri kalitesi: kategori, fiyat/para birimi, stok, GTIN/SKU, açıklama, alt
            metin, SEO alanları.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={!hydrated || loading}
          className="btn-secondary !py-2 !px-3 inline-flex items-center gap-2 text-[12.5px] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
          )}{' '}
          Yenile
        </button>
      </div>
      <div className="mt-5" aria-live="polite">
        {loading && !data && <div className="text-[13px] text-ink-faint">Katalog değerlendiriliyor…</div>}
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {data && data.productCount === 0 && (
          <InlineAlert tone="info">
            Henüz senkronlanmış ürün yok.{' '}
            <Link href="/dashboard/integrations" className="underline">
              Mağazanızı bağlayın
            </Link>{' '}
            — Shopify, ikas veya Ticimax kataloğunuz salt-okunur senkronlanır (sipariş/müşteri verisi çekilmez).
          </InlineAlert>
        )}
        {data && data.productCount > 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="flex flex-col items-center justify-center text-center">
                <ScoreRing score={data.score} caption="Katalog veri kalitesi" size={130} />
                <div className="text-[11.5px] text-ink-faint mt-1">
                  {data.sampleSize < data.productCount
                    ? `${data.sampleSize}/${data.productCount} ürün örneklendi`
                    : `${data.productCount} ürün`}
                </div>
              </div>
              <div className="lg:col-span-2">
                <AxisBars axes={data.axes} breakdown={data.breakdown} />
                <p className="text-[11.5px] text-ink-faint mt-3">
                  AI taranabilirliği ve teknik eksenler katalogdan ölçülemez; ağırlıklar kalan dört eksen üzerinden
                  yeniden normalize edilir. Bağlantılar:{' '}
                  {data.connections
                    .map(
                      (c) =>
                        `${c.storeDomain} (${c.provider}${c.lastSyncAt ? `, ${new Date(c.lastSyncAt).toLocaleDateString('tr-TR')}` : ''})`,
                    )
                    .join(', ') || '—'}
                </p>
              </div>
            </div>
            <RecommendationCards items={data.recommendations} title="Katalog önerileri" />
            <FindingsList findings={data.findings} axes={data.axes} />
          </div>
        )}
      </div>
    </section>
  );
}

type Suggestion = { text: string; language: 'tr' | 'en'; category: string; rationale: string };
type SuggestionResp = {
  suggestions: Suggestion[];
  source: {
    brandName: string;
    products: number;
    categories: number;
    productTypes: number;
    competitors: number;
    hasCatalog: boolean;
  };
};

const CATEGORY_LABEL: Record<string, string> = {
  discovery: 'Keşif',
  comparison: 'Karşılaştırma',
  review: 'Değerlendirme',
  how_to: 'Nasıl yapılır',
  other: 'Diğer',
};

export function CommercePromptSuggestions() {
  const hydrated = useHydrated();
  const [data, setData] = useState<SuggestionResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<'tr' | 'tr,en'>('tr');
  const [added, setAdded] = useState<Record<number, 'adding' | 'done' | 'error'>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setAdded({});
    try {
      setData(await apiFetch<SuggestionResp>(`/api/tools/commerce-prompts?lang=${lang}`));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(s: Suggestion, i: number) {
    setAdded((a) => ({ ...a, [i]: 'adding' }));
    try {
      await apiFetch('/api/prompts', {
        method: 'POST',
        json: { text: s.text, category: s.category, language: s.language },
      });
      setAdded((a) => ({ ...a, [i]: 'done' }));
    } catch {
      setAdded((a) => ({ ...a, [i]: 'error' }));
    }
  }

  return (
    <section className="card p-6" aria-labelledby="commerce-prompts-title" aria-busy={loading}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 id="commerce-prompts-title" className="font-display text-[18px]">
            Ticari izleme sorusu önerileri
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1">
            Kataloğunuzdaki kategoriler, ürün tipleri ve rakiplerinizden türetilen, satın alma niyetli sorular.
            Deterministik; yapay zeka kullanılmaz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="cp-lang" className="text-[12px] text-ink-muted">
            Dil
          </label>
          <select
            id="cp-lang"
            value={lang}
            onChange={(e) => setLang(e.target.value as 'tr' | 'tr,en')}
            className="input !py-1.5 !px-2 text-[12.5px]"
          >
            <option value="tr">Türkçe</option>
            <option value="tr,en">Türkçe + İngilizce</option>
          </select>
        </div>
      </div>
      <div className="mt-5" aria-live="polite">
        {loading && !data && <div className="text-[13px] text-ink-faint">Öneriler hazırlanıyor…</div>}
        {error && <InlineAlert tone="error">{error}</InlineAlert>}
        {data && !data.source.hasCatalog && (
          <InlineAlert tone="info">
            Öneriler marka adınız ve rakiplerinizden üretildi. Kategori ve ürün tipine dayalı sorular için{' '}
            <Link href="/dashboard/integrations" className="underline">
              mağazanızı bağlayın
            </Link>
            .
          </InlineAlert>
        )}
        {data && data.suggestions.length === 0 && !loading && (
          <div className="text-[13px] text-ink-faint mt-3">Yeni öneri yok — türetilen tüm sorular zaten izleniyor.</div>
        )}
        {data && data.suggestions.length > 0 && (
          <ul className="mt-3 divide-y divide-hairline">
            {data.suggestions.map((s, i) => {
              const st = added[i];
              return (
                <li key={s.text} className="py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px]">{s.text}</div>
                    <div className="text-[11.5px] text-ink-faint mt-0.5">
                      <span className="font-mono">{CATEGORY_LABEL[s.category] ?? s.category}</span> ·{' '}
                      {s.language.toUpperCase()} · {s.rationale}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void add(s, i)}
                    disabled={!hydrated || st === 'adding' || st === 'done'}
                    className="btn-secondary !py-1.5 !px-3 inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap disabled:opacity-60"
                    aria-label={`"${s.text}" sorusunu takibe ekle`}
                  >
                    {st === 'done' ? (
                      <Check className="w-3.5 h-3.5 text-positive" aria-hidden />
                    ) : st === 'adding' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="w-3.5 h-3.5" aria-hidden />
                    )}
                    {st === 'done' ? 'Eklendi' : st === 'error' ? 'Tekrar dene' : 'Takibe ekle'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
