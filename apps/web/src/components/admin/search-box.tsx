'use client';

import { useId, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

/**
 * URL tabanlı arama kutusu: Enter/düğme → `?q=` (diğer parametreler korunur, `cursor` sıfırlanır).
 * Sunucu bileşeni listeyi searchParams'tan okur; böylece arama paylaşılabilir ve geri tuşu çalışır.
 */
export function SearchBox({
  placeholder,
  label = 'Ara',
  className,
  param = 'q',
}: {
  placeholder: string;
  label?: string;
  className?: string;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const id = useId();
  const [value, setValue] = useState(sp.get(param) ?? '');

  function apply(next: string) {
    const params = new URLSearchParams(sp.toString());
    params.delete('cursor');
    if (next.trim()) params.set(param, next.trim());
    else params.delete(param);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        apply(value);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-ink-faint absolute left-3 pointer-events-none" aria-hidden="true" />
        <input
          id={id}
          type="search"
          className="input !pl-9 !pr-9 min-h-[44px] w-full"
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            aria-label="Aramayı temizle"
            className="absolute right-2 p-1.5 rounded-md text-ink-faint hover:text-ink"
            onClick={() => {
              setValue('');
              apply('');
            }}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </form>
  );
}
