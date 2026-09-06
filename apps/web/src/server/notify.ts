/**
 * Bildirim & rapor motoru — haftalık özet + görünürlük düşüş uyarıları.
 *  - Metrikler packages/shared/metrics (UI ile aynı formül; hatalı run'lar paydada yok).
 *  - Slack webhook DB'de AES-GCM ile şifreli tutulur; okurken çözülür, dışarı maskelenmiş verilir.
 *  - Toplu gönderimler zaman bütçesine uyar (deadlineAt) ve idempotenttir:
 *      haftalık: lastNotifiedAt son 6 gün içindeyse atlanır; günlük düşüş: lastDropAlertAt 20 saat.
 *  - Her teslimat NotificationLog'a yazılır (mailer.ts).
 */
import { visibilityOf, type MetricRun } from '@independentai/shared';
import { prisma } from './prisma';
import { decrypt, encrypt, maskWebhook } from './crypto';
import { sendEmail, sendSlack, isSlackWebhookUrl } from './mailer';
import { siteUrl } from './env';
import { ClientError } from './errors';

export { sendEmail, sendSlack } from './mailer';

export const DEFAULT_ALERT = {
  emailEnabled: true,
  weeklyReportEnabled: true,
  slackWebhookUrl: null as string | null,
  visibilityDropThreshold: 15,
};

export type EffectiveAlertConfig = typeof DEFAULT_ALERT & {
  lastNotifiedAt: Date | null;
  lastDropAlertAt: Date | null;
};

function decryptWebhook(row: { slackWebhookUrl: string | null; slackWebhookEncrypted: boolean }): string | null {
  if (!row.slackWebhookUrl) return null;
  if (!row.slackWebhookEncrypted) return row.slackWebhookUrl; // eski düz metin satır
  try {
    return decrypt(row.slackWebhookUrl);
  } catch {
    return null;
  }
}

/** Satır varsa çözülmüş değerlerle, yoksa varsayılanlarla döner. */
export async function getAlertConfig(tenantId: string): Promise<EffectiveAlertConfig> {
  const row = await prisma.alertConfig.findUnique({ where: { tenantId } });
  if (!row) return { ...DEFAULT_ALERT, lastNotifiedAt: null, lastDropAlertAt: null };
  return {
    emailEnabled: row.emailEnabled,
    weeklyReportEnabled: row.weeklyReportEnabled,
    slackWebhookUrl: decryptWebhook(row),
    visibilityDropThreshold: row.visibilityDropThreshold,
    lastNotifiedAt: row.lastNotifiedAt,
    lastDropAlertAt: row.lastDropAlertAt,
  };
}

/** İstemciye giden görünüm: webhook maskelenir, "var mı" bayrağı ayrıca verilir. */
export function publicAlertView(cfg: EffectiveAlertConfig) {
  return {
    emailEnabled: cfg.emailEnabled,
    weeklyReportEnabled: cfg.weeklyReportEnabled,
    visibilityDropThreshold: cfg.visibilityDropThreshold,
    slackConfigured: !!cfg.slackWebhookUrl,
    slackWebhookMasked: maskWebhook(cfg.slackWebhookUrl),
    lastNotifiedAt: cfg.lastNotifiedAt,
    lastDropAlertAt: cfg.lastDropAlertAt,
  };
}

export async function ensureAlertConfig(tenantId: string): Promise<void> {
  await prisma.alertConfig.upsert({ where: { tenantId }, create: { tenantId }, update: {} });
}

export type AlertUpdate = {
  emailEnabled?: boolean;
  weeklyReportEnabled?: boolean;
  visibilityDropThreshold?: number;
  /** undefined: değiştirme; null: kaldır; string: yeni webhook (şifrelenir) */
  slackWebhookUrl?: string | null;
};

export async function updateAlertConfig(tenantId: string, patch: AlertUpdate): Promise<EffectiveAlertConfig> {
  const data: Record<string, unknown> = {};
  if (patch.emailEnabled !== undefined) data.emailEnabled = patch.emailEnabled;
  if (patch.weeklyReportEnabled !== undefined) data.weeklyReportEnabled = patch.weeklyReportEnabled;
  if (patch.visibilityDropThreshold !== undefined) data.visibilityDropThreshold = patch.visibilityDropThreshold;
  if (patch.slackWebhookUrl === null) {
    data.slackWebhookUrl = null;
    data.slackWebhookEncrypted = false;
  } else if (typeof patch.slackWebhookUrl === 'string') {
    const url = patch.slackWebhookUrl.trim();
    if (url.length > 300 || !isSlackWebhookUrl(url))
      throw new ClientError('Yalnızca https://hooks.slack.com/services/... adresleri kabul edilir');
    data.slackWebhookUrl = encrypt(url);
    data.slackWebhookEncrypted = true;
  }
  await prisma.alertConfig.upsert({ where: { tenantId }, create: { tenantId, ...data }, update: data });
  return getAlertConfig(tenantId);
}

