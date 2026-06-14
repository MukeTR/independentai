import type { ReactNode } from 'react';

/**
 * Infinite horizontal marquee. Children are rendered twice so the -50% loop
 * (see globals.css `.marquee-track`) is seamless. Pauses on hover.
 */
export function Marquee({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`marquee-mask overflow-hidden ${className ?? ''}`}>
      <div className="marquee-track">
        <div className="flex shrink-0 items-center" aria-hidden={false}>
          {children}
        </div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
