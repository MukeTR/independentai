import { Worker } from 'bullmq';
import cron from 'node-cron';
import { prisma } from '@independentai/db';
import { connection } from './redis';
import { PROMPT_RUN_QUEUE, promptRunQueue, type PromptRunJob } from './queue';
import { runPromptOnce } from './run-prompt';

console.log('🛰  Independent AI worker başladı');

// BullMQ worker: kuyruktan tüketir
const worker = new Worker<PromptRunJob>(
  PROMPT_RUN_QUEUE,
  async (job) => {
    const { tenantId, promptId } = job.data;
    console.log(`[run] tenant=${tenantId} prompt=${promptId}`);
    return runPromptOnce(tenantId, promptId);
  },
  { connection, concurrency: 3 },
);

worker.on('completed', (job) => console.log(`[done] ${job.id}`));
worker.on('failed', (job, err) => console.error(`[fail] ${job?.id}: ${err.message}`));

// Günlük cron: tüm aktif promptları kuyruğa düşür
const schedule = process.env.DAILY_RUN_CRON ?? '0 2 * * *';
console.log(`⏰ Günlük cron: ${schedule}`);

cron.schedule(schedule, async () => {
  console.log('[cron] aktif promptlar kuyruğa alınıyor...');
  const prompts = await prisma.prompt.findMany({ where: { isActive: true } });
  for (const p of prompts) {
    await promptRunQueue.add('daily', { tenantId: p.tenantId, promptId: p.id });
  }
  console.log(`[cron] ${prompts.length} prompt kuyruğa alındı`);
});

async function shutdown() {
  console.log('⛔ Kapatılıyor...');
  await worker.close();
  await promptRunQueue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
