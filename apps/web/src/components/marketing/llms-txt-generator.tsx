'use client';

import { useState, useMemo } from 'react';
import { Copy, Download, Plus, X, Sparkles, Check } from 'lucide-react';

type KeyUrl = { label: string; url: string; description: string };

const DEFAULT_FORM = {
  name: 'Acme Yazılım',
  tagline: 'KOBİ\'ler için bulut tabanlı muhasebe ve ön muhasebe yazılımı.',
  description:
    'Acme, 2018\'den beri 5.000+ KOBİ\'ye hizmet veriyor. Web tabanlı arayüz, mobil uygulama, e-fatura entegrasyonu, KDV ve gelir vergisi otomatik hesaplama özellikleri sunar.',
  website: 'https://acme.com',
  founded: '2018',
  location: 'Ankara',
  customerCount: '5.000+',
  targetAudience: 'KOBİ\'ler (1-50 çalışan)',
  keyUrls: [
    { label: 'Ana sayfa', url: 'https://acme.com/', description: 'Ürün özeti' },
    { label: 'Fiyatlandırma', url: 'https://acme.com/fiyat', description: 'Plan seçenekleri' },
    { label: 'Özellikler', url: 'https://acme.com/ozellikler', description: 'Tüm özellik listesi' },
    { label: 'Hakkımızda', url: 'https://acme.com/hakkimizda', description: 'Şirket bilgisi' },
  ] as KeyUrl[],
};

