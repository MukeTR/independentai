/**
 * Göreli zaman yardımcıları — tek uygulama `format-relative.ts` (`formatRelative`), burada yalnızca ince sarmalayıcı:
 *  - `relativeTime`: değer yoksa `null` döner (bileşen kendi "—" yer tutucusunu stiller).
 *  - `fullDateTime`: title/tooltip için tam tarih-saat.
 * Yalnızca istemci tarafında (veri effect ile yüklendiğinde) kullanın; SSR'da hydration farkı yaratır.
 */
import { formatRelative } from './format-relative';

export function relativeTime(input: string | Date | null | undefined, now: number = Date.now()): string | null {
  if (!input) return null;
  const s = formatRelative(input, now);
  return s === '—' ? null : s;
}

/** Tam tarih/saat (title/tooltip için). */
export function fullDateTime(input: string | Date | null | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d.toLocaleString('tr-TR') : '';
}
