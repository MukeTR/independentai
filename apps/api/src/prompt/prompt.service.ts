import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PromptService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.prompt.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { runs: true } },
      },
    });
  }

  async get(tenantId: string, id: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id, tenantId },
      include: {
        runs: {
          orderBy: { runDate: 'desc' },
          take: 30,
          include: { mentions: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!prompt) throw new NotFoundException();
    return prompt;
  }

  create(tenantId: string, data: { text: string; category?: string; language?: string }) {
    return this.prisma.prompt.create({
      data: { tenantId, ...data, language: data.language ?? 'tr' },
    });
  }

  async update(
    tenantId: string,
    id: string,
    data: { text?: string; category?: string; isActive?: boolean },
  ) {
    const prompt = await this.prisma.prompt.findFirst({ where: { id, tenantId } });
    if (!prompt) throw new NotFoundException();
    return this.prisma.prompt.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const prompt = await this.prisma.prompt.findFirst({ where: { id, tenantId } });
    if (!prompt) throw new NotFoundException();
    await this.prisma.prompt.delete({ where: { id } });
    return { ok: true };
  }
}
