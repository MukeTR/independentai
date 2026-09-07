'use client';

/**
 * Ürün Açıklama Yazıcı — istemci aracı. Sağlayıcı yoksa (503) dürüst mesaj; sahte çıktı yok.
 * Çıktı: açıklama, kısa açıklama, maddeler, 5 SSS, meta başlık/açıklama, Product JSON-LD iskeleti.
 */
import { useState } from 'react';
import { Check, Copy, Loader2, Sparkles } from 'lucide-react';
import { InlineAlert } from '@/components/ui/inline-alert';
import { ApiError } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { scanFetch, ScanError } from './url-scan-tool';

type Tone = 'neutral' | 'friendly' | 'premium' | 'technical';
type Lang = 'tr' | 'en';

export type ProductWriterResult = {
  description: string;
  shortDescription: string;
  bullets: string[];
  faq: { question: string; answer: string }[];
  metaTitle: string;
  metaDescription: string;
  language: Lang;
  jsonLd: Record<string, unknown>;
  placeholders: string[];
  notice: string;
  provider: string | null;
  model: string | null;
  generatedAt: string;
};

const TONES: { value: Tone; label: string }[] = [
  { value: 'neutral', label: 'Nötr' },
  { value: 'friendly', label: 'Samimi' },
  { value: 'premium', label: 'Premium' },
  { value: 'technical', label: 'Teknik' },
];

