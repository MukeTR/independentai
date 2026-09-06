import { NextResponse } from 'next/server';
import { route } from '@/server/route';
import { readJson, ClientError } from '@/server/errors';
import { requireActor } from '@/server/authz';
import { getAlertConfig, publicAlertView, updateAlertConfig, sendSlack } from '@/server/notify';
import { enforceRateLimit, LIMITS } from '@/server/rate-limit';
import { audit } from '@/server/audit';

export const GET = route('alerts.get', async () => {
  const actor = await requireActor();
  return NextResponse.json(publicAlertView(await getAlertConfig(actor.tenantId)));
});

/**
 * PUT: kısmi güncelleme. slackWebhookUrl: "" veya null → kaldır; string → şifrelenip kaydedilir;
 * gönderilmezse dokunulmaz (maskeli görünüm geri yazılamaz). testSlack: kayıtlı webhook'a test.
 */
export const PUT = route('alerts.update', async (req) => {
  const actor = await requireActor({ write: true });
  const body = await readJson<Record<string, unknown>>(req);
  const patch: Parameters<typeof updateAlertConfig>[1] = {};
  if (body.emailEnabled !== undefined) patch.emailEnabled = body.emailEnabled === true;
  if (body.weeklyReportEnabled !== undefined) patch.weeklyReportEnabled = body.weeklyReportEnabled === true;
  if (body.visibilityDropThreshold !== undefined) {
    const n = Number(body.visibilityDropThreshold);
    if (!Number.isInteger(n) || n < 1 || n > 100) throw new ClientError('Eşik 1-100 arası tam sayı olmalı');
    patch.visibilityDropThreshold = n;
  }
  if (body.slackWebhookUrl !== undefined) {
    patch.slackWebhookUrl =
      body.slackWebhookUrl === null || body.slackWebhookUrl === '' ? null : String(body.slackWebhookUrl);
  }
  const cfg = await updateAlertConfig(actor.tenantId, patch);
  if (patch.slackWebhookUrl !== undefined) {
    await audit({
      action: patch.slackWebhookUrl ? 'alerts.slack_set' : 'alerts.slack_removed',
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      req,
    });
  }

  let testResult: 'sent' | 'failed' | undefined;
  if (body.testSlack === true) {
    if (!cfg.slackWebhookUrl) throw new ClientError('Önce bir Slack webhook adresi kaydedin');
    await enforceRateLimit(req, LIMITS.slackTest, `tenant:${actor.tenantId}`);
    const ok = await sendSlack(
      cfg.slackWebhookUrl,
      '✅ Independent AI — Slack bağlantınız çalışıyor! Haftalık raporlar ve düşüş uyarıları buraya gelecek.',
      { kind: 'slack_test', tenantId: actor.tenantId },
    );
    testResult = ok ? 'sent' : 'failed';
  }
  return NextResponse.json({ ...publicAlertView(cfg), ...(testResult ? { testResult } : {}) });
});
