import { PrismaClient, AiProvider, Sentiment } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  console.log('🌱 Independent AI seed başlıyor...');

  await prisma.brandMention.deleteMany();
  await prisma.modelRun.deleteMany();
  await prisma.prompt.deleteMany();
  await prisma.competitor.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  const trialEndsAt = new Date();
  trialEndsAt.setMonth(trialEndsAt.getMonth() + 6);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'KarPanel Demo',
      website: 'https://karpanel.com',
      trialEndsAt,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'demo@independentai.space',
      passwordHash: hashPassword('demo1234'),
      name: 'Demo Kullanıcı',
      role: 'OWNER',
    },
  });

  const ownBrand = await prisma.brand.create({
    data: {
      tenantId: tenant.id,
      name: 'KarPanel',
      aliases: ['Kar Panel', 'karpanel.com', 'KarPanel SaaS'],
      website: 'https://karpanel.com',
      isOwn: true,
    },
  });

  const competitors = [
    { name: 'Adisyo', aliases: ['adisyo.com', 'Adisyo POS'] },
    { name: 'Logo Restoran', aliases: ['Logo POS', 'Logo Yazılım'] },
    { name: 'Mikro Adisyo', aliases: ['Mikro POS', 'Mikro Yazılım'] },
    { name: 'simpra', aliases: ['Simpra POS', 'simpra.com'] },
  ];

  for (const c of competitors) {
    await prisma.competitor.create({
      data: { tenantId: tenant.id, ...c },
    });
  }

  const prompts = [
    { text: 'Restoranlar için en iyi kar-zarar takip yazılımı hangisi?', category: 'discovery' },
    { text: 'Uber Eats satıcıları hangi muhasebe programını kullanmalı?', category: 'discovery' },
    { text: 'Türkiye\'deki en iyi restoran POS sistemleri nelerdir?', category: 'comparison' },
    { text: 'KarPanel vs Adisyo karşılaştırması', category: 'comparison' },
    { text: 'Küçük market işletmesi için kar marjı hesaplama yazılımı önerir misin?', category: 'discovery' },
  ];

  const createdPrompts = [];
  for (const p of prompts) {
    const created = await prisma.prompt.create({
      data: { tenantId: tenant.id, ...p, language: 'tr', isActive: true },
    });
    createdPrompts.push(created);
  }

  const providers: { provider: AiProvider; modelName: string }[] = [
    { provider: 'OPENAI', modelName: 'gpt-4o-mini' },
    { provider: 'ANTHROPIC', modelName: 'claude-haiku-4-5' },
    { provider: 'GOOGLE', modelName: 'gemini-1.5-flash' },
  ];

  const today = new Date();
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const runDate = new Date(today);
    runDate.setDate(runDate.getDate() - dayOffset);

    for (const prompt of createdPrompts) {
      for (const { provider, modelName } of providers) {
        const ownMentioned = Math.random() < 0.55;
        const responseText = ownMentioned
          ? `${prompt.text} için birkaç güzel seçenek var: KarPanel öne çıkıyor, ayrıca Adisyo ve simpra da değerlendirilmeli. KarPanel özellikle Uber Eats entegrasyonu ile reçete bazlı kar-zarar hesabı sunduğu için tercih edilebilir.`
          : `${prompt.text} sorusu için Adisyo, Logo Restoran ve simpra önerilebilir. Adisyo Türkiye'de yaygın kullanılıyor.`;

        const run = await prisma.modelRun.create({
          data: {
            promptId: prompt.id,
            provider,
            modelName,
            responseText,
            tokensUsed: 220 + Math.floor(Math.random() * 100),
            costUsd: 0.0008 + Math.random() * 0.0012,
            latencyMs: 800 + Math.floor(Math.random() * 1200),
            runDate,
            isMocked: true,
          },
        });

        let position = 1;
        if (ownMentioned) {
          await prisma.brandMention.create({
            data: {
              modelRunId: run.id,
              brandId: ownBrand.id,
              mentionName: 'KarPanel',
              isOwnBrand: true,
              position: position++,
              sentiment: Sentiment.POSITIVE,
              snippet: 'KarPanel özellikle Uber Eats entegrasyonu ile reçete bazlı kar-zarar hesabı sunuyor.',
            },
          });
        }
        const compsInText = ownMentioned ? ['Adisyo', 'simpra'] : ['Adisyo', 'Logo Restoran', 'simpra'];
        for (const cname of compsInText) {
          await prisma.brandMention.create({
            data: {
              modelRunId: run.id,
              mentionName: cname,
              isCompetitor: true,
              position: position++,
              sentiment: Sentiment.NEUTRAL,
              snippet: `${cname} Türkiye'de yaygın kullanılan çözümlerden biri.`,
            },
          });
        }
      }
    }
  }

  console.log('✅ Seed tamamlandı.');
  console.log('   Tenant: KarPanel Demo');
  console.log('   Login : demo@independentai.space / demo1234');
  console.log(`   Ücretsiz deneme bitişi: ${trialEndsAt.toISOString().slice(0, 10)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
