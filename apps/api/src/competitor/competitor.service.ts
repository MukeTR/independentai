import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CompetitorService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.competitor.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(tenantId: string, data: { name: string; aliases: string[]; website?: string }) {
    return this.prisma.competitor.create({ data: { tenantId, ...data } });
  }

  async remove(tenantId: string, id: string) {
    const c = await this.prisma.competitor.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException();
    await this.prisma.competitor.delete({ where: { id } });
    return { ok: true };
  }
}
