/**
 * E2E global setup — her koşu öncesi izole test DB'sini temizler (rate-limit sayaçları dahil)
 * ve migration'ların uygulandığını doğrular. Production adresi kabul edilmez.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const TABLES = [
  'PublicScan',
  'IntegrationWebhookDelivery',
  'CatalogSync',
  'CatalogProduct',
  'StoreConnection',
  'ReportShare',
  'AgencyLinkRequest',
  'AgencyInvite',
  'WorkspaceAccess',
  'AgencyWorkspace',
  'AgencyMembership',
  'AgencyAccount',
  'BrandMention',
  'Citation',
  'ModelRun',
  'Prompt',
  'Competitor',
  'Brand',
  'TeamInvite',
  'AuthToken',
  'ApiToken',
  'BrandFact',
  'AlertConfig',
  'Audit',
  'PageEmbedding',
  'AuditLog',
  'NotificationLog',
  'RunBatch',
  'RateLimitBucket',
  'SystemConfig',
  'User',
  'Tenant',
];

export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || /supabase\.com|neon\.tech|pooler\./i.test(url)) throw new Error('TEST_DATABASE_URL izole olmalı');
  const dbDir = path.resolve(__dirname, '../../../../packages/db');
  execSync('npx prisma migrate deploy', {
    cwd: dbDir,
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'pipe',
  });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const sql = readFileSync(path.resolve(__dirname, '../integration/realtime-stub.sql'), 'utf8');
  for (const stmt of sql
    .split(/;\s*\n/)
    .map((x) =>
      x
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean)) {
    await prisma.$executeRawUnsafe(stmt);
  }
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
  await prisma.$disconnect();
}
