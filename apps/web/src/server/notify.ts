/**
 * Bildirim & rapor motoru (Faz 8) — haftalık digest + görünürlük düşüş uyarıları.
 * Slack incoming webhook + Resend e-posta (RESEND_API_KEY varsa). Key yoksa atlar.
 *
 * Not: Bildirimler AlertConfig satırı olmayan tenant'lar için de çalışır —
 * satır yoksa DEFAULT_ALERT kullanılır. (Eskiden tablo boş olduğu için hiçbir
 * tenant'a rapor gitmiyordu.)
 */
import { prisma } from './prisma';

// ───────────────── Varsayılan tercihler ─────────────────

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

/** AlertConfig satırı varsa onu, yoksa varsayılanları döndürür. */
export async function getAlertConfig(tenantId: string): Promise<EffectiveAlertConfig> {
  const row = await prisma.alertConfig.findUnique({ where: { tenantId } });
  if (!row) return { ...DEFAULT_ALERT, lastNotifiedAt: null, lastDropAlertAt: null };
  return {
    emailEnabled: row.emailEnabled,
    weeklyReportEnabled: row.weeklyReportEnabled,
    slackWebhookUrl: row.slackWebhookUrl,
    visibilityDropThreshold: row.visibilityDropThreshold,
    lastNotifiedAt: row.lastNotifiedAt,
    lastDropAlertAt: row.lastDropAlertAt,
  };
}

/** Kayıt sırasında çağrılır — kullanıcı hiç ayara girmese de bildirim alsın. */
export async function ensureAlertConfig(tenantId: string): Promise<void> {
  await prisma.alertConfig.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  });
}

// ───────────────── Kanallar ─────────────────

