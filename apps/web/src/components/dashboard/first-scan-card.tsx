import Link from 'next/link';
import { ArrowRight, ScanSearch } from 'lucide-react';
import { getFirstScan } from '@/server/first-scan';
import { prisma } from '@/server/prisma';

const fmt = (d: Date) => d.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });

/**
 * "İlk site taraması" kartı — tenant'ın son CRAWLER denetimi: skor + hüküm + 3 öneri + "Tümünü gör".
 * Denetim yoksa: kurulum son 30 dk içinde bittiyse ve site varsa "hazırlanıyor"; aksi hâlde null.
 */
export async function FirstScanCard({ tenantId }: { tenantId: string }) {
  const scan = await getFirstScan(tenantId);
  if (!scan) {
    const t = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { website: true, onboardingCompletedAt: true },
    });
    const recent = t?.onboardingCompletedAt && Date.now() - t.onboardingCompletedAt.getTime() < 30 * 60_000;
    if (!t?.website || !recent) return null;
    return (
      <div className="card p-6 mb-8 rise-2" role="status">
        <div className="flex items-center gap-2">
          <ScanSearch className="w-4 h-4 text-brand" aria-hidden />
          <h2 className="font-display text-[18px]">İlk site taraması hazırlanıyor…</h2>
        </div>
        <p className="text-[13px] text-ink-muted mt-1.5">
          Sitenizin AI botlarına açıklığını ölçüyoruz; bir dakika içinde bu kartta görünür. Beklemeden{' '}
          <Link href="/dashboard/tools/ai-crawler" className="underline text-brand-deep">
            AI Crawler testini
          </Link>{' '}
          elle de çalıştırabilirsiniz.
        </p>
      </div>
    );
  }

  const tone = scan.score >= 70 ? 'text-positive' : scan.score >= 40 ? 'text-warning' : 'text-danger';
  return (
    <section className="card p-6 mb-8 rise-2" aria-labelledby="first-scan-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="eyebrow">İlk site taraması</div>
          <h2 id="first-scan-title" className="font-display text-[20px] mt-1 truncate">
            {scan.hostname}
          </h2>
          <p className="text-[12.5px] text-ink-muted mt-1">
            {scan.verdict.fail} kritik, {scan.verdict.warn} uyarı, {scan.verdict.pass} tamam · {fmt(scan.createdAt)} ·
            AI bot erişimi ve indekslenebilirlik (deterministik tarayıcı; hazırlık ölçer, AI davranışını değil)
          </p>
        </div>
        <div className="text-right">
          <div
            className={`font-display text-[40px] tabular leading-none ${tone}`}
            aria-label={`Skor ${scan.score} / 100`}
          >
            {scan.score}
          </div>
          <div className="text-[11px] text-ink-faint font-mono">/ 100</div>
        </div>
      </div>
      {scan.recommendations.length > 0 && (
        <ol className="mt-4 space-y-2" aria-label="İlk üç öneri">
          {scan.recommendations.map((r, i) => (
            <li key={`${r.title}-${i}`} className="flex gap-3 text-[13.5px]">
              <span className="font-mono text-[11px] text-ink-faint pt-0.5 tabular">{i + 1}.</span>
              <span>
                <span className="text-ink">{r.title}</span>
                {r.detail && <span className="block text-[12.5px] text-ink-muted mt-0.5">{r.detail}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-4">
        <Link
          href="/dashboard/tools/ai-crawler"
          className="text-[13px] text-brand-deep hover:text-brand inline-flex items-center gap-1"
        >
          Tümünü gör <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