// ───────────── Pencere metrikleri ─────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function windowRuns(tenantId: string, fromDays: number, toDays: number): Promise<MetricRun[]> {
  return prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: daysAgo(fromDays), lt: daysAgo(toDays) }, status: 'SUCCESS' },
    select: { status: true, mentions: { select: { isOwnBrand: true, isCompetitor: true, mentionName: true } } },
  });
}

export type WeeklyDelta = {
  current: number;
  previous: number;
  delta: number;
  runs: number;
  topCompetitor: string | null;
};

export async function getWeeklyDelta(tenantId: string): Promise<WeeklyDelta> {
  const [cur, prev] = await Promise.all([windowRuns(tenantId, 7, 0), windowRuns(tenantId, 14, 7)]);
  const counts = new Map<string, number>();
  for (const r of cur)
    for (const m of r.mentions)
      if (m.isCompetitor && m.mentionName) counts.set(m.mentionName, (counts.get(m.mentionName) ?? 0) + 1);
  const topCompetitor = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const hasBaseline = prev.length >= 3;
  const current = visibilityOf(cur);
  const previous = visibilityOf(prev);
  return { current, previous, delta: hasBaseline ? current - previous : 0, runs: cur.length, topCompetitor };
}

export type DailyDrop = { current: number; baseline: number; drop: number; runs: number };

export async function getDailyDrop(tenantId: string): Promise<DailyDrop> {
  const [today, baseline] = await Promise.all([windowRuns(tenantId, 1, 0), windowRuns(tenantId, 8, 1)]);
  const comparable = baseline.length >= 3 && today.length > 0;
  const current = visibilityOf(today);
  const base = visibilityOf(baseline);
  return { current, baseline: base, drop: comparable ? base - current : 0, runs: today.length };
}

// ───────────── Şablonlar ─────────────

const DASH = `${siteUrl()}/dashboard`;

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}

function digestText(tenantName: string, d: WeeklyDelta): string {
  const arrow = d.delta > 0 ? '📈' : d.delta < 0 ? '📉' : '➡️';
  const sign = d.delta > 0 ? '+' : '';
  return [
    `*${tenantName}* — Haftalık AI Görünürlük Raporu ${arrow}`,
    ``,
    `• Görünürlük: *%${d.current}* (geçen hafta %${d.previous}, ${sign}${d.delta} puan)`,
    `• Bu hafta ${d.runs} model çalıştırması`,
    d.topCompetitor ? `• En çok öne çıkan rakip: *${d.topCompetitor}*` : ``,
    ``,
    `Detaylar: ${DASH}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function digestHtml(tenantName: string, d: WeeklyDelta): string {
  const color = d.delta > 0 ? '#1F7A4D' : d.delta < 0 ? '#B43A28' : '#6B6660';
  const sign = d.delta > 0 ? '+' : '';
  return `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-size:20px">${esc(tenantName)} — Haftalık AI Görünürlük Raporu</h2>
    <div style="font-size:40px;font-weight:700;color:${color}">%${d.current}</div>
    <p style="color:#6B6660">Geçen hafta %${d.previous} · <span style="color:${color}">${sign}${d.delta} puan</span></p>
    <ul style="color:#444;font-size:14px;line-height:1.7">
      <li>Bu hafta ${d.runs} model çalıştırması</li>
      ${d.topCompetitor ? `<li>En çok öne çıkan rakip: <b>${esc(d.topCompetitor)}</b></li>` : ''}
    </ul>
    <a href="${DASH}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Panele git</a>
  </div>`;
}

function dropText(tenantName: string, d: DailyDrop, threshold: number): string {
  return [
    `⚠️ *${tenantName}* — AI görünürlüğünüz düştü`,
    ``,
    `• Son 24 saat: *%${d.current}* (önceki 7 gün ortalaması %${d.baseline})`,
    `• Düşüş: *${d.drop} puan* — uyarı eşiğiniz ${threshold} puan`,
    `• Son 24 saatte ${d.runs} model çalıştırması`,
    ``,
    `Detaylar: ${DASH}`,
  ].join('\n');
}

function dropHtml(tenantName: string, d: DailyDrop, threshold: number): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-size:20px">${esc(tenantName)} — Görünürlük düşüşü uyarısı</h2>
    <div style="font-size:40px;font-weight:700;color:#B43A28">%${d.current}</div>
    <p style="color:#6B6660">Önceki 7 gün ortalaması %${d.baseline} · <span style="color:#B43A28">-${d.drop} puan</span></p>
    <ul style="color:#444;font-size:14px;line-height:1.7">
      <li>Uyarı eşiğiniz: ${threshold} puan</li>
      <li>Son 24 saatte ${d.runs} model çalıştırması</li>
    </ul>
    <a href="${DASH}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Panele git</a>
  </div>`;
}

// ───────────── Toplu gönderim ─────────────

type BatchResult = { sent: number; skipped: number; failed: number; checked: number; remaining: number };

/** Haftalık raporlar: OWNER e-postası + Slack. Bütçe dolunca kalan tenant sayısı `remaining`. */
export async function runWeeklyReports(opts: { deadlineAt?: number } = {}): Promise<BatchResult> {
  const deadline = opts.deadlineAt ?? Date.now() + 240_000;
  const tenants = await prisma.tenant.findMany({
    include: { users: { where: { role: 'OWNER' }, orderBy: { createdAt: 'asc' }, take: 1 } },
    orderBy: { createdAt: 'asc' },
  });
  const res: BatchResult = { sent: 0, skipped: 0, failed: 0, checked: 0, remaining: 0 };
  for (let i = 0; i < tenants.length; i++) {
    if (Date.now() > deadline) {
      res.remaining = tenants.length - i;
      break;
    }
    const tenant = tenants[i]!;
    res.checked++;
    const cfg = await getAlertConfig(tenant.id);
    if (!cfg.weeklyReportEnabled) {
      res.skipped++;
      continue;
    }
    // Idempotency: son 6 gün içinde gönderildiyse tekrar gönderme (zincirleme tetikleme güvenli).
    if (cfg.lastNotifiedAt && Date.now() - cfg.lastNotifiedAt.getTime() < 6 * 86_400_000) {
      res.skipped++;
      continue;
    }
    const delta = await getWeeklyDelta(tenant.id);
    if (delta.runs === 0) {
      res.skipped++;
      continue;
    }
    let delivered = false;
    if (cfg.slackWebhookUrl)
      delivered =
        (await sendSlack(cfg.slackWebhookUrl, digestText(tenant.name, delta), {
          kind: 'weekly_report',
          tenantId: tenant.id,
        })) || delivered;
    const ownerEmail = tenant.users[0]?.email;
    if (cfg.emailEnabled && ownerEmail && !ownerEmail.endsWith('@users.independentai.space')) {
      delivered =
        (await sendEmail({
          to: ownerEmail,
          subject: `${tenant.name} — Haftalık AI Görünürlük Raporu`,
          html: digestHtml(tenant.name, delta),
          text: digestText(tenant.name, delta),
          kind: 'weekly_report',
          tenantId: tenant.id,
        })) || delivered;
    }
    if (delivered) {
      res.sent++;
      await prisma.alertConfig.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, lastNotifiedAt: new Date() },
        update: { lastNotifiedAt: new Date() },
      });
    } else res.failed++;
  }
  return res;
}

