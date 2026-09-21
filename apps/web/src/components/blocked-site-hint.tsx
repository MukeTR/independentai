'use client';

/**
 * BlockedSiteHint — hero / araç kutusu için "girdiği anda yönlendirme" ipucu.
 *
 * Kullanım (INTEGRATE, `components/landing/story.tsx` hero input'unun yanına):
 *   <BlockedSiteHint value={domainInput} />
 * Kullanıcı yazarken 400 ms debounce ile `GET /api/public/blocklist?host=` sorulur; yanıt `{blocked:true, redirectUrl}`
 * ise allowlist istemcide `handleBlockedResponse` ile YENİDEN doğrulanır (yalnız https youtube.com / www.youtube.com /
 * youtu.be) ve `window.location.assign` ile yönlendirilir — "Analiz et"e basılmasını beklemez.
 *
 *  - Görsel çıktı yok; `role="status"` ile ekran okuyucuya kısa duyuru (yönlendirme anında).
 *  - Aynı host tekrar sorulmaz (bileşen ömrü boyunca bellek); istekler AbortController ile iptal edilir.
 *  - Ağ/limit hatası sessizce yutulur (sunucu zaten "Analiz et" anında da engeller).
 */
import { useEffect, useRef, useState } from 'react';
import { handleBlockedResponse } from '@/lib/blocked-redirect';

export const BLOCKED_HINT_DEBOUNCE_MS = 400;

/** İstemci tarafı kaba normalize: şema/yol/www. atılır; en az bir nokta şart. Sunucu asıl normalize'ı yapar. */
export function hintHostOf(value: string): string | null {
  let s = value.trim().toLowerCase();
  if (!s || s.length > 253) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  s = s.split(/[/?#]/)[0] ?? '';
  s = s.replace(/^www\./, '').replace(/\.$/, '');
  if (!s || /[\s@:]/.test(s) || !s.includes('.')) return null;
  if (!/^[a-z0-9.-]+$/i.test(s)) return null;
  const last = s.split('.').pop() ?? '';
  if (last.length < 2) return null;
  return s;
}

export function BlockedSiteHint({ value, endpoint = '/api/public/blocklist' }: { value: string; endpoint?: string }) {
  const [redirecting, setRedirecting] = useState(false);
  const seen = useRef(new Map<string, boolean>());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const host = hintHostOf(value);
    if (!host || seen.current.has(host)) return;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`${endpoint}?host=${encodeURIComponent(host)}`, {
          signal: ctrl.signal,
          credentials: 'same-origin',
        });
        if (!res.ok) return; // 429 vb. — sessiz
        const json: unknown = await res.json();
        const blocked = !!json && typeof json === 'object' && (json as { blocked?: unknown }).blocked === true;
        seen.current.set(host, blocked);
        if (blocked) {
          setRedirecting(true);
          handleBlockedResponse(json);
        }
      } catch {
        /* iptal / ağ hatası — sessiz */
      }
    }, BLOCKED_HINT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, endpoint]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <span role="status" aria-live="polite" className="sr-only">
      {redirecting ? 'Bu site için yönlendirme uygulanıyor…' : ''}
    </span>
  );
}
