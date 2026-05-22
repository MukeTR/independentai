'use client';

import { useState, useMemo } from 'react';
import { Code, Copy, Download, Check } from 'lucide-react';

const DEFAULT = {
  name: 'Acme Yazılım',
  url: 'https://acme.com',
  logo: 'https://acme.com/logo.png',
  description: 'KOBİ\'ler için bulut tabanlı muhasebe yazılımı',
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

export function SchemaGenerator() {
  const [form, setForm] = useState(DEFAULT);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => buildSchema(form), [form]);
  const wrappedOutput = useMemo(
    () => `<script type="application/ld+json">\n${output}\n</script>`,
    [output],
  );

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm({ ...form, [k]: v });
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
    a.download = 'organization-schema.html';
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
          <div className="font-display text-[18px] tracking-tight">Organization Schema Generator</div>
          <div className="text-[11px] text-ink-faint font-mono">JSON-LD üret · HTML\'ine yapıştır · AI gözünde netleş</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        <div className="p-7 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-2">Şirket adı *</label>
              <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className="eyebrow block mb-2">Kuruluş yılı</label>
              <input className="input" value={form.founded} onChange={(e) => set('founded', e.target.value)} placeholder="2018" />
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-2">URL *</label>
            <input className="input" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label className="eyebrow block mb-2">Logo URL</label>
            <input className="input" value={form.logo} onChange={(e) => set('logo', e.target.value)} placeholder="https://.../logo.png" />
          </div>
          <div>
            <label className="eyebrow block mb-2">Açıklama</label>
            <textarea rows={2} className="input resize-none" value={form.description} onChange={(e) => set('description', e.target.value)} />
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
              <input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="TR" />
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

        <div className="bg-paper-2/40 flex flex-col">
          <div className="px-7 py-3 border-b-hairline border-hairline flex items-center justify-between">
            <div className="text-[11px] text-ink-faint font-mono">JSON-LD output · canlı önizleme</div>
            <div className="text-[10px] text-ink-faint">{wrappedOutput.length} karakter</div>
          </div>
          <pre className="flex-1 p-7 text-[11.5px] font-mono leading-[1.55] text-ink overflow-x-auto whitespace-pre-wrap break-all">
            {wrappedOutput}
          </pre>
          <div className="px-7 py-4 border-t-hairline border-hairline flex items-center gap-3 flex-wrap">
            <button onClick={copyToClipboard} className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]">
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
          <li>Web sitenizin <code className="font-mono text-[11px] bg-paper-4 px-1.5 py-0.5 rounded">&lt;head&gt;</code> tag\'inin içine yapıştırın.</li>
          <li><a href="https://search.google.com/test/rich-results" className="text-brand-deep underline" target="_blank" rel="noreferrer">Google Rich Results Test</a> ile doğrulayın.</li>
        </ol>
      </div>
    </div>
  );
}
