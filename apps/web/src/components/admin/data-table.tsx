import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Admin tablo kabuğu: `overflow-x-auto` + min genişlik, thead 11 px büyük harf, boş durum satırı;
 * md altında isteğe bağlı kart listesi (`mobileRow`). Sunucu bileşeni — satır içeriği çağıranın.
 */
export type DataColumn<T> = {
  key: string;
  header: string;
  align?: 'left' | 'right';
  className?: string;
  cell: (row: T) => React.ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  caption,
  minWidth = 640,
  mobileRow,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: string;
  /** Ekran okuyucu için tablo başlığı */
  caption: string;
  minWidth?: number;
  mobileRow?: (row: T) => React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className={cn('overflow-x-auto', mobileRow && 'hidden md:block')}>
        <table className="w-full text-[13px]" style={{ minWidth }}>
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-paper-2 text-left text-[11px] uppercase tracking-wider text-ink-faint">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn('px-4 py-3 font-medium', c.align === 'right' && 'text-right', c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-ink-muted">
                  {empty}
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={rowKey(r)} className="hover:bg-paper-2/50 transition align-top">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.align === 'right' && 'text-right tabular', c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {mobileRow && (
        <ul className="md:hidden divide-y divide-hairline" aria-label={caption}>
          {rows.length === 0 && <li className="text-center py-10 text-ink-muted text-[13px]">{empty}</li>}
          {rows.map((r) => (
            <li key={rowKey(r)} className="p-4">
              {mobileRow(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Cursor sayfalama: "Sonraki sayfa" bağlantısı (mevcut parametreler korunur). */
export function CursorNav({
  nextCursor,
  basePath,
  params,
  shown,
  total,
  className,
}: {
  nextCursor: string | null;
  basePath: string;
  params: Record<string, string | undefined>;
  shown: number;
  total?: number;
  className?: string;
}) {
  const clean = Object.entries(params).filter((kv): kv is [string, string] => !!kv[1] && kv[0] !== 'cursor');
  const backQs = new URLSearchParams(clean).toString();
  const nextQs = new URLSearchParams([
    ...clean,
    ...(nextCursor ? [['cursor', nextCursor] as [string, string]] : []),
  ]).toString();
  const isPaged = !!params.cursor;
  return (
    <nav
      aria-label="Sayfalama"
      className={cn('flex items-center justify-between gap-3 text-[12.5px] text-ink-muted', className)}
    >
      <span>
        {shown.toLocaleString('tr-TR')} kayıt gösteriliyor
        {total !== undefined ? ` · toplam ${total.toLocaleString('tr-TR')}` : ''}
      </span>
      <span className="flex items-center gap-2">
        {isPaged && (
          <Link href={backQs ? `${basePath}?${backQs}` : basePath} className="btn-secondary !py-2 !px-3 text-[12.5px]">
            İlk sayfa
          </Link>
        )}
        {nextCursor && (
          <Link href={`${basePath}?${nextQs}`} className="btn-secondary !py-2 !px-3 text-[12.5px]" rel="next">
            Sonraki sayfa →
          </Link>
        )}
      </span>
    </nav>
  );
}
