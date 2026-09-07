#!/usr/bin/env node
/**
 * Supabase Realtime yetkilendirme SQL'ini (supabase/realtime-policies.sql) hedef veritabanına uygular.
 *
 *   DIRECT_URL=postgres://... node scripts/realtime-apply.mjs            # uygula
 *   DIRECT_URL=postgres://... node scripts/realtime-apply.mjs --check    # yalnızca doğrula (yazmaz)
 *
 * Güvenlik: yalnızca `realtime` şeması olan (Supabase) veritabanında çalışır; yerel test DB'de
 * stub şema varsa da uygulanabilir. Bağlantı dizesi ekrana yazılmaz. Idempotent (create or replace / drop if exists).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(here, '../supabase/realtime-policies.sql');
const check = process.argv.includes('--check');
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error('DIRECT_URL (veya DATABASE_URL) gerekli.');
  process.exit(2);
}

let Client;
try {
  ({ Client } = require(path.resolve(here, '../node_modules/pg')));
} catch {
  try {
    ({ Client } = require('pg'));
  } catch {
    console.error('`pg` paketi bulunamadı. Alternatif: psql "$DIRECT_URL" -f supabase/realtime-policies.sql');
    process.exit(2);
  }
}

const client = new Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
});
await client.connect();
try {
  const schema = await client.query(`select 1 from information_schema.schemata where schema_name = 'realtime'`);
  if (!schema.rowCount) {
    console.error("Hedef DB'de `realtime` şeması yok (Supabase değil?). İşlem durduruldu.");
    process.exit(3);
  }
  if (check) {
    const fn = await client.query(
      `select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname='public' and p.proname='iai_realtime_can_join'`,
    );
    const pol = await client.query(
      `select policyname from pg_policies where schemaname='realtime' and tablename='messages' and policyname like 'iai %'`,
    );
    const rls = await client.query(
      `select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='realtime' and c.relname='messages'`,
    );
    console.log(
      JSON.stringify(
        {
          functionPresent: fn.rowCount > 0,
          policies: pol.rows.map((r) => r.policyname),
          rlsEnabled: rls.rows[0]?.relrowsecurity ?? null,
        },
        null,
        2,
      ),
    );
    process.exit(fn.rowCount > 0 && pol.rowCount >= 2 && rls.rows[0]?.relrowsecurity ? 0 : 1);
  }
  const sql = readFileSync(sqlPath, 'utf8');
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  console.log('Realtime politikaları uygulandı:', path.relative(process.cwd(), sqlPath));
} catch (err) {
  await client.query('rollback').catch(() => undefined);
  console.error('Uygulama başarısız:', err instanceof Error ? err.message : String(err));
  process.exit(1);
} finally {
  await client.end();
}
