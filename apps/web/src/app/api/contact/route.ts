import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson } from '@/server/errors';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { prisma } from '@/server/prisma';
import { log } from '@/server/logger';
import { audit } from '@/server/audit';
import { sendEmail } from '@/server/mailer';
import { blockedJson, findBlockedSite } from '@/server/blocklist';
import { upsertLeadFromContact } from '@/server/leads';
import { reportUrlFor } from '@/server/public-report';
import { contactEmailTemplate, isHoneypotFilled, leadUtmOf, validateContact } from '@/server/contact';

/**
 * POST /api/contact — iletişim formu.
 *  limit (IP 5/sa + küresel 200/sa) → gövde ≤16 KB → honeypot doluysa 200 sessiz → doğrulama (KVKK zorunlu)
 *  → web sitesi yasaklıysa 200 {blocked, redirectUrl} ve Lead YAZILMAZ → Lead upsert (CONTACT, consentAt, iysConsentAt,
 *  utm, lastReportToken) → SALES_EMAIL'e e-posta (yoksa NotificationLog {kind:'contact', status:'skipped'})
 *  → audit('contact.submitted') → 201 {ok:true}. Kullanıcıya otomatik e-posta yok; lead verisi LLM'e gitmez.
 */
export const POST = route('contact.submit', async (req) => {
  const headers = await enforceRateLimit(req, LIMITS.contact);
  const body = await readJson<Record<string, unknown>>(req, 16 * 1024);

  if (isHoneypotFilled(body)) {
    log.warn('contact.honeypot', {});
    return NextResponse.json({ ok: true }, { status: 200, headers });
  }

  const input = validateContact(body);

  if (input.hostname) {
    const hit = await findBlockedSite(input.hostname);
    if (hit) return blockedJson(hit, headers);
  }

  const now = new Date();
  const lead = await upsertLeadFromContact({
    hostname: input.hostname,
    contactName: input.name,
    contactEmail: input.email,
    contactPhone: input.phone,
    company: input.company,
    message: input.message,
    topic: input.topic,
    consentAt: now,
    iysConsentAt: input.iys ? now : null,
    utm: leadUtmOf(input),
    lastReportToken: input.reportToken,
    sector: input.sector,
  });

  const reportUrl = input.reportToken ? reportUrlFor(input.reportToken) : null;
  const tpl = contactEmailTemplate(input, { leadId: lead.id, reportUrl, adminLeadPath: `/admin/leads/${lead.id}` });
  const to = process.env.SALES_EMAIL?.trim();
  if (to) {
    await sendEmail({ to, subject: tpl.subject, html: tpl.html, text: tpl.text, kind: 'contact' });
  } else {
    try {
      await prisma.notificationLog.create({
        data: { kind: 'contact', channel: 'email', status: 'skipped', error: 'SALES_EMAIL yok' },
      });
    } catch (err) {
      log.error('contact.notification_log_failed', { err });
    }
    log.warn('contact.email_skipped', { reason: 'no_sales_email' });
  }

  await audit({
    action: 'contact.submitted',
    targetType: 'Lead',
    targetId: lead.id,
    meta: { topic: input.topic, src: input.src, hasWebsite: !!input.hostname, created: lead.created },
    req,
  });

  return NextResponse.json({ ok: true }, { status: 201, headers });
});
