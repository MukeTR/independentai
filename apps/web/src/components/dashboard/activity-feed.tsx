'use client';

/**
 * Hesap aktivite akışı (AuditLog) — GET /api/activity, imleçli "daha fazla yükle".
 * Realtime: herhangi bir olay gelince ilk sayfa yeniden çekilir ve yeni satırlar başa eklenir.
 * Realtime yoksa 30 sn'de bir aynı tazeleme yapılır. (Panel genel bakıştaki "Son Aktivite" run akışından
 * farklıdır; burası güvenlik/ekip/ayar olaylarıdır. E-posta ve IP asla gösterilmez — sunucu zaten göndermez.)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, History } from 'lucide-react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { useHydrated } from '@/lib/use-hydrated';
import { relativeTime, fullDateTime } from '@/lib/relative-time';
import { useRealtimeEvent, useRealtimeStatus } from '@/components/realtime-provider';
import { InlineAlert } from '@/components/ui/inline-alert';

type Item = {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  actor: { id: string; name: string } | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};
type Page = { items: Item[]; nextCursor: string | null };

const PAGE_SIZE = 20;
const POLL_MS = 30_000;

const ACTION_LABEL: Record<string, string> = {
  'member.invite': 'Üye davet edildi',
  'member.invite_resend': 'Davet yeniden gönderildi',
  'member.invite_cancel': 'Davet iptal edildi',
  'member.join': 'Ekibe katıldı',
  'member.role_change': 'Üye rolü değiştirildi',
  'member.remove': 'Üye çıkarıldı',
  'owner.transfer': 'Hesap sahipliği devredildi',
  'prompt.create': 'İzlenen soru eklendi',
  'prompt.update': 'İzlenen soru güncellendi',
  'prompt.delete': 'İzlenen soru silindi',
  'prompt.run': 'Manuel ölçüm başlatıldı',
  'competitor.create': 'Rakip eklendi',
  'competitor.delete': 'Rakip silindi',
  'brand.create': 'Marka eklendi',
  'brand.update': 'Marka güncellendi',
  'brand.delete': 'Marka silindi',
  'api_token.create': 'API token oluşturuldu',
  'api_token.revoke': 'API token iptal edildi',
  'account.export': 'Hesap verisi dışa aktarıldı',
  'tenant.delete': 'Hesap silindi',
  'onboarding.complete': 'Kurulum tamamlandı',
  'auth.register': 'Hesap oluşturuldu',
  'auth.password_change': 'Şifre değiştirildi',
  'auth.password_reset': 'Şifre sıfırlandı',
  'auth.logout_all': 'Tüm oturumlar kapatıldı',
  'auth.login_failed': 'Başarısız giriş denemesi',
  'share.create': 'Rapor paylaşım bağlantısı oluşturuldu',
  'share.revoke': 'Rapor paylaşımı iptal edildi',
  'integration.connect': 'Mağaza entegrasyonu bağlandı',
  'integration.disconnect': 'Mağaza entegrasyonu ayrıldı',
  'integration.delete': 'Mağaza entegrasyonu silindi',
  'integration.uninstalled': 'Uygulama mağazadan kaldırıldı',
  'agency.convert': 'Hesap ajansa dönüştürüldü',
  'agency.update': 'Ajans ayarları güncellendi',
  'agency.client_create': 'Müşteri çalışma alanı oluşturuldu',
  'agency.client_update': 'Müşteri çalışma alanı güncellendi',
  'agency.client_unlink': 'Müşteri bağlantısı kaldırıldı',
  'agency.link_request': 'Müşteri bağlama isteği oluşturuldu',
  'agency.link_accept': 'Müşteri bağlama isteği kabul edildi',
  'agency.invite': 'Ajans üyesi davet edildi',
  'agency.invite_resend': 'Ajans daveti yeniden gönderildi',
  'agency.invite_revoke': 'Ajans daveti iptal edildi',
  'agency.member_join': 'Ajansa üye katıldı',
  'agency.member_update': 'Ajans üyesi güncellendi',
  'agency.member_remove': 'Ajans üyesi çıkarıldı',
  'agency.member_assign': 'Ajans üyesi atamaları değiştirildi',
  'agency.ownership_transfer': 'Ajans sahipliği devredildi',
};

const ROLE_TR: Record<string, string> = { OWNER: 'Sahip', ADMIN: 'Yönetici', VIEWER: 'Görüntüleyici' };

function labelOf(a: Item): string {
  const base = ACTION_LABEL[a.action] ?? a.action.replace(/[._]/g, ' ');
  const role = typeof a.meta?.role === 'string' ? (ROLE_TR[a.meta.role] ?? a.meta.role) : null;
  if (role && /role_change|invite/.test(a.action)) return `${base} (${role})`;
  return base;
}

export function ActivityFeed() {
  const hydrated = useHydrated();
  const [items, setItems] = useState<Item[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { status } = useRealtimeStatus();
  const live = status === 'live';
  const refreshing = useRef(false);

  /** İlk sayfayı çeker; `merge` ise yeni satırları başa ekler (mevcut sayfalamayı bozmaz). */
  const loadFirst = useCallback(async (merge: boolean) => {
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const page = await apiFetch<Page>(`/api/activity?limit=${PAGE_SIZE}`);
      setError(null);
      setItems((prev) => {
        if (!merge || !prev) return page.items;
        const known = new Set(prev.map((i) => i.id));
        const fresh = page.items.filter((i) => !known.has(i.id));
        return fresh.length ? [...fresh, ...prev] : prev;
      });
      setCursor((c) => (merge && c ? c : page.nextCursor));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      refreshing.current = false;
    }
  }, []);

  useEffect(() => {
    void loadFirst(false);
  }, [loadFirst]);

  // Canlı: her olayda tazele (audit satırı olayla birlikte yazılır).
  useRealtimeEvent('*', () => void loadFirst(true));

  // Polling fallback: canlı bağlantı yokken 30 sn.
  useEffect(() => {
    if (live) return;
    const id = setInterval(() => void loadFirst(true), POLL_MS);
    return () => clearInterval(id);
  }, [live, loadFirst]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await apiFetch<Page>(`/api/activity?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(cursor)}`);
      setItems((prev) => {
        const known = new Set((prev ?? []).map((i) => i.id));
        return [...(prev ?? []), ...page.items.filter((i) => !known.has(i.id))];
      });
      setCursor(page.nextCursor);
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  if (!items && !error)
    return (
      <div className="card p-8 flex justify-center" aria-busy="true">
        <Loader2 className="w-5 h-5 animate-spin text-ink-faint" aria-label="Aktivite yükleniyor" />
      </div>
    );

  return (
    <div className="space-y-3">
      {error && (
        <div className="space-y-2">
          <InlineAlert>{error}</InlineAlert>
          {!items && (
            <button
              type="button"
              className="btn-secondary !py-1.5 !px-3 text-[12.5px]"
              onClick={() => void loadFirst(false)}
            >
              Tekrar dene
            </button>
          )}
        </div>
      )}
      {items && items.length === 0 && (
        <div className="card p-8 text-center text-ink-muted">
          <History className="w-6 h-6 mx-auto mb-2 text-ink-faint" aria-hidden />
          <p className="text-[13.5px]">Henüz kayıtlı aktivite yok.</p>
          <p className="text-[12px] text-ink-faint mt-1">Ekip, ayar ve güvenlik işlemleri burada listelenir.</p>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="card">
          <ol className="divide-y divide-hairline" aria-live="polite" aria-relevant="additions">
            {items.map((a) => (
              <li key={a.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[13.5px] text-ink">{labelOf(a)}</div>
                  <div className="text-[11.5px] text-ink-faint mt-0.5 truncate">
                    {a.actor ? a.actor.name : 'Sistem'}
                    {a.targetType ? ` · ${a.targetType}` : ''}
                  </div>
                </div>
                <time
                  dateTime={a.createdAt}
                  title={fullDateTime(a.createdAt)}
                  className="text-[11.5px] text-ink-faint whitespace-nowrap font-mono tabular shrink-0"
                >
                  {relativeTime(a.createdAt)}
                </time>
              </li>
            ))}
          </ol>
          {cursor && (
            <div className="p-3 border-t border-hairline flex justify-center">
              <button
                type="button"
                disabled={!hydrated || loadingMore}
                onClick={() => void loadMore()}
                className="btn-secondary !py-1.5 !px-4 text-[12.5px] disabled:opacity-50"
                aria-busy={loadingMore}
              >
                {loadingMore ? 'Yükleniyor…' : 'Daha fazla yükle'}
              </button>
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-ink-faint">
        {live ? 'Canlı: yeni olaylar anında eklenir.' : 'Canlı bağlantı yok; 30 saniyede bir yenileniyor.'}
      </p>
    </div>
  );
}
