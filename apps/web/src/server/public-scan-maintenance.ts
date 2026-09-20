/**
 * Public tarama bakımı — `expiresAt < now` satırlarını partiler hâlinde siler (daily-run hop 0).
 * Deadline'a uyar: bütçe dolunca kalan satırlar bir sonraki geceye kalır.
 */
import { prisma } from './prisma';
import { log } from './logger';

const BATCH = 500;

export async function pruneExpiredPublicScans(opts: { deadlineAt: number; now?: Date }): Promise<{ deleted: number }> {
  const now = opts.now ?? new Date();
  let deleted = 0;
  for (let i = 0; i < 200; i += 1) {
    if (Date.now() >= opts.deadlineAt) break;
    const rows = await prisma.publicScan.findMany({
      where: { expiresAt: { lt: now } },
      select: { id: true },
      take: BATCH,
    });
    if (rows.length === 0) break;
    const res = await prisma.publicScan.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
    deleted += res.count;
    if (rows.length < BATCH) break;
  }
  if (deleted > 0) log.info('public-scan.pruned', { deleted });
  return { deleted };
}