export function ProductWriterTool({ variant = 'public' }: { variant?: 'public' | 'dashboard' }) {
  const hydrated = useHydrated();
  const [title, setTitle] = useState('');
  const [features, setFeatures] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState<Tone>('neutral');
  const [language, setLanguage] = useState<Lang>('tr');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductWriterResult | null>(null);
  const [error, setError] = useState<{ message: string; code: string; status: number; retryAfter?: number } | null>(
    null,
  );

  const featureLines = features
    .split(/\r?\n/)
    .map((f) => f.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);
  const canSubmit = hydrated && !loading && title.trim().length >= 3 && featureLines.length >= 1;

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await scanFetch<ProductWriterResult>('/api/tools/product-writer', {
        title,
        features: featureLines,
        brand: brand || undefined,
        category: category || undefined,
        audience: audience || undefined,
        tone,
        language,
      });
      setResult(r);
    } catch (err) {
      const e = err instanceof ApiError ? err : null;
      setError({
        message: e?.message ?? 'Bir hata oluştu',
        code: e?.code ?? 'error',
        status: e?.status ?? 0,
        retryAfter: err instanceof ScanError ? err.retryAfter : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={generate} className="card p-5 sm:p-6 space-y-4 h-fit" aria-busy={loading}>
        <div>
          <label htmlFor="pw-title" className="text-[13px] text-ink-muted">
            Ürün adı *
          </label>
          <input
            id="pw-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn. Organik pamuk bebek battaniyesi"
            className="input mt-1.5"
            required
            minLength={3}
            maxLength={160}
          />
        </div>
        <div>
          <label htmlFor="pw-features" className="text-[13px] text-ink-muted">
            Özellikler *{' '}
            <span className="text-ink-faint">(her satıra bir özellik; yalnızca doğru bildiğiniz bilgiler)</span>
          </label>
          <textarea
            id="pw-features"
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            rows={6}
            placeholder={
              "%100 GOTS sertifikalı organik pamuk\n90×120 cm\nMakinede 30°C yıkanabilir\nTürkiye'de üretildi"
            }
            className="input mt-1.5 resize-y"
            required
            aria-describedby="pw-features-help"
          />
          <p id="pw-features-help" className="text-[11.5px] text-ink-faint mt-1">
            {featureLines.length}/20 özellik. Model yalnızca bu satırları kullanır; verilmeyen ölçü, malzeme veya
            sertifika uydurmaz.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pw-brand" className="text-[13px] text-ink-muted">
              Marka
            </label>
            <input
              id="pw-brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="input mt-1.5"
              maxLength={80}
            />
          </div>
          <div>
            <label htmlFor="pw-category" className="text-[13px] text-ink-muted">
              Kategori
            </label>
            <input
              id="pw-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input mt-1.5"
              maxLength={80}
              placeholder="Bebek tekstili"
            />
          </div>
        </div>
        <div>
          <label htmlFor="pw-audience" className="text-[13px] text-ink-muted">
            Hedef kitle
          </label>
          <input
            id="pw-audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="input mt-1.5"
            maxLength={160}
            placeholder="Yeni ebeveynler, hediye arayanlar"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <fieldset>
            <legend className="text-[13px] text-ink-muted">Ton</legend>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  aria-pressed={tone === t.value}
                  className={`text-[12.5px] rounded-lg border px-3 py-2 transition ${tone === t.value ? 'border-brand bg-brand-glow text-brand-deep' : 'border-hairline hover:bg-paper-3'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-[13px] text-ink-muted">Dil</legend>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['tr', 'en'] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  aria-pressed={language === l}
                  className={`text-[12.5px] rounded-lg border px-3 py-2 transition ${language === l ? 'border-brand bg-brand-glow text-brand-deep' : 'border-hairline hover:bg-paper-3'}`}
                >
                  {l === 'tr' ? 'Türkçe' : 'English'}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="w-4 h-4" aria-hidden />
          )}
          {loading ? 'Üretiliyor…' : 'İçerik üret'}
        </button>
        {variant === 'public' && (
          <p className="text-[11.5px] text-ink-faint">
            Kayıt gerekmez. Saatte 5 üretim; daha fazlası için ücretsiz hesap açın.
          </p>
        )}
      </form>

      <div className="space-y-4" aria-live="polite">
        {!result && !loading && !error && (
          <div className="card p-6 min-h-[240px] text-[13px] text-ink-faint flex items-center justify-center text-center">
            Soldaki formu doldurup içerik üretin. Çıktı yalnızca verdiğiniz özelliklere dayanır.
          </div>
        )}
        {loading && (
          <div className="card p-6 min-h-[240px] flex items-center justify-center" role="status">
            <Loader2 className="w-6 h-6 animate-spin text-ink-faint" aria-hidden />
          </div>
        )}
        {error && (
          <InlineAlert tone={error.status === 503 || error.status === 429 ? 'warning' : 'error'}>
            {error.status === 503 ? (
              <>
                Bu araç için sunucuda bir AI sağlayıcı anahtarı yapılandırılmamış; sahte çıktı üretmiyoruz.{' '}
                {variant === 'dashboard'
                  ? 'Süper admin panelinden bir anahtar ekleyin.'
                  : 'Lütfen daha sonra tekrar deneyin.'}
              </>
            ) : (
              <>
                {error.message}
                {error.status === 429 && error.retryAfter ? ` Yeniden deneme: ${error.retryAfter} sn.` : ''}
              </>
            )}
          </InlineAlert>
        )}
        {result && <WriterResult r={result} />}
      </div>
    </div>
  );
}

function WriterResult({ r }: { r: ProductWriterResult }) {
  const jsonLd = JSON.stringify(r.jsonLd, null, 2);
  const faqJsonLd = JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: r.faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    },
    null,
    2,
  );
  return (
    <>
      <InlineAlert tone="info">{r.notice}</InlineAlert>
      <Block title="Ürün açıklaması" text={r.description} />
      <Block title="Kısa açıklama" text={r.shortDescription} />
      <Block title="Öne çıkan özellikler" text={r.bullets.map((b) => `• ${b}`).join('\n')} />
      <Block title="Sıkça sorulan sorular" text={r.faq.map((f) => `${f.question}\n${f.answer}`).join('\n\n')} />
      <Block title={`Meta başlık (${r.metaTitle.length}/60)`} text={r.metaTitle} />
      <Block title={`Meta açıklama (${r.metaDescription.length}/155)`} text={r.metaDescription} />
      <Block
        title="Product JSON-LD iskeleti"
        text={jsonLd}
        mono
        hint={`Doldurmanız gereken alanlar: ${r.placeholders.join(', ')}`}
      />
      <Block title="FAQPage JSON-LD" text={faqJsonLd} mono />
      <p className="text-[11px] text-ink-faint font-mono">
        {r.model ?? r.provider ?? 'AI'} · {new Date(r.generatedAt).toLocaleString('tr-TR')}
      </p>
    </>
  );
}

function Block({ title, text, mono, hint }: { title: string; text: string; mono?: boolean; hint?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* pano yok */
    }
  }
  return (
    <section className="card p-5" aria-label={title}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="eyebrow">{title}</div>
        <button
          type="button"
          onClick={copy}
          className="text-[12px] inline-flex items-center gap-1.5 text-ink-muted hover:text-brand-deep"
        >
          {copied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}{' '}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </button>
      </div>
      <pre
        className={`whitespace-pre-wrap leading-relaxed text-ink ${mono ? 'font-mono text-[11.5px] break-all' : 'text-[13.5px] font-sans'}`}
      >
        {text}
      </pre>
      {hint && <p className="text-[11.5px] text-warning mt-2">{hint}</p>}
    </section>
  );
}
