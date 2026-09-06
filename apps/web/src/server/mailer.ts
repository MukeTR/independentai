/**
 * E-posta + Slack gönderim katmanı. Her teslimat NotificationLog'a yazılır.
 *  - RESEND_API_KEY yoksa e-posta "skipped" olarak loglanır (sessiz başarısızlık yok).
 *  - Test modunda (IAI_TEST_MODE=1) hiçbir dış çağrı yapılmaz; mesajlar bellekte tutulur
 *    (testler `drainOutbox()` ile okur).
 *  - Slack: yalnızca https://hooks.slack.com, redirect takip yok, 8 sn zaman aşımı.
 */
import { prisma } from './prisma';
import { isTestEnv, siteUrl } from './env';
import { log, maskEmail } from './logger';

export type Outgoing = { channel: 'email' | 'slack'; to: string; subject?: string; body: string; kind: string };
const outbox: Outgoing[] = [];
export function drainOutbox(): Outgoing[] {
  return outbox.splice(0, outbox.length);
}

async function record(input: {
  tenantId?: string | null;
  kind: string;
  channel: 'email' | 'slack';
  status: 'sent' | 'failed' | 'skipped';
  recipient?: string | null;
  providerMessageId?: string | null;
  error?: string | null;
}) {
  try {
    await prisma.notificationLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        kind: input.kind,
        channel: input.channel,
        status: input.status,
        recipient: input.recipient ?? null,
        providerMessageId: input.providerMessageId ?? null,
        error: input.error ? input.error.slice(0, 500) : null,
      },
    });
  } catch (err) {
    log.error('notify.log_failed', { err });
  }
}

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  kind: string;
  tenantId?: string | null;
}): Promise<boolean> {
  const recipient = maskEmail(opts.to);
  if (isTestEnv()) {
    outbox.push({
      channel: 'email',
      to: opts.to,
      subject: opts.subject,
      body: opts.text ?? opts.html,
      kind: opts.kind,
    });
    await record({
      tenantId: opts.tenantId,
      kind: opts.kind,
      channel: 'email',
      status: 'sent',
      recipient,
      providerMessageId: 'test',
    });
    return true;
  }
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    await record({
      tenantId: opts.tenantId,
      kind: opts.kind,
      channel: 'email',
      status: 'skipped',
      recipient,
      error: 'RESEND_API_KEY yok',
    });
    log.warn('email.skipped', { kind: opts.kind, reason: 'no_api_key' });
    return false;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Independent AI <bildirim@independentai.space>',
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        ...(opts.text ? { text: opts.text } : {}),
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) {
      await record({
        tenantId: opts.tenantId,
        kind: opts.kind,
        channel: 'email',
        status: 'failed',
        recipient,
        error: `${res.status} ${json.message ?? ''}`,
      });
      return false;
    }
    await record({
      tenantId: opts.tenantId,
      kind: opts.kind,
      channel: 'email',
      status: 'sent',
      recipient,
      providerMessageId: json.id ?? null,
    });
    return true;
  } catch (err) {
    await record({
      tenantId: opts.tenantId,
      kind: opts.kind,
      channel: 'email',
      status: 'failed',
      recipient,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return false;
  }
}

export function isSlackWebhookUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'hooks.slack.com' &&
      u.pathname.startsWith('/services/') &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
}

export async function sendSlack(
  webhookUrl: string,
  text: string,
  meta: { kind: string; tenantId?: string | null },
): Promise<boolean> {
  if (!isSlackWebhookUrl(webhookUrl)) {
    await record({
      tenantId: meta.tenantId,
      kind: meta.kind,
      channel: 'slack',
      status: 'failed',
      error: 'invalid_webhook',
    });
    return false;
  }
  if (isTestEnv()) {
    outbox.push({ channel: 'slack', to: webhookUrl, body: text, kind: meta.kind });
    await record({ tenantId: meta.tenantId, kind: meta.kind, channel: 'slack', status: 'sent', recipient: 'slack' });
    return true;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8_000);
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      redirect: 'error',
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    await record({
      tenantId: meta.tenantId,
      kind: meta.kind,
      channel: 'slack',
      status: res.ok ? 'sent' : 'failed',
      recipient: 'slack',
      error: res.ok ? null : `${res.status}`,
    });
    return res.ok;
  } catch (err) {
    await record({
      tenantId: meta.tenantId,
      kind: meta.kind,
      channel: 'slack',
      status: 'failed',
      recipient: 'slack',
      error: err instanceof Error ? err.message : 'unknown',
    });
    return false;
  }
}

// ───────────── Şablonlar ─────────────

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#14110D;line-height:1.6">
    <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#9A968B;margin-bottom:8px">Independent AI</div>
    <h2 style="font-size:20px;margin:0 0 12px">${title}</h2>
    <div style="font-size:14px;color:#444">${bodyHtml}</div>
    ${cta ? `<p style="margin-top:20px"><a href="${cta.href}" style="display:inline-block;background:#4F46E5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px">${cta.label}</a></p>` : ''}
    <p style="font-size:12px;color:#9A968B;margin-top:24px">Bu e-postayı siz talep etmediyseniz yok sayabilirsiniz.</p>
  </div>`;
}

export const templates = {
  passwordReset(link: string) {
    return {
      subject: 'Şifre sıfırlama — Independent AI',
      html: layout('Şifrenizi sıfırlayın', `<p>Aşağıdaki bağlantı 1 saat boyunca geçerlidir.</p>`, {
        label: 'Şifremi sıfırla',
        href: link,
      }),
      text: `Şifrenizi sıfırlamak için (1 saat geçerli): ${link}`,
    };
  },
  emailVerify(link: string) {
    return {
      subject: 'E-posta adresinizi doğrulayın — Independent AI',
      html: layout('E-posta doğrulama', `<p>Hesabınızı doğrulamak için bağlantıya tıklayın (24 saat geçerli).</p>`, {
        label: 'E-postamı doğrula',
        href: link,
      }),
      text: `E-posta doğrulama (24 saat geçerli): ${link}`,
    };
  },
  invite(tenantName: string, role: string, link: string) {
    return {
      subject: `${tenantName} sizi Independent AI'a davet etti`,
      html: layout(
        `${tenantName} ekibine davet`,
        `<p><b>${tenantName}</b> hesabına <b>${role}</b> rolüyle davet edildiniz. Davet 7 gün geçerlidir.</p>`,
        { label: 'Daveti kabul et', href: link },
      ),
      text: `${tenantName} ekibine ${role} rolüyle davet edildiniz (7 gün geçerli): ${link}`,
    };
  },
};

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}
