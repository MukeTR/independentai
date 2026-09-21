'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { InlineAlert } from '@/components/ui/inline-alert';

/** Ekleme formu: alan adı + YouTube bağlantısı + not → POST /api/admin/blocked-sites. */
export function BlockedSiteForm({ initialHostname = '' }: { initialHostname?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = { host: useId(), url: useId(), note: useId() };
  const [hostname, setHostname] = useState(initialHostname);
  const [redirectUrl, setRedirectUrl] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg(null);
    try {
      const row = await apiFetch<{ hostname: string }>('/api/admin/blocked-sites', {
        method: 'POST',
        json: { hostname, redirectUrl, note: note || undefined },
      });
      setMsg({ ok: true, text: `${row.hostname} listeye eklendi.` });
      setHostname('');
      setRedirectUrl('');
      setNote('');
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err, 'Kayıt eklenemedi') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card p-6" aria-labelledby={`${ids.host}-title`}>
      <div id={`${ids.host}-title`} className="eyebrow">
        Yeni yasaklı site
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <div>
          <label htmlFor={ids.host} className="eyebrow block mb-1.5">
            Alan adı
          </label>
          <input
            id={ids.host}
            className="input"
            value={hostname}
            onChange={(e) => setHostname(e.target.value)}
            placeholder="firma.com"
            required
            autoComplete="off"
            aria-describedby={`${ids.host}-help`}
          />
          <p id={`${ids.host}-help`} className="text-[11.5px] text-ink-faint mt-1.5">
            Küçük harfe çevrilir; şema, yol ve “www.” atılır. Alt alan adları da eşleşir.
          </p>
        </div>
        <div>
          <label htmlFor={ids.url} className="eyebrow block mb-1.5">
            Yönlendirme bağlantısı
          </label>
          <input
            id={ids.url}
            className="input"
            type="url"
            inputMode="url"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            required
            aria-describedby={`${ids.url}-help`}
          />
          <p id={`${ids.url}-help`} className="text-[11.5px] text-ink-faint mt-1.5">
            Yalnızca https youtube.com / www.youtube.com / youtu.be.
          </p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={ids.note} className="eyebrow block mb-1.5">
            Not <span className="text-ink-faint normal-case tracking-normal">(opsiyonel)</span>
          </label>
          <input
            id={ids.note}
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Neden yasaklandı?"
          />
        </div>
      </div>
      {msg && (
        <InlineAlert tone={msg.ok ? 'success' : 'error'} className="mt-4">
          {msg.text}
        </InlineAlert>
      )}
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          className="btn-primary !py-2.5 disabled:opacity-50"
          disabled={!hydrated || saving || !hostname.trim() || !redirectUrl.trim()}
          aria-busy={saving}
        >
          {saving ? 'Ekleniyor…' : 'Listeye ekle'}
        </button>
      </div>
    </form>
  );
}

type TestResult = { hostname: string | null; blocked: boolean; matched: string | null; redirectUrl: string | null };

/** "Test et": bir alan adının listeyle eşleşip eşleşmediğini gösterir (isabet sayacı artmaz). */
export function BlocklistTester() {
  const hydrated = useHydrated();
  const id = useId();
  const [host, setHost] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function test(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !host.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await apiFetch<TestResult>(`/api/admin/blocked-sites?host=${encodeURIComponent(host.trim())}`));
    } catch (err) {
      setResult(null);
      setError(errorMessage(err, 'Test yapılamadı'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={test} className="card p-6">
      <div className="eyebrow">Test et</div>
      <p className="text-[12px] text-ink-muted mt-1">Bir alan adı girin; hangi kayıtla eşleştiğini görün.</p>
      <label htmlFor={id} className="sr-only">
        Test edilecek alan adı
      </label>
      <div className="flex gap-2 mt-3">
        <input
          id={id}
          className="input"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="shop.firma.com"
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn-secondary !px-4 !py-2 whitespace-nowrap disabled:opacity-50"
          disabled={!hydrated || busy || !host.trim()}
          aria-busy={busy}
        >
          {busy ? 'Bakılıyor…' : 'Test et'}
        </button>
      </div>
      <div aria-live="polite" className="mt-3 text-[13px]">
        {error && <InlineAlert>{error}</InlineAlert>}
        {result && !result.hostname && <InlineAlert tone="warning">Geçersiz alan adı.</InlineAlert>}
        {result && result.hostname && result.blocked && (
          <InlineAlert tone="warning">
            <b>{result.hostname}</b> engelli — kayıt: <span className="font-mono">{result.matched}</span> →{' '}
            {result.redirectUrl}
          </InlineAlert>
        )}
        {result && result.hostname && !result.blocked && (
          <InlineAlert tone="success">
            <b>{result.hostname}</b> engelli değil; normal taranır.
          </InlineAlert>
        )}
      </div>
    </form>
  );
}
