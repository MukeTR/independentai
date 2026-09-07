/**
 * Güvenlik açısından önemli eylemlerin kaydı. Best-effort: audit yazımı asla ana işlemi
 * bozmaz (ama hata loglanır).
 */
import { prisma } from './prisma';
import { log } from './logger';
import { clientIp } from './rate-limit';

export type AuditInput = {
  action: string;
  tenantId?: string | null;
  agencyId?: string | null;
  actorUserId?: string | null;
  targetType?: string;
  targetId?: string;
  meta?: Record<string, unknown>;
  req?: Request;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        tenantId: input.tenantId ?? null,
        agencyId: input.agencyId ?? null,
        actorUserId: input.actorUserId ?? null,
        targetType: input.targetType,
        targetId: input.targetId,
        meta: input.meta ? (JSON.parse(JSON.stringify(input.meta)) as object) : undefined,
        ip: input.req ? clientIp(input.req) : null,
      },
    });
  } catch (err) {
    log.error('audit.write_failed', { action: input.action, err });
  }
}
