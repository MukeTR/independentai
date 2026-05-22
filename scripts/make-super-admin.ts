/**
 * Belirli bir kullanıcıya super admin yetkisi verir.
 *
 * Kullanım:
 *   DATABASE_URL='<url>' EMAIL='kullanici@example.com' npx tsx scripts/make-super-admin.ts
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.EMAIL;
  if (!url || !email) {
    console.error('DATABASE_URL ve EMAIL env zorunlu');
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`❌ Kullanıcı bulunamadı: ${email}`);
      process.exit(1);
    }
    if (user.isSuperAdmin) {
      console.log(`ℹ️  ${email} zaten super admin`);
      return;
    }
    const updated = await prisma.user.update({
      where: { email },
      data: { isSuperAdmin: true },
    });
    console.log(`✅ ${updated.email} artık super admin`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
