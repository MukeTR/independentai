'use client';

import { useState, useMemo } from 'react';
import { Code, Copy, Download, Check } from 'lucide-react';

const DEFAULT = {
  name: 'Acme Yazılım',
  url: 'https://acme.com',
  logo: 'https://acme.com/logo.png',
  description: "KOBİ'ler için bulut tabanlı muhasebe yazılımı",
  founded: '2018',
  email: 'info@acme.com',
  phone: '+90 212 555 00 00',
  city: 'İstanbul',
  country: 'TR',
  twitter: 'https://twitter.com/acme',
  linkedin: 'https://linkedin.com/company/acme',
};

function buildSchema(f: typeof DEFAULT): string {
  const obj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: f.name.trim(),
    url: f.url.trim(),
  };
  if (f.logo.trim()) obj.logo = f.logo.trim();
  if (f.description.trim()) obj.description = f.description.trim();
  if (f.founded.trim()) obj.foundingDate = f.founded.trim();
  const contactPoint: Record<string, string> = { '@type': 'ContactPoint', contactType: 'customer service' };
  if (f.email.trim()) contactPoint.email = f.email.trim();
  if (f.phone.trim()) contactPoint.telephone = f.phone.trim();
  if (f.email.trim() || f.phone.trim()) obj.contactPoint = contactPoint;
  if (f.city.trim() || f.country.trim()) {
    obj.address = {
      '@type': 'PostalAddress',
      addressLocality: f.city.trim(),
      addressCountry: f.country.trim(),
    };
  }
  const sameAs: string[] = [];
  if (f.twitter.trim()) sameAs.push(f.twitter.trim());
  if (f.linkedin.trim()) sameAs.push(f.linkedin.trim());
  if (sameAs.length) obj.sameAs = sameAs;

  return JSON.stringify(obj, null, 2);
}

type SchemaKind = 'organization' | 'product';

const AVAILABILITY_OPTIONS = [
  { value: 'InStock', label: 'Stokta (InStock)' },
  { value: 'OutOfStock', label: 'Stokta yok (OutOfStock)' },
  { value: 'PreOrder', label: 'Ön sipariş (PreOrder)' },
  { value: 'BackOrder', label: 'Tedarik bekliyor (BackOrder)' },
  { value: 'LimitedAvailability', label: 'Sınırlı stok (LimitedAvailability)' },
] as const;

const PRODUCT_DEFAULT = {
  name: 'Organik Pamuk Bebek Battaniyesi',
  description: '%100 GOTS sertifikalı organik pamuk, 90×120 cm, makinede yıkanabilir.',
  brand: 'Acme Baby',
  sku: 'ACME-BB-90120',
  gtin: '',
  image: 'https://acme.com/urun/battaniye.jpg',
  url: 'https://acme.com/products/organik-pamuk-bebek-battaniyesi',
  price: '899.90',
  currency: 'TRY',
  availability: 'InStock' as (typeof AVAILABILITY_OPTIONS)[number]['value'],
  ratingValue: '',
  reviewCount: '',
};

/**
 * Product JSON-LD — schema.org/Product. Yalnızca dolu alanlar yazılır; aggregateRating ancak
 * hem puan hem yorum sayısı girildiyse eklenir (boş/uydurma puan üretilmez). Çıktı geçerli JSON-LD'dir.
 */
function buildProductSchema(f: typeof PRODUCT_DEFAULT): string {
  const obj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: f.name.trim(),
  };
  if (f.description.trim()) obj.description = f.description.trim();
  if (f.brand.trim()) obj.brand = { '@type': 'Brand', name: f.brand.trim() };
  if (f.sku.trim()) obj.sku = f.sku.trim();
  const gtin = f.gtin.replace(/\s+/g, '');
  if (gtin) {
    // Uzunluğa göre doğru alan adı (8/12/13/14); diğer uzunluklarda genel gtin
    const key =
      gtin.length === 8
        ? 'gtin8'
        : gtin.length === 12
          ? 'gtin12'
          : gtin.length === 13
            ? 'gtin13'
            : gtin.length === 14
              ? 'gtin14'
              : 'gtin';
    obj[key] = gtin;
  }
  if (f.image.trim()) obj.image = [f.image.trim()];
  const offer: Record<string, unknown> = { '@type': 'Offer' };
  const price = f.price.trim().replace(',', '.');
  if (price && Number.isFinite(Number(price))) offer.price = price;
  if (/^[A-Za-z]{3}$/.test(f.currency.trim())) offer.priceCurrency = f.currency.trim().toUpperCase();
  offer.availability = `https://schema.org/${f.availability}`;
  if (f.url.trim()) offer.url = f.url.trim();
  if (offer.price !== undefined || offer.url) obj.offers = offer;
  const rating = Number(f.ratingValue.trim().replace(',', '.'));
  const count = Number(f.reviewCount.trim());
  if (
    f.ratingValue.trim() &&
    f.reviewCount.trim() &&
    rating >= 1 &&
    rating <= 5 &&
    Number.isInteger(count) &&
    count > 0
  ) {
    obj.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(rating),
      reviewCount: count,
      bestRating: '5',
      worstRating: '1',
    };
  }
  return JSON.stringify(obj, null, 2);
}

