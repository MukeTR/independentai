#!/usr/bin/env node
/**
 * Migration ön kontrolü (production'a dokunmadan):
 *   1) Hedef DB'de uygulanmamış migration'ları listeler (`prisma migrate status`).
 *   2) Hedef DB ile şema arasındaki farkı SQL olarak üretir (`prisma migrate diff`) ve
 *      DROP / ALTER ... TYPE / TRUNCATE gibi kayıp riski taşıyan ifadeleri işaretler.
 *   3) Sonucu scratch dizinine yazar; yıkıcı ifade varsa çıkış kodu 1 (deploy adımı durur).
 *
 *   DIRECT_URL=postgres://... node scripts/migration-dry-run.mjs [--out ./tmp]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '../packages/db');
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DIRECT_URL gerekli (production için session pooler / direct bağlantı).');
  process.exit(2);
}
const outIdx = process.argv.indexOf('--out');
const outDir = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : path.resolve(here, '../.migration-dry-run');
mkdirSync(outDir, { recursive: true });
const env = { ...process.env, DATABASE_URL: url, DIRECT_URL: url };

function run(args) {
  try {
    return {
      ok: true,
      out: execFileSync('npx', ['prisma', ...args], {
        cwd: dbDir,
        env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }),
    };
  } catch (err) {
    return { ok: false, out: `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim(), status: err.status };
  }
}

const status = run(['migrate', 'status']);
writeFileSync(path.join(outDir, 'status.txt'), status.out);
const diff = run(['migrate', 'diff', '--from-url', url, '--to-schema-datamodel', 'prisma/schema.prisma', '--script']);
writeFileSync(path.join(outDir, 'pending.sql'), diff.out);

const destructive = diff.out
  .split('\n')
  .filter((l) =>
    /^\s*(DROP\s+(TABLE|COLUMN|INDEX|TYPE)|ALTER\s+TABLE\s+.*\s+DROP\s+|TRUNCATE|ALTER\s+COLUMN\s+.*\s+TYPE)/i.test(l),
  );

const summary = {
  pendingMigrations: (status.out.match(/Following migrations? have not yet been applied:[\s\S]*?(?=\n\n|$)/) ?? [''])[0]
    .split('\n')
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean),
  statusOk: status.ok,
  diffLines: diff.out.split('\n').filter((l) => l.trim() && !l.startsWith('--')).length,
  destructiveStatements: destructive,
  outDir,
};
console.log(JSON.stringify(summary, null, 2));
if (destructive.length) {
  console.error('\nYIKICI ifade tespit edildi — backup + açık onay olmadan uygulanmaz.');
  process.exit(1);
}
