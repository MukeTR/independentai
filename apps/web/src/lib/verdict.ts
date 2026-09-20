/**
 * Hüküm satırı — mikro-kopya sözleşmesi (spec §1): sonuç başlığı "3 kritik, 4 uyarı, 9 tamam".
 * Sunucu importu yok: istemci (site-tool.tsx) ve sunucu (site-scan/core.ts) aynı fonksiyonu kullanır.
 */

export type Verdict = { fail: number; warn: number; pass: number };

export type VerdictLike = {
  verdict?: Verdict | null;
  findings?: { status: 'pass' | 'warn' | 'fail'; weight?: number }[];
  waf?: boolean;
  partial?: boolean;
};

/** Puanlı (weight > 0) bulguları sayar; bilgi notları (weight 0) hükme girmez. */
export function verdictOf(findings: { status: 'pass' | 'warn' | 'fail'; weight?: number }[]): Verdict {
  const v: Verdict = { fail: 0, warn: 0, pass: 0 };
  for (const f of findings) {
    if ((f.weight ?? 1) <= 0) continue;
    v[f.status] += 1;
  }
  return v;
}

/** "3 kritik, 4 uyarı, 9 tamam"; WAF'ta "Bot koruması nedeniyle taranamadı". */
export function verdictLine(result: VerdictLike): string {
  if (result.waf) return 'Bot koruması nedeniyle taranamadı';
  const v = result.verdict ?? verdictOf(result.findings ?? []);
  const parts = [`${v.fail} kritik`, `${v.warn} uyarı`, `${v.pass} tamam`];
  return parts.join(', ');
}

/** Toplam kontrol sayısı (puanlı). */
export function verdictTotal(v: Verdict): number {
  return v.fail + v.warn + v.pass;
}