export function SchemaGenerator() {
  const [kind, setKind] = useState<SchemaKind>('organization');
  const [form, setForm] = useState(DEFAULT);
  const [product, setProduct] = useState(PRODUCT_DEFAULT);
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () => (kind === 'product' ? buildProductSchema(product) : buildSchema(form)),
    [kind, form, product],
  );
  const wrappedOutput = useMemo(() => `<script type="application/ld+json">\n${output}\n</script>`, [output]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm({ ...form, [k]: v });
  }
  function setP<K extends keyof typeof product>(k: K, v: (typeof product)[K]) {
    setProduct({ ...product, [k]: v });
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(wrappedOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function download() {
    const blob = new Blob([wrappedOutput], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = kind === 'product' ? 'product-schema.html' : 'organization-schema.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="not-prose card bg-paper-3 overflow-hidden my-12">
      <div className="px-7 py-5 border-b-hairline border-hairline flex items-center gap-3">
        <Code className="w-5 h-5 text-brand" />
        <div>
          <div className="font-display text-[18px] tracking-tight">
            {kind === 'product' ? 'Product' : 'Organization'} Schema Generator
          </div>
          <div className="text-[11px] text-ink-faint font-mono">
            JSON-LD üret · HTML\'ine yapıştır · AI gözünde netleş
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5" role="tablist" aria-label="Şema türü">
          {(
            [
              { value: 'organization', label: 'Organization' },
              { value: 'product', label: 'Product' },
            ] as { value: SchemaKind; label: string }[]
          ).map((k) => (
            <button
              key={k.value}
              type="button"
              role="tab"
              aria-selected={kind === k.value}
              onClick={() => setKind(k.value)}
              className={`text-[12px] rounded-lg border px-3 py-1.5 transition ${kind === k.value ? 'border-brand bg-brand-glow text-brand-deep' : 'border-hairline hover:bg-paper-2'}`}
            >
              {k.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        {kind === 'product' ? (
          <ProductForm p={product} setP={setP} />
        ) : (
          <div className="p-7 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-2">Şirket adı *</label>
                <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div>
                <label className="eyebrow block mb-2">Kuruluş yılı</label>
                <input
                  className="input"
                  value={form.founded}
                  onChange={(e) => set('founded', e.target.value)}
                  placeholder="2018"
                />
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-2">URL *</label>
              <input
                className="input"
                value={form.url}
                onChange={(e) => set('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="eyebrow block mb-2">Logo URL</label>
              <input
                className="input"
                value={form.logo}
                onChange={(e) => set('logo', e.target.value)}
                placeholder="https://.../logo.png"
              />
            </div>
            <div>
              <label className="eyebrow block mb-2">Açıklama</label>
              <textarea
                rows={2}
                className="input resize-none"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-2">E-posta</label>
                <input className="input" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div>
                <label className="eyebrow block mb-2">Telefon</label>
                <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
              <div>
                <label className="eyebrow block mb-2">Şehir</label>
                <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div>
                <label className="eyebrow block mb-2">Ülke (ISO)</label>
                <input
                  className="input"
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="TR"
                />
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-2">Twitter URL</label>
              <input className="input" value={form.twitter} onChange={(e) => set('twitter', e.target.value)} />
            </div>
            <div>
              <label className="eyebrow block mb-2">LinkedIn URL</label>
              <input className="input" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
            </div>
          </div>
        )}

        <div className="bg-paper-2/40 flex flex-col">
          <div className="px-7 py-3 border-b-hairline border-hairline flex items-center justify-between">
            <div className="text-[11px] text-ink-faint font-mono">JSON-LD output · canlı önizleme</div>
            <div className="text-[10px] text-ink-faint">{wrappedOutput.length} karakter</div>
          </div>
          <pre className="flex-1 p-7 text-[11.5px] font-mono leading-[1.55] text-ink overflow-x-auto whitespace-pre-wrap break-all">
            {wrappedOutput}
          </pre>
          <div className="px-7 py-4 border-t-hairline border-hairline flex items-center gap-3 flex-wrap">
            <button
              onClick={copyToClipboard}
              className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı!' : 'HTML kopyala'}
            </button>
            <button onClick={download} className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]">
              <Download className="w-3.5 h-3.5" />
              .html indir
            </button>
          </div>
        </div>
      </div>

      <div className="bg-paper-2 px-7 py-5 border-t-hairline border-hairline">
        <div className="eyebrow mb-3">Nasıl kullanılır?</div>
        <ol className="text-[12.5px] text-ink-muted space-y-1.5 list-decimal list-inside">
          <li>Üstteki formu kendi şirket bilgilerinizle doldurun.</li>
          <li>"HTML kopyala" ile çıkan kodu kopyalayın.</li>
          <li>
            Web sitenizin <code className="font-mono text-[11px] bg-paper-4 px-1.5 py-0.5 rounded">&lt;head&gt;</code>{' '}
            tag\'inin içine yapıştırın.
          </li>
          <li>
            <a
              href="https://search.google.com/test/rich-results"
              className="text-brand-deep underline"
              target="_blank"
              rel="noreferrer"
            >
              Google Rich Results Test
            </a>{' '}
            ile doğrulayın.
          </li>
        </ol>
      </div>
    </div>
  );
}

function ProductForm({
  p,
  setP,
}: {
  p: typeof PRODUCT_DEFAULT;
  setP: <K extends keyof typeof PRODUCT_DEFAULT>(k: K, v: (typeof PRODUCT_DEFAULT)[K]) => void;
}) {
  return (
    <div className="p-7 space-y-4">
      <div>
        <label htmlFor="ps-name" className="eyebrow block mb-2">
          Ürün adı *
        </label>
        <input id="ps-name" className="input" value={p.name} onChange={(e) => setP('name', e.target.value)} />
      </div>
      <div>
        <label htmlFor="ps-desc" className="eyebrow block mb-2">
          Açıklama
        </label>
        <textarea
          id="ps-desc"
          rows={2}
          className="input resize-none"
          value={p.description}
          onChange={(e) => setP('description', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ps-brand" className="eyebrow block mb-2">
            Marka
          </label>
          <input id="ps-brand" className="input" value={p.brand} onChange={(e) => setP('brand', e.target.value)} />
        </div>
        <div>
          <label htmlFor="ps-sku" className="eyebrow block mb-2">
            SKU
          </label>
          <input id="ps-sku" className="input" value={p.sku} onChange={(e) => setP('sku', e.target.value)} />
        </div>
        <div>
          <label htmlFor="ps-gtin" className="eyebrow block mb-2">
            GTIN / barkod
          </label>
          <input
            id="ps-gtin"
            className="input"
            value={p.gtin}
            onChange={(e) => setP('gtin', e.target.value)}
            placeholder="8690000000000"
            inputMode="numeric"
          />
        </div>
        <div>
          <label htmlFor="ps-availability" className="eyebrow block mb-2">
            Stok durumu
          </label>
          <select
            id="ps-availability"
            className="input"
            value={p.availability}
            onChange={(e) => setP('availability', e.target.value as typeof p.availability)}
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="ps-image" className="eyebrow block mb-2">
          Görsel URL
        </label>
        <input
          id="ps-image"
          className="input"
          value={p.image}
          onChange={(e) => setP('image', e.target.value)}
          placeholder="https://.../urun.jpg"
        />
      </div>
      <div>
        <label htmlFor="ps-url" className="eyebrow block mb-2">
          Ürün sayfası URL (offers.url)
        </label>
        <input
          id="ps-url"
          className="input"
          value={p.url}
          onChange={(e) => setP('url', e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ps-price" className="eyebrow block mb-2">
            Fiyat
          </label>
          <input
            id="ps-price"
            className="input"
            value={p.price}
            onChange={(e) => setP('price', e.target.value)}
            inputMode="decimal"
            placeholder="899.90"
          />
        </div>
        <div>
          <label htmlFor="ps-currency" className="eyebrow block mb-2">
            Para birimi (ISO 4217)
          </label>
          <input
            id="ps-currency"
            className="input"
            value={p.currency}
            onChange={(e) => setP('currency', e.target.value)}
            placeholder="TRY"
            maxLength={3}
          />
        </div>
        <div>
          <label htmlFor="ps-rating" className="eyebrow block mb-2">
            Ortalama puan (1-5, opsiyonel)
          </label>
          <input
            id="ps-rating"
            className="input"
            value={p.ratingValue}
            onChange={(e) => setP('ratingValue', e.target.value)}
            inputMode="decimal"
            placeholder="4.7"
          />
        </div>
        <div>
          <label htmlFor="ps-reviews" className="eyebrow block mb-2">
            Yorum sayısı (opsiyonel)
          </label>
          <input
            id="ps-reviews"
            className="input"
            value={p.reviewCount}
            onChange={(e) => setP('reviewCount', e.target.value)}
            inputMode="numeric"
            placeholder="128"
          />
        </div>
      </div>
      <p className="text-[11.5px] text-ink-faint">
        aggregateRating yalnızca hem puan hem yorum sayısı girildiğinde ve gerçek verilerinizse eklenir; uydurma puan AI
        güvenini ve Google zengin sonuç uygunluğunu zedeler.
      </p>
    </div>
  );
}
