'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { apiFetch, errorMessage } from '@/lib/api-client';
import { handleBlockedResponse } from '@/lib/blocked-redirect';
import type { AuditFinding, GeoAuditResult } from '@/server/geo-audit';
import { DEMO } from './demo';

/**
 * Landing boyunca tek bir örnek şirketi takip ederiz. Ziyaretçi kendi alan adını girerse
 * hero'daki tarama gerçek GEO denetimini (POST /api/tools/geo-audit, kayıt gerekmez) çalıştırır ve
 * hero + "sana ne yaptığımızı gösterelim" bölümü onun verisiyle dolar; kalan bölümler temsili
 * hikâyeyi (acme.com) anlatmaya devam eder, yalnızca alan adı değişir.
 */

export type ScanStatus = 'demo' | 'running' | 'done' | 'error';

export type ScanState = {
  status: ScanStatus;
  /** Girilen alan adı (normalize). Demo'da acme.com. */
  domain: string;
  result: GeoAuditResult | null;
  error: string | null;
  /** Her yeni tarama için artar — hero animasyonunu yeniden başlatmak için anahtar. */
  run: number;
};

type Story = {
  scan: ScanState;
  startScan: (input: string) => void;
  /** Canlı sonuç var mı (hero/wow bölümleri gerçek veriyi gösterir). */
  live: boolean;
  /** Bölümlerde kullanılacak alan adı: canlı ise ziyaretçinin, değilse acme.com. */
  domain: string;
  /** Canlı bulgular (fail → warn → pass sıralı) veya null. */
  findings: AuditFinding[] | null;
  /** Fırsat sayısı: canlıda fail+warn, demo'da 18. */
  opportunities: number;
  /** Skor: canlıda denetim skoru, demo'da 27. */
  score: number;
  heroRef: React.RefObject<HTMLElement | null>;
};

const StoryContext = createContext<Story | null>(null);

const HOST_RE = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

export function normalizeDomainInput(raw: string): string | null {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0];
  return s && HOST_RE.test(s) ? s : null;
}

const RANK: Record<AuditFinding['status'], number> = { fail: 0, warn: 1, pass: 2 };

export function StoryProvider({ children }: { children: ReactNode }) {
  const [scan, setScan] = useState<ScanState>({
    status: 'demo',
    domain: DEMO.domain,
    result: null,
    error: null,
    run: 0,
  });
  const heroRef = useRef<HTMLElement | null>(null);
  const runRef = useRef(0);

  const startScan = useCallback((input: string) => {
    const domain = normalizeDomainInput(input);
    if (!domain) {
      setScan((s) => ({ ...s, status: 'error', error: 'Geçerli bir alan adı girin, örn. sirketiniz.com' }));
      return;
    }
    // apiFetch kendi AbortController'ını kullanır; eski bir isteğin geç cevabını run sayacıyla eleriz.
    const myRun = ++runRef.current;
    setScan({ status: 'running', domain, result: null, error: null, run: myRun });
    heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    apiFetch<GeoAuditResult>('/api/tools/geo-audit', { method: 'POST', json: { url: domain }, timeoutMs: 60_000 })
      .then((result) => {
        if (runRef.current !== myRun) return;
        if (handleBlockedResponse(result)) return; // yasaklı site → yönlendirme
        setScan((s) => ({ ...s, status: 'done', result, error: null }));
      })
      .catch((err: unknown) => {
        if (runRef.current !== myRun) return;
        setScan((s) => ({ ...s, status: 'error', result: null, error: errorMessage(err) }));
      });
  }, []);

  const value = useMemo<Story>(() => {
    const live = scan.status === 'done' && !!scan.result;
    const findings = live ? [...scan.result!.findings].sort((a, b) => RANK[a.status] - RANK[b.status]) : null;
    const opportunities = findings ? findings.filter((f) => f.status !== 'pass').length : DEMO.issues;
    return {
      scan,
      startScan,
      live,
      domain: scan.status === 'demo' ? DEMO.domain : scan.domain,
      findings,
      opportunities,
      score: live ? scan.result!.overallScore : DEMO.score,
      heroRef,
    };
  }, [scan, startScan]);

  return <StoryContext.Provider value={value}>{children}</StoryContext.Provider>;
}

export function useStory(): Story {
  const ctx = useContext(StoryContext);
  if (!ctx) throw new Error('useStory yalnızca <StoryProvider> içinde kullanılabilir');
  return ctx;
}
