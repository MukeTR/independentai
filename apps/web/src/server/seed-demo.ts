/**
 * Prod-GÜVENLİ demo seed. SADECE demo tenant'ının verisine dokunur (scoped delete),
 * asla global deleteMany kullanmaz — diğer tenant'ların (gerçek kullanıcılar) verisi korunur.
 * Idempotent: tekrar çalıştırınca demo verisini tazeler.
 */
import { prisma } from './prisma';
import { hashPassword } from './password';
import type { AiProvider, Sentiment, MentionType } from '@independentai/db';

const DEMO_EMAIL = 'demo@independentai.space';
const DEMO_PASSWORD = 'demo1234';

const CITATION_DOMAINS = [
  'linkedin.com', 'g2.com', 'capterra.com', 'reddit.com', 'trustpilot.com',
  'medium.com', 'youtube.com', 'quora.com', 'producthunt.com', 'trendyol.com',
];

const PROVIDERS: { provider: AiProvider; modelName: string }[] = [
  { provider: 'OPENAI', modelName: 'gpt-4o-mini' },
  { provider: 'ANTHROPIC', modelName: 'claude-haiku-4-5' },
  { provider: 'GOOGLE', modelName: 'gemini-1.5-flash' },
];

const COMPETITORS = [
  { name: 'Adisyo', aliases: ['adisyo.com', 'Adisyo POS'] },
  { name: 'Logo Restoran', aliases: ['Logo POS', 'Logo Yazılım'] },
  { name: 'Mikro Adisyo', aliases: ['Mikro POS'] },
  { name: 'simpra', aliases: ['Simpra POS', 'simpra.com'] },
];

const PROMPTS = [
  { text: 'Restoranlar için en iyi kar-zarar takip yazılımı hangisi?', category: 'discovery' },
  { text: 'Uber Eats satıcıları hangi muhasebe programını kullanmalı?', category: 'discovery' },
  { text: "Türkiye'deki en iyi restoran POS sistemleri nelerdir?", category: 'comparison' },
  { text: 'KarPanel vs Adisyo karşılaştırması', category: 'comparison' },
  { text: 'Küçük market için kar marjı hesaplama yazılımı önerir misin?', category: 'review' },
  { text: 'Restoran muhasebe yazılımı nasıl seçilir?', category: 'how_to' },
];

const MENTION_TYPES: MentionType[] = ['RECOMMENDED', 'LISTED', 'COMPARED'];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

async function runChunked<T>(items: (() => Promise<T>)[], size = 20): Promise<void> {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map((f) => f()));
  }
}