/** Günlük düşüş uyarıları: eşiği aşan tenant'lara günde en fazla bir kez. */
export async function runDailyDropAlerts(
  opts: { deadlineAt?: number } = {},
): Promise<{ alerted: number; checked: number; remaining: number }> {
  const deadline = opts.deadlineAt ?? Date.now() + 60_000;
  const tenants = await prisma.tenant.findMany({
    include: { users: { where: { role: 'OWNER' }, orderBy: { createdAt: 'asc' }, take: 1 } },
    orderBy: { createdAt: 'asc' },
  });
  let alerted = 0;
  let checked = 0;
  let remaining = 0;
  for (let i = 0; i < tenants.length; i++) {
    if (Date.now() > deadline) {
      remaining = tenants.length - i;
      break;
    }
    const tenant = tenants[i]!;
    checked++;
    const cfg = await getAlertConfig(tenant.id);
    if (cfg.lastDropAlertAt && Date.now() - cfg.lastDropAlertAt.getTime() < 20 * 3_600_000) continue;
    const d = await getDailyDrop(tenant.id);
    if (d.drop < cfg.visibilityDropThreshold) continue;
    let delivered = false;
    if (cfg.slackWebhookUrl)
      delivered =
        (await sendSlack(cfg.slackWebhookUrl, dropText(tenant.name, d, cfg.visibilityDropThreshold), {
          kind: 'drop_alert',
          tenantId: tenant.id,
        })) || delivered;
    const ownerEmail = tenant.users[0]?.email;
    if (cfg.emailEnabled && ownerEmail && !ownerEmail.endsWith('@users.independentai.space')) {
      delivered =
        (await sendEmail({
          to: ownerEmail,
          subject: `${tenant.name} — AI görünürlüğünüz ${d.drop} puan düştü`,
          html: dropHtml(tenant.name, d, cfg.visibilityDropThreshold),
          text: dropText(tenant.name, d, cfg.visibilityDropThreshold),
          kind: 'drop_alert',
          tenantId: tenant.id,
        })) || delivered;
    }
    if (delivered) {
      alerted++;
      await prisma.alertConfig.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, lastDropAlertAt: new Date() },
        update: { lastDropAlertAt: new Date() },
      });
    }
  }
  return { alerted, checked, remaining };
}
