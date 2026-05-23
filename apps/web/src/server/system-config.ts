import { prisma } from './prisma';
import { encrypt, decrypt, maskKey } from './crypto';

export type ConfigKey =
  | 'OPENAI_API_KEY'
  | 'ANTHROPIC_API_KEY'
  | 'GOOGLE_API_KEY';

export const CONFIG_KEYS: { key: ConfigKey; label: string; provider: string; help: string; pattern?: string }[] = [
  {
    key: 'OPENAI_API_KEY',
    label: 'OpenAI (ChatGPT)',
    provider: 'OpenAI',
    help: 'platform.openai.com → API keys',
    pattern: 'sk-...',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Anthropic (Claude)',
    provider: 'Anthropic',
    help: 'console.anthropic.com → API keys',
    pattern: 'sk-ant-...',
  },
  {
    key: 'GOOGLE_API_KEY',
    label: 'Google (Gemini)',
    provider: 'Google',
    help: 'aistudio.google.com → API key',
    pattern: 'AIza...',
  },
];

/**
 * Belirli bir config key'inin değerini al — önce DB'den, yoksa env'den.
 * DB değeri varsa env'den önce geçer (DB override).
 */
export async function getConfigValue(key: ConfigKey): Promise<string | undefined> {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key } });
    if (row?.value) {
      return row.encrypted ? decrypt(row.value) : row.value;
    }
  } catch {
    // DB hatasında env'e düşeriz
  }
  return process.env[key];
}

/**
 * Tüm config'leri DB'den alıp process.env'e enjekte eder.
 * AI adapter'ları process.env okuduğu için bu hydrate run-prompt başlangıcında çağrılır.
 */
export async function hydrateEnvFromConfig(): Promise<void> {
  for (const cfg of CONFIG_KEYS) {
    const v = await getConfigValue(cfg.key);
    if (v) process.env[cfg.key] = v;
  }
}

/**
 * Admin UI için: her key'in durumunu döndür (set/not set + masked preview).
 * Asla ham değeri göstermeyiz.
 */
export async function listConfigStatus() {
  const rows = await prisma.systemConfig.findMany();
  const dbMap = new Map(rows.map((r) => [r.key, r]));
  return CONFIG_KEYS.map((cfg) => {
    const row = dbMap.get(cfg.key);
    const envValue = process.env[cfg.key];
    let preview: string | null = null;
    let source: 'db' | 'env' | 'none' = 'none';
    if (row?.value) {
      source = 'db';
      try {
        preview = maskKey(decrypt(row.value));
      } catch {
        preview = '●●●● (decrypt error)';
      }
    } else if (envValue) {
      source = 'env';
      preview = maskKey(envValue);
    }
    return {
      key: cfg.key,
      label: cfg.label,
      provider: cfg.provider,
      help: cfg.help,
      pattern: cfg.pattern,
      source,
      preview,
      updatedAt: row?.updatedAt ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  });
}

export async function setConfigValue(key: ConfigKey, value: string, userId: string): Promise<void> {
  const encrypted = encrypt(value);
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value: encrypted, encrypted: true, updatedBy: userId },
    update: { value: encrypted, encrypted: true, updatedBy: userId },
  });
  // Cache invalidation: process.env'i de güncelle (aynı runtime için)
  process.env[key] = value;
}

export async function clearConfigValue(key: ConfigKey): Promise<void> {
  await prisma.systemConfig.deleteMany({ where: { key } });
  delete process.env[key];
}
