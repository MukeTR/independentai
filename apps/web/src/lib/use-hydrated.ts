'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Hidrasyon tamamlanana kadar `false`. Formların gönder düğmeleri bunu `disabled`'a bağlar; böylece
 * React olay dinleyicileri bağlanmadan yapılan tıklama tarayıcının **native form submit**'ine
 * (tam sayfa yenileme, veri kaybı) dönüşmez.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
