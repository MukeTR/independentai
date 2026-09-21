'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, Sparkles, AlertTriangle, X } from 'lucide-react';
import type { AnnouncementDto } from '@/server/announcements';

/**
 * Duyuru şeridi — `GET /api/public/announcements?placement=` ile yayındaki duyuruları çeker (en çok 3, en yeni üstte).
 *  - `role="status"` + `aria-live="polite"`: ekran okuyucu yeni şeridi duyurur, odak çalınmaz.
 *  - Kapatma `localStorage["iai_ann:<id>"] = updatedAt`: her düzenleme (metin/bağlantı, tarih, aç/kapa — Prisma
 *    `@updatedAt`) anahtarı yeniler → kapatanlara yeniden görünür. Depolama erişimi (gizli pencere, engel) try/catch ile
 *    yutulur; ağ hatasında şerit çizilmez.
 *  - Flaş yok: liste yalnız kapatılmışlar o liste için depodan okunduktan sonra çizilir (`initial` verilse de ilk boya boş;
 *    sunucu/istemci çıktısı aynı kalır).
 *  - Yerleşim: INTEGRATE `(home)/layout` LANDING, `(marketing)/layout` TOOLS, `dashboard/layout` APP, pricing PRICING.
 */
export type AnnouncementPlacementKey = 'LANDING' | 'PRICING' | 'TOOLS' | 'APP';

const KEY_PREFIX = 'iai_ann:';

function readDismissed(id: string): string | null {
  try {
    return window.localStorage.getItem(KEY_PREFIX + id);
  } catch {
    return null;
  }
}
function writeDismissed(id: string, updatedAt: string): void {
  try {
    window.localStorage.setItem(KEY_PREFIX + id, updatedAt);
  } catch {
    /* depolama kapalı — yalnız bu oturumda gizlenir */
  }
}

const TONE = {
  INFO: { icon: Megaphone, cls: 'bg-brand-glow text-brand-deep border-brand/20' },
  PROMO: { icon: Sparkles, cls: 'bg-positive/10 text-positive border-positive/20' },
  WARN: { icon: AlertTriangle, cls: 'bg-warning/10 text-warning border-warning/25' },
} as const;

export function AnnouncementBanner({
  placement,
  className,
  initial,
}: {
  placement: AnnouncementPlacementKey;
  className?: string;
  /** Sunucudan hazır liste (isteğe bağlı; verilirse ağ isteği yapılmaz) */
  initial?: AnnouncementDto[];
}) {
  const [items, setItems] = useState<AnnouncementDto[]>(initial ?? []);
  /** Kapatılmışlar; `of` hangi liste için hesaplandığını tutar → o liste gelene dek hiçbir şey çizilmez (flaş yok). */
  const [dismissed, setDismissed] = useState<{ of: AnnouncementDto[]; ids: Set<string> } | null>(null);

  useEffect(() => {
    let alive = true;
    if (!initial) {
      (async () => {
        try {
          const res = await fetch(`/api/public/announcements?placement=${placement}`, { credentials: 'omit' });
          if (!res.ok) return;
          const data = (await res.json()) as { items?: AnnouncementDto[] };
          if (alive && Array.isArray(data.items)) setItems(data.items.slice(0, 3));
        } catch {
          /* ağ hatası — şerit yok */
        }
      })();
    }
    return () => {
      alive = false;
    };
  }, [placement, initial]);

  useEffect(() => {
    // Kapatılmışları depodan oku (hydration sonrası, sunucu/istemci farkı olmasın diye effect içinde).
    const ids = new Set<string>();
    for (const a of items) if (readDismissed(a.id) === a.updatedAt) ids.add(a.id);
    setDismissed({ of: items, ids });
  }, [items]);

  const visible = dismissed && dismissed.of === items ? items.filter((a) => !dismissed.ids.has(a.id)) : [];

  return (
    <div role="status" aria-live="polite" className={className} data-placement={placement}>
      {visible.map((a) => (
        <AnnouncementRow
          key={a.id}
          a={a}
          onDismiss={() => {
            writeDismissed(a.id, a.updatedAt);
            setDismissed((d) => (d ? { of: d.of, ids: new Set(d.ids).add(a.id) } : d));
          }}
        />
      ))}
    </div>
  );
}

export function AnnouncementRow({ a, onDismiss }: { a: AnnouncementDto; onDismiss?: () => void }) {
  const tone = TONE[a.tone] ?? TONE.INFO;
  const Icon = tone.icon;
  const external = !!a.href && /^https?:/i.test(a.href);
  return (
    <div className={`border-b text-[13px] ${tone.cls}`}>
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <p className="flex-1 min-w-0 leading-snug">
          <span>{a.text}</span>
          {a.href &&
            (external ? (
              <a
                href={a.href}
                className="underline underline-offset-2 font-medium ml-2 whitespace-nowrap"
                rel="noreferrer"
              >
                {a.ctaLabel || 'İncele'} →
              </a>
            ) : (
              <Link href={a.href} className="underline underline-offset-2 font-medium ml-2 whitespace-nowrap">
                {a.ctaLabel || 'İncele'} →
              </Link>
            ))}
        </p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Duyuruyu kapat"
            className="shrink-0 p-2 -m-1 rounded-md opacity-70 hover:opacity-100 min-w-[36px] min-h-[36px] inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
