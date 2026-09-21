'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';

/** Ekleme formu: ad + logo bağlantısı + site + sektör → POST /api/admin/reference-logos. */
export function ReferenceLogoForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = { name: useId(), logo: useId(), site: useId(), sector: useId() };
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [sector, setSector] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const preview = logoUrl.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const row = await apiFetch<{ name: string }>('/api/admin/reference-logos', {
        method: 'POST',
        json: { name, logoUrl, siteUrl: siteUrl || null, sector: sector || null },
      });
      setMsg({ ok: true, text: `${row.name} listeye eklendi.` });
      setName('');
      setLogoUrl('');
      setSiteUrl('');
      setSector('');
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err, 'Referans eklenemedi') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6" aria-labelledby={`${ids.name}-title`}>
      <div id={`${ids.name}-title`} className="eyebrow">
        Yeni referans
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div>
          <label htmlFor={ids.name} className="eyebrow block mb-1.5">
            Referans adı
          </label>
          <input
            id={ids.name}
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ergen Tekstil"
            maxLength={80}
            required
            autoComplete="off"
            aria-describedby={`${ids.name}-help`}
          />
          <p id={`${ids.name}-help`} className="text-[11.5px] text-ink-faint mt-1.5">
            Logonun alternatif metni olarak da kullanılır.
          </p>
        </div>
        <div>
          <label htmlFor={ids.logo} className="eyebrow block mb-1.5">
            Logo bağlantısı
          </label>
          <input
            id={ids.logo}
            className="input"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://… veya /img/referans/firma.svg"
            maxLength={500}
            required
            autoComplete="off"
            aria-describedby={`${ids.logo}-help`}
          />
          <p id={`${ids.logo}-help`} className="text-[11.5px] text-ink-faint mt-1.5">
            Dosya yükleme yok. https bağlantı ya da repodaki <span className="font-mono">/img/…</span> yolu. Şeffaf
            zeminli SVG/PNG en temiz sonucu verir.
          </p>
        </div>
        <div>
          <label htmlFor={ids.site} className="eyebrow block mb-1.5">
            Site bağlantısı <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
          </label>
          <input
            id={ids.site}
            className="input"
            type="url"
            inputMode="url"
            value={siteUrl}
            onChange={(e) => setSiteUrl(e.target.value)}
            placeholder="https://firma.com"
            maxLength={500}
          />
        </div>
        <div>
          <label htmlFor={ids.sector} className="eyebrow block mb-1.5">
            Sektör <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
          </label>
          <input
            id={ids.sector}
            className="input"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Tekstil"
            maxLength={60}
          />
        </div>
      </div>

      {preview && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-hairline bg-paper-2 p-3">
          <span className="eyebrow shrink-0">Önizleme</span>
          {/* eslint-disable-next-line @next/next/no-img-element -- referans logoları serbest alan adlarından gelir; next/image remotePatterns tanımlı değil */}
          <img
            src={preview}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-8 w-auto max-w-[160px] object-contain"
          />
        </div>
      )}

      {msg && (
        <InlineAlert tone={msg.ok ? 'success' : 'error'} className="mt-4">
          {msg.text}
        </InlineAlert>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          className="btn-primary !py-2.5 disabled:opacity-50"
          disabled={!hydrated || saving || !name.trim() || !logoUrl.trim()}
          aria-busy={saving}
        >
          {saving ? 'Ekleniyor…' : 'Listeye ekle'}
        </button>
      </div>
    </form>
  );
}
