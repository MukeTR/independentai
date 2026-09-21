import type { AgencyRole, WorkspaceStatus } from '@independentai/db';
import type { ClientCard } from '@/server/agency';

export const AGENCY_ROLE_LABEL: Record<AgencyRole, string> = {
  OWNER: 'Sahip',
  ADMIN: 'Yönetici',
  STRATEGIST: 'Stratejist',
  ANALYST: 'Analist',
};

export const WORKSPACE_STATUS_LABEL: Record<WorkspaceStatus, string> = {
  ACTIVE: 'Aktif',
  PAUSED: 'Duraklatıldı',
  ARCHIVED: 'Arşiv',
};

export const HEALTH_LABEL: Record<ClientCard['health'], { label: string; cls: string }> = {
  good: { label: 'Sağlıklı', cls: 'text-positive bg-positive/10 border-positive/20' },
  warn: { label: 'Dikkat', cls: 'text-warning bg-warning/10 border-warning/20' },
  critical: { label: 'Kritik', cls: 'text-danger bg-danger/10 border-danger/20' },
  idle: { label: 'Veri yok', cls: 'text-ink-faint bg-paper-4 border-hairline' },
};

export const PLATFORM_LABEL: Record<string, string> = { SHOPIFY: 'Shopify', IKAS: 'ikas', TICIMAX: 'Ticimax' };

/** Deterministik tarih (SSR/CSR aynı): gg.aa.yyyy — saat dilimi farkı gün kaydırabilir; UTC kullanılır. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getUTCFullYear()}`;
}

/** "3 gün önce" gibi kaba göreli zaman (dakika altı "az önce"). */
export function fmtAgo(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'hiç';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'az önce';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} sa önce`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d} gün önce`;
  return fmtDate(iso);
}

export function fmtDelta(n: number): string {
  if (n === 0) return '±0';
  return n > 0 ? `+${n}` : `${n}`;
}