export async function sendSlack(webhookUrl: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Independent AI <bildirim@independentai.space>',
        to,
        subject,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ───────────────── Haftalık delta ─────────────────

export type WeeklyDelta = {
  current: number;   // son 7 gün görünürlük %
  previous: number;  // önceki 7 gün
  delta: number;     // current - previous
  runs: number;
  topCompetitor: string | null;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function visibilityForWindow(tenantId: string, fromDays: number, toDays: number): Promise<{ vis: number; runs: number }> {
  const runs = await prisma.modelRun.findMany({
    where: { prompt: { tenantId }, runDate: { gte: daysAgo(fromDays), lt: daysAgo(toDays) }, errorMessage: null },
    include: { mentions: true },
  });
  if (runs.length === 0) return { vis: 0, runs: 0 };
  const withOwn = runs.filter((r) => r.mentions.some((m) => m.isOwnBrand)).length;
  return { vis: Math.round((withOwn / runs.length) * 100), runs: runs.length };
}

export async function getWeeklyDelta(tenantId: string): Promise<WeeklyDelta> {
  const [cur, prev] = await Promise.all([
    visibilityForWindow(tenantId, 7, 0),
    visibilityForWindow(tenantId, 14, 7),
  ]);

  // En çok geçen rakip (son 7 gün)
  const recent = await prisma.brandMention.findMany({
    where: { isCompetitor: true, modelRun: { prompt: { tenantId }, runDate: { gte: daysAgo(7) } } },
    select: { mentionName: true },
  });
  const counts = new Map<string, number>();
  recent.forEach((m) => counts.set(m.mentionName, (counts.get(m.mentionName) ?? 0) + 1));
  const topCompetitor = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Önceki pencerede yeterli veri yoksa (baseline yok) delta'yı 0 say — yanlış "büyük düşüş/artış"
  // ve hatalı düşüş uyarısı üretmesin.
  const hasBaseline = prev.runs >= 3;
  const delta = hasBaseline ? cur.vis - prev.vis : 0;

  return { current: cur.vis, previous: prev.vis, delta, runs: cur.runs, topCompetitor };
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
    `Detaylar: https://independentai.space/dashboard`,
  ]
    .filter(Boolean)
    .join('\n');
}

function digestHtml(tenantName: string, d: WeeklyDelta): string {
  const color = d.delta > 0 ? '#1F7A4D' : d.delta < 0 ? '#E11D48' : '#6B6660';
  const sign = d.delta > 0 ? '+' : '';
  return `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-size:20px">${tenantName} — Haftalık AI Görünürlük Raporu</h2>
    <div style="font-size:40px;font-weight:700;color:${color}">%${d.current}</div>
    <p style="color:#6B6660">Geçen hafta %${d.previous} · <span style="color:${color}">${sign}${d.delta} puan</span></p>
    <ul style="color:#444;font-size:14px;line-height:1.7">
      <li>Bu hafta ${d.runs} model çalıştırması</li>
      ${d.topCompetitor ? `<li>En çok öne çıkan rakip: <b>${d.topCompetitor}</b></li>` : ''}
    </ul>
    <a href="https://independentai.space/dashboard" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Panele git</a>
  </div>`;
}

// ───────────────── Toplu gönderim (cron) ─────────────────

export async function runWeeklyReports(): Promise<{ sent: number; skipped: number }> {
  // AlertConfig satırı olmayan tenant'lar da kapsanır (varsayılan: haftalık rapor açık).
  const tenants = await prisma.tenant.findMany({
    include: { users: { where: { role: 'OWNER' }, take: 1 } },
  });
  let sent = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const cfg = await getAlertConfig(tenant.id);
    if (!cfg.weeklyReportEnabled) {
      skipped++;
      continue;
    }

    const delta = await getWeeklyDelta(tenant.id);
    if (delta.runs === 0) {
      skipped++;
      continue;
    }

    let delivered = false;
    if (cfg.slackWebhookUrl) {
      delivered = (await sendSlack(cfg.slackWebhookUrl, digestText(tenant.name, delta))) || delivered;
    }
    const ownerEmail = tenant.users[0]?.email;
    if (cfg.emailEnabled && ownerEmail) {
      delivered =
        (await sendEmail(ownerEmail, `${tenant.name} — Haftalık AI Görünürlük Raporu`, digestHtml(tenant.name, delta))) ||
        delivered;
    }

    if (delivered) {
      sent++;
      await prisma.alertConfig.upsert({
        where: { tenantId: tenant.id },
        create: { tenantId: tenant.id, lastNotifiedAt: new Date() },
        update: { lastNotifiedAt: new Date() },
      });
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}

// ───────────────── Günlük düşüş uyarısı ─────────────────

export type DailyDrop = {
  current: number;   // son 24 saat görünürlük %
  baseline: number;  // önceki 7 gün ortalaması
  drop: number;      // baseline - current (pozitifse düşüş)
  runs: number;      // son 24 saatteki geçerli run sayısı
};

/**
 * Son 24 saati, önceki 7 günlük tabana göre kıyaslar.
 * Taban için en az 3 geçerli run şartı var — tek günlük gürültüde alarm çalmasın.
 */
export async function getDailyDrop(tenantId: string): Promise<DailyDrop> {
  const [today, baseline] = await Promise.all([
    visibilityForWindow(tenantId, 1, 0),
    visibilityForWindow(tenantId, 8, 1),
  ]);
  const comparable = baseline.runs >= 3 && today.runs > 0;
  return {
    current: today.vis,
    baseline: baseline.vis,
    drop: comparable ? baseline.vis - today.vis : 0,
    runs: today.runs,
  };
}

function dropText(tenantName: string, d: DailyDrop, threshold: number): string {
  return [
    `⚠️ *${tenantName}* — AI görünürlüğünüz düştü`,
    ``,
    `• Son 24 saat: *%${d.current}* (önceki 7 gün ortalaması %${d.baseline})`,
    `• Düşüş: *${d.drop} puan* — uyarı eşiğiniz ${threshold} puan`,
    `• Son 24 saatte ${d.runs} model çalıştırması`,
    ``,
    `Detaylar: https://independentai.space/dashboard`,
  ].join('\n');
}

function dropHtml(tenantName: string, d: DailyDrop, threshold: number): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="font-size:20px">${tenantName} — Görünürlük düşüşü uyarısı</h2>
    <div style="font-size:40px;font-weight:700;color:#E11D48">%${d.current}</div>
    <p style="color:#6B6660">Önceki 7 gün ortalaması %${d.baseline} · <span style="color:#E11D48">-${d.drop} puan</span></p>
    <ul style="color:#444;font-size:14px;line-height:1.7">
      <li>Uyarı eşiğiniz: ${threshold} puan</li>
      <li>Son 24 saatte ${d.runs} model çalıştırması</li>
    </ul>
    <a href="https://independentai.space/dashboard" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">Panele git</a>
  </div>`;
}

/**
 * Günlük cron'un sonunda çalışır: eşiği aşan düşüşleri Slack + e-posta ile bildirir.
 * Aynı tenant'a günde en fazla bir düşüş uyarısı gider (lastDropAlertAt).
 */
export async function runDailyDropAlerts(): Promise<{ alerted: number; checked: number }> {
  const tenants = await prisma.tenant.findMany({
    include: { users: { where: { role: 'OWNER' }, take: 1 } },
  });
  let alerted = 0;
  let checked = 0;

  for (const tenant of tenants) {
    checked++;
    const cfg = await getAlertConfig(tenant.id);

    // Son 20 saat içinde zaten uyarı gittiyse tekrar gönderme.
    if (cfg.lastDropAlertAt && Date.now() - cfg.lastDropAlertAt.getTime() < 20 * 60 * 60 * 1000) continue;

    const d = await getDailyDrop(tenant.id);
    if (d.drop < cfg.visibilityDropThreshold) continue;

    let delivered = false;
    if (cfg.slackWebhookUrl) {
      delivered = (await sendSlack(cfg.slackWebhookUrl, dropText(tenant.name, d, cfg.visibilityDropThreshold))) || delivered;
    }
    const ownerEmail = tenant.users[0]?.email;
    if (cfg.emailEnabled && ownerEmail) {
      delivered =
        (await sendEmail(
          ownerEmail,
          `${tenant.name} — AI görünürlüğünüz ${d.drop} puan düştü`,
          dropHtml(tenant.name, d, cfg.visibilityDropThreshold),
        )) || delivered;
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

  return { alerted, checked };
}
