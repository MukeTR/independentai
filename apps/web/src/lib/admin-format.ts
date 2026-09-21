/** Admin ekranları için tarih/sayı biçimleri — tr-TR, Europe/Istanbul (sunucu ve istemcide aynı çıktı). */

const TZ = 'Europe/Istanbul';

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR', { timeZone: TZ });
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('tr-TR');
}

/** 0–1 oran → "%12,5" */
export function fmtPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '—';
  return `%${(ratio * 100).toLocaleString('tr-TR', { maximumFractionDigits: digits })}`;
}

/** "YYYY-MM-DD" → "21 Eyl" (kısa gün etiketi) */
export function fmtDayKey(key: string): string {
  const d = new Date(`${key}T12:00:00+03:00`);
  if (Number.isNaN(d.getTime())) return key;
  return d.toLocaleDateString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'short' });
}

/** Baş harf büyütme — Türkçe (i → İ). */
export function capitalizeTr(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
}