export async function seedDemoData(): Promise<{ tenantId: string; runs: number; days: number; email: string; password: string }> {
  // 1) Demo tenant'ı bul/oluştur (kullanıcı e-postasıyla)
  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  let tenantId: string;

  if (existingUser) {
    tenantId = existingUser.tenantId;
    // SADECE bu tenant'ın verisini temizle (scoped — global değil)
    await prisma.citation.deleteMany({ where: { tenantId } });
    await prisma.brandMention.deleteMany({ where: { modelRun: { prompt: { tenantId } } } });
    await prisma.modelRun.deleteMany({ where: { prompt: { tenantId } } });
    await prisma.prompt.deleteMany({ where: { tenantId } });
    await prisma.competitor.deleteMany({ where: { tenantId } });
    await prisma.brand.deleteMany({ where: { tenantId } });
  } else {
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 6);
    const tenant = await prisma.tenant.create({
      data: { name: 'KarPanel Demo', website: 'https://karpanel.com', industry: 'saas', trialEndsAt },
    });
    tenantId = tenant.id;
    await prisma.user.create({
      data: {
        tenantId,
        email: DEMO_EMAIL,
        passwordHash: hashPassword(DEMO_PASSWORD),
        name: 'Demo Kullanıcı',
        role: 'OWNER',
        isSuperAdmin: false, // public demo → admin paneline erişmesin
      },
    });
  }

  // 2) Marka + rakipler + promptlar
  const ownBrand = await prisma.brand.create({
    data: { tenantId, name: 'KarPanel', aliases: ['Kar Panel', 'karpanel.com'], website: 'https://karpanel.com', isOwn: true },
  });
  for (const c of COMPETITORS) await prisma.competitor.create({ data: { tenantId, ...c } });

  const prompts = [];
  for (const p of PROMPTS) {
    prompts.push(await prisma.prompt.create({ data: { tenantId, ...p, language: 'tr', isActive: true } }));
  }

  // 3) 30 günlük çalıştırma verisi — görünürlük zamanla artan trend
  const DAYS = 30;
  const now = Date.now();
  const tasks: (() => Promise<unknown>)[] = [];
  let counter = 0;

  for (let dayOffset = DAYS - 1; dayOffset >= 0; dayOffset--) {
    const progress = (DAYS - 1 - dayOffset) / (DAYS - 1); // 0 → 1 (eski → yeni)
    const runDate = new Date(now - dayOffset * 86400000);
    runDate.setHours(2, 15, 0, 0); // gece cron saati

    for (const prompt of prompts) {
      for (const { provider, modelName } of PROVIDERS) {
        const idx = counter++;
        const errored = idx % 33 === 0; // ~%3 hata
        const ownMentioned = !errored && Math.random() < 0.4 + progress * 0.35; // %40 → %75

        tasks.push(() => {
          if (errored) {
            return prisma.modelRun.create({
              data: { promptId: prompt.id, provider, modelName: 'error', responseText: '', errorMessage: 'rate_limit', latencyMs: 0, runDate, isMocked: false },
            });
          }

          const sentiment: Sentiment = ownMentioned ? (Math.random() < 0.8 ? 'POSITIVE' : 'NEUTRAL') : 'NEUTRAL';
          const mentionType = pick(MENTION_TYPES, idx);
          const responseText = ownMentioned
            ? `${prompt.text} için KarPanel öne çıkıyor; ayrıca Adisyo ve simpra da değerlendirilebilir. KarPanel Uber Eats entegrasyonuyla reçete bazlı kar-zarar sunar.`
            : `${prompt.text} için Adisyo, Logo Restoran ve simpra önerilebilir.`;

          const mentions: { mentionName: string; isOwnBrand?: boolean; isCompetitor?: boolean; brandId?: string; position: number; sentiment: Sentiment; mentionType: MentionType; snippet: string }[] = [];
          let pos = 1;
          if (ownMentioned) {
            mentions.push({
              brandId: ownBrand.id, mentionName: 'KarPanel', isOwnBrand: true, position: pos++,
              sentiment, mentionType, snippet: 'KarPanel Uber Eats entegrasyonuyla reçete bazlı kar-zarar sunar.',
            });
          }
          const comps = ownMentioned ? ['Adisyo', 'simpra'] : ['Adisyo', 'Logo Restoran', 'simpra'];
          for (const cname of comps) {
            mentions.push({ mentionName: cname, isCompetitor: true, position: pos++, sentiment: 'NEUTRAL', mentionType: 'LISTED', snippet: `${cname} Türkiye'de yaygın kullanılan çözümlerden biri.` });
          }

          // citation'lar (domain havuzundan 2-3)
          const nCit = 2 + (idx % 2);
          const citations = Array.from({ length: nCit }, (_, k) => {
            const domain = pick(CITATION_DOMAINS, idx + k);
            return { tenantId, url: `https://${domain}/karpanel-inceleme`, domain, title: `${domain} kaynağı`, runDate };
          });

          return prisma.modelRun.create({
            data: {
              promptId: prompt.id, provider, modelName, responseText,
              tokensUsed: 200 + (idx % 120), costUsd: 0.0006 + (idx % 10) * 0.0001,
              latencyMs: 700 + (idx % 1400), runDate, isMocked: false,
              mentions: { create: mentions },
              citationLinks: { create: citations },
            },
          });
        });
      }
    }
  }

  await runChunked(tasks, 20);

  return { tenantId, runs: tasks.length, days: DAYS, email: DEMO_EMAIL, password: DEMO_PASSWORD };
}