function buildLlmsTxt(f: typeof DEFAULT_FORM): string {
  const lines: string[] = [];
  lines.push(`# ${f.name.trim()}`);
  lines.push('');
  if (f.tagline.trim()) {
    lines.push(`> ${f.tagline.trim()}`);
    lines.push('');
  }
  if (f.description.trim()) {
    lines.push(f.description.trim());
    lines.push('');
  }
  const urls = f.keyUrls.filter((u) => u.label && u.url);
  if (urls.length) {
    lines.push('## Önemli sayfalar');
    lines.push('');
    for (const u of urls) {
      const desc = u.description.trim() ? `: ${u.description.trim()}` : '';
      lines.push(`- [${u.label.trim()}](${u.url.trim()})${desc}`);
    }
    lines.push('');
  }
  const aboutFields = ([
    ['Kuruluş', f.founded],
    ['Lokasyon', f.location],
    ['Müşteri sayısı', f.customerCount],
    ['Hedef kitle', f.targetAudience],
  ] as const).filter(([, v]) => v.trim() !== '');
  if (aboutFields.length) {
    lines.push('## Hakkında');
    lines.push('');
    for (const [k, v] of aboutFields) lines.push(`- ${k}: ${v.trim()}`);
    lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function LlmsTxtGenerator() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => buildLlmsTxt(form), [form]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }

  function updateUrl(i: number, patch: Partial<KeyUrl>) {
    setForm({
      ...form,
      keyUrls: form.keyUrls.map((u, j) => (j === i ? { ...u, ...patch } : u)),
    });
  }

  function addUrl() {
    setForm({
      ...form,
      keyUrls: [...form.keyUrls, { label: '', url: '', description: '' }],
    });
  }

  function removeUrl(i: number) {
    setForm({ ...form, keyUrls: form.keyUrls.filter((_, j) => j !== i) });
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function download() {
    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'llms.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function resetExample() {
    setForm(DEFAULT_FORM);
  }

  return (
    <div className="not-prose card bg-paper-3 overflow-hidden my-12">
      {/* header */}
      <div className="px-7 py-5 border-b-hairline border-hairline flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-brand" />
          <div>
            <div className="font-display text-[18px] tracking-tight">llms.txt Generator</div>
            <div className="text-[11px] text-ink-faint font-mono">Markanız için anında üret · ücretsiz</div>
          </div>
        </div>
        <button
          type="button"
          onClick={resetExample}
          className="text-[11px] text-ink-faint hover:text-ink font-mono"
        >
          örneği sıfırla
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
        {/* Form */}
        <div className="p-7 space-y-5">
          <div>
            <label className="eyebrow block mb-2">Marka adı *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Acme"
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Tek cümlelik açıklama *</label>
            <input
              className="input"
              value={form.tagline}
              onChange={(e) => set('tagline', e.target.value)}
              placeholder="Ne yapan bir şirket olduğunuz, tek cümle"
            />
            <div className="text-[10.5px] text-ink-faint mt-1">Bu cümle markdown çıktısında blockquote olarak görünür</div>
          </div>

          <div>
            <label className="eyebrow block mb-2">Uzun açıklama</label>
            <textarea
              rows={4}
              className="input resize-none"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Şirketinizi 2-3 cümle ile tanıtın. AI modelleri bu paragrafı doğrudan kullanacak."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-2">Web sitesi</label>
              <input
                className="input"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://acme.com"
              />
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
            <div>
              <label className="eyebrow block mb-2">Lokasyon</label>
              <input
                className="input"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="İstanbul"
              />
            </div>
            <div>
              <label className="eyebrow block mb-2">Müşteri sayısı</label>
              <input
                className="input"
                value={form.customerCount}
                onChange={(e) => set('customerCount', e.target.value)}
                placeholder="5.000+"
              />
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-2">Hedef kitle</label>
            <input
              className="input"
              value={form.targetAudience}
              onChange={(e) => set('targetAudience', e.target.value)}
              placeholder="KOBİ'ler, e-ticaret markaları, ajanslar..."
            />
          </div>

          {/* Key URLs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="eyebrow">Önemli sayfalar</label>
              <button
                type="button"
                onClick={addUrl}
                className="text-[11px] text-brand-deep hover:text-brand inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Sayfa ekle
              </button>
            </div>
            <div className="space-y-3">
              {form.keyUrls.map((u, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <input
                    className="input col-span-3 !py-2 !text-[12px]"
                    value={u.label}
                    onChange={(e) => updateUrl(i, { label: e.target.value })}
                    placeholder="Başlık"
                  />
                  <input
                    className="input col-span-5 !py-2 !text-[12px] !font-mono"
                    value={u.url}
                    onChange={(e) => updateUrl(i, { url: e.target.value })}
                    placeholder="https://..."
                  />
                  <input
                    className="input col-span-3 !py-2 !text-[12px]"
                    value={u.description}
                    onChange={(e) => updateUrl(i, { description: e.target.value })}
                    placeholder="Açıklama"
                  />
                  <button
                    type="button"
                    onClick={() => removeUrl(i)}
                    className="col-span-1 text-ink-faint hover:text-danger flex items-center justify-center h-9"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-paper-2/40 flex flex-col">
          <div className="px-7 py-3 border-b-hairline border-hairline flex items-center justify-between">
            <div className="text-[11px] text-ink-faint font-mono">llms.txt · canlı önizleme</div>
            <div className="text-[10px] text-ink-faint">{output.length} karakter</div>
          </div>
          <pre className="flex-1 p-7 text-[12.5px] font-mono leading-[1.6] text-ink overflow-x-auto whitespace-pre-wrap break-words">
            {output}
          </pre>
          <div className="px-7 py-4 border-t-hairline border-hairline flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={copyToClipboard}
              className="btn-primary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Kopyalandı!' : 'Kopyala'}
            </button>
            <button
              type="button"
              onClick={download}
              className="btn-secondary !py-2 !px-4 inline-flex items-center gap-2 text-[13px]"
            >
              <Download className="w-3.5 h-3.5" />
              llms.txt indir
            </button>
          </div>
        </div>
      </div>

      {/* How to use */}
      <div className="bg-paper-2 px-7 py-5 border-t-hairline border-hairline">
        <div className="eyebrow mb-3">Nasıl kullanılır?</div>
        <ol className="text-[12.5px] text-ink-muted space-y-1.5 list-decimal list-inside">
          <li>Üstteki formu kendi markanıza göre doldurun.</li>
          <li>"llms.txt indir" butonu ile dosyayı bilgisayarınıza kaydedin.</li>
          <li>Web sunucunuzun kök dizinine yükleyin: <code className="font-mono text-[11px] bg-paper-4 px-1.5 py-0.5 rounded">https://siteniz.com/llms.txt</code></li>
          <li>Content-Type olarak <code className="font-mono text-[11px] bg-paper-4 px-1.5 py-0.5 rounded">text/markdown</code> veya <code className="font-mono text-[11px] bg-paper-4 px-1.5 py-0.5 rounded">text/plain</code> ayarlayın.</li>
          <li>robots.txt'inize AI crawler\'ları (GPTBot, ClaudeBot, PerplexityBot) explicit allow edin.</li>
        </ol>
      </div>
    </div>
  );
}
