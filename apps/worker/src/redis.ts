import IORedis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6380';

export const connection = new IORedis(url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

connection.on('error', (e) => {
  console.error('[redis] error', e.message);
});
