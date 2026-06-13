/**
 * Bildirim & rapor motoru (Faz 8) — haftalık digest + görünürlük düşüş uyarıları.
 * Slack incoming webhook + Resend e-posta (RESEND_API_KEY varsa). Key yoksa atlar.
 */
import { prisma } from './prisma';

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
  const configs = await prisma.alertConfig.findMany({ where: { weeklyReportEnabled: true } });
  let sent = 0;
  let skipped = 0;

  for (const cfg of configs) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: cfg.tenantId },
      include: { users: { where: { role: 'OWNER' }, take: 1 } },
    });
    if (!tenant) {
      skipped++;
      continue;
    }
    const delta = await getWeeklyDelta(cfg.tenantId);
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
      delivered = (await sendEmail(ownerEmail, `${tenant.name} — Haftalık AI Görünürlük Raporu`, digestHtml(tenant.name, delta))) || delivered;
    }

    // Eşiği aşan düşüş varsa ekstra uyarı
    if (delta.delta <= -cfg.visibilityDropThreshold && cfg.slackWebhookUrl) {
      await sendSlack(
        cfg.slackWebhookUrl,
        `⚠️ *${tenant.name}* — Görünürlük ${Math.abs(delta.delta)} puan düştü (%${delta.previous} → %${delta.current}). İncelemeniz önerilir.`,
      );
    }

    if (delivered) {
      sent++;
      await prisma.alertConfig.update({ where: { id: cfg.id }, data: { lastNotifiedAt: new Date() } });
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}
