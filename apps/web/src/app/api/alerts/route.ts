import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/server/prisma';
import { requireSession, handleRouteError } from '@/server/session';
import { sendSlack } from '@/server/notify';

const slackUrl = z
  .string()
  .url()
  .max(300)
  .refine((u) => {
    try {
      return new URL(u).hostname.toLowerCase() === 'hooks.slack.com';
    } catch {
      return false;
    }
  }, 'Yalnızca hooks.slack.com webhook adresleri kabul edilir');

const putSchema = z.object({
  emailEnabled: z.boolean().optional(),
  weeklyReportEnabled: z.boolean().optional(),
  slackWebhookUrl: slackUrl.nullable().optional(),
  visibilityDropThreshold: z.number().int().min(1).max(100).optional(),
  testSlack: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const cfg = await prisma.alertConfig.findUnique({ where: { tenantId: session.tenantId } });
    return NextResponse.json(
      cfg ?? {
        emailEnabled: true,
        weeklyReportEnabled: true,
        slackWebhookUrl: null,
        visibilityDropThreshold: 15,
      },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireSession();
    const parsed = putSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ message: 'Geçersiz giriş' }, { status: 400 });
    const { testSlack, ...data } = parsed.data;

    const cfg = await prisma.alertConfig.upsert({
      where: { tenantId: session.tenantId },
      create: { tenantId: session.tenantId, ...data },
      update: data,
    });

    // İsteğe bağlı test mesajı
    if (testSlack && cfg.slackWebhookUrl) {
      const ok = await sendSlack(cfg.slackWebhookUrl, '✅ Independent AI — Slack bağlantınız çalışıyor! Haftalık raporlar buraya gelecek.');
      return NextResponse.json({ ...cfg, testResult: ok ? 'sent' : 'failed' });
    }

    return NextResponse.json(cfg);
  } catch (err) {
    return handleRouteError(err);
  }
}
