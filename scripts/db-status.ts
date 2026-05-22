/**
 * Hızlı DB durum raporu — production + staging için.
 * Sadece okuma yapar, yazma yok.
 *
 * Kullanım:
 *   DATABASE_URL='<url>' npx tsx scripts/db-status.ts
 */
import { PrismaClient } from '@prisma/client';

async function inspect(label: string, url: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  console.log(`\n=== ${label} ===`);
  console.log(`URL host: ${new URL(url).host}`);

  try {
    const [tenants, users, prompts, runs, superAdmins] = await Promise.all([
      prisma.tenant.count(),
      prisma.user.count(),
      prisma.prompt.count(),
      prisma.modelRun.count(),
      prisma.user.count({ where: { isSuperAdmin: true } }),
    ]);

    console.log(`✅ Bağlantı OK`);
    console.log(`   Tenant       : ${tenants}`);
    console.log(`   User         : ${users}`);
    console.log(`   Super admin  : ${superAdmins}`);
    console.log(`   Prompt       : ${prompts}`);
    console.log(`   ModelRun     : ${runs}`);

    if (users > 0) {
      const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          email: true,
          isSuperAdmin: true,
          role: true,
          createdAt: true,
          tenant: { select: { name: true } },
        },
      });
      console.log(`\n   Son 10 kullanıcı:`);
      for (const u of recentUsers) {
        const badges = [u.role, u.isSuperAdmin ? 'SUPER' : ''].filter(Boolean).join(' · ');
        console.log(`   - ${u.email} (${u.tenant.name}) [${badges}] · ${u.createdAt.toISOString().slice(0, 10)}`);
      }
    }
  } catch (err) {
    console.log(`❌ HATA: ${err instanceof Error ? err.message : err}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const STAGING = 'postgresql://neondb_owner:npg_kMZL3nFxfEK7@ep-shy-salad-ap1ijb8p-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const PRODUCTION = 'postgresql://neondb_owner:npg_kMZL3nFxfEK7@ep-summer-brook-ap7c96ie-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

  await inspect('STAGING', STAGING);
  await inspect('PRODUCTION', PRODUCTION);
}

main().catch(console.error);
