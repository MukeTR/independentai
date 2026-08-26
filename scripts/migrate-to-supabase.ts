/**
 * Neon → Supabase veri taşıma (tek yönlü kopya).
 *
 * Şema saf Postgres olduğu için taşıma iki adımdır:
 *   1) Hedefte şemayı oluştur:  DIRECT_URL='<supabase-direct>' pnpm db:push
 *   2) Bu script ile veriyi kopyala.
 *
 * Kullanım:
 *   SOURCE_DATABASE_URL='<neon-url>' TARGET_DATABASE_URL='<supabase-direct-url>' \
 *     npx tsx scripts/migrate-to-supabase.ts
 *
 * Varsayılan olarak KURU ÇALIŞMA yapar (sadece sayar). Gerçekten yazmak için:
 *   ... npx tsx scripts/migrate-to-supabase.ts --apply
 *
 * Idempotent: createMany + skipDuplicates ile aynı id'ler ikinci kez yazılmaz,
 * yarıda kalırsa yeniden çalıştırılabilir.
 */
import { PrismaClient } from '@prisma/client';

const APPLY = process.argv.includes('--apply');
const CHUNK = 500;

/** FK sırası — parent tablolar önce. */
const TABLES = [
  'tenant',
  'user',
  'brand',
  'competitor',
  'prompt',
  'modelRun',
  'brandMention',
  'citation',
  'audit',
  'pageEmbedding',
  'alertConfig',
  'brandFact',
  'apiToken',
  'systemConfig',
] as const;

type TableName = (typeof TABLES)[number];

function delegate(client: PrismaClient, table: TableName) {
  return (client as unknown as Record<TableName, {
    findMany: (args?: unknown) => Promise<Record<string, unknown>[]>;
    createMany: (args: { data: Record<string, unknown>[]; skipDuplicates: boolean }) => Promise<{ count: number }>;
    count: () => Promise<number>;
  }>)[table];
}

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL;
  const targetUrl = process.env.TARGET_DATABASE_URL;

  if (!sourceUrl || !targetUrl) {
    console.error('SOURCE_DATABASE_URL ve TARGET_DATABASE_URL tanımlı olmalı.');
    process.exit(1);
  }
  if (sourceUrl === targetUrl) {
    console.error('Kaynak ve hedef aynı olamaz.');
    process.exit(1);
  }

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  console.log(`Kaynak : ${new URL(sourceUrl).host}`);
  console.log(`Hedef  : ${new URL(targetUrl).host}`);
  console.log(APPLY ? '\nMOD: UYGULA (hedefe yazılacak)\n' : '\nMOD: KURU ÇALIŞMA (--apply ile gerçek kopya)\n');

  const summary: { table: string; source: number; written: number; target: number }[] = [];

  try {
    for (const table of TABLES) {
      const src = delegate(source, table);
      const dst = delegate(target, table);

      const rows = await src.findMany();
      let written = 0;

      if (APPLY && rows.length > 0) {
        for (let i = 0; i < rows.length; i += CHUNK) {
          const batch = rows.slice(i, i + CHUNK);
          const res = await dst.createMany({ data: batch, skipDuplicates: true });
          written += res.count;
        }
      }

      const targetCount = await dst.count();
      summary.push({ table, source: rows.length, written, target: targetCount });
      console.log(
        `${table.padEnd(14)} kaynak=${String(rows.length).padStart(6)}  yazılan=${String(written).padStart(6)}  hedef=${String(targetCount).padStart(6)}`,
      );
    }

    console.log('\n--- Doğrulama ---');
    const mismatched = summary.filter((s) => APPLY && s.target < s.source);
    if (!APPLY) {
      console.log('Kuru çalışma bitti. Gerçek kopya için --apply ekleyin.');
    } else if (mismatched.length === 0) {
      console.log('✅ Tüm tablolarda hedef satır sayısı kaynağa eşit veya fazla.');
    } else {
      console.log('❌ Eksik kalan tablolar:', mismatched.map((m) => `${m.table} (${m.target}/${m.source})`).join(', '));
      process.exitCode = 1;
    }
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
