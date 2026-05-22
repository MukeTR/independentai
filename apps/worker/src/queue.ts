import { Queue } from 'bullmq';
import { connection } from './redis';

export type PromptRunJob = { tenantId: string; promptId: string };

export const PROMPT_RUN_QUEUE = 'prompt-run';

export const promptRunQueue = new Queue<PromptRunJob>(PROMPT_RUN_QUEUE, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
