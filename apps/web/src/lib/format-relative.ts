/**
 * Göreli zaman (tr): "az önce", "5 dk önce", "3 sa önce", "2 gün önce"; 30 günden eskisi tarih.
 * Saf fonksiyon — sunucu ve istemcide aynı çıktı (now parametresi test için).
 */
export function formatRelative(input: string | Date | null | undefined, now: number = Date.now()): string {
  if (!input) return '—';
  const t = input instanceof Date ? input.getTime() : Date.parse(input);
  if (!Number.isFinite(t)) return '—';
  const diff = Math.max(0, now - t);
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'az önce';
  if (min < 60) return `${min} dk önce`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days} gün önce`;
  return new Date(t).toLocaleDateString('tr-TR');
}
