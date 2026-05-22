import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId, isOwn: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  getOwn(tenantId: string) {
    return this.prisma.brand.findFirst({ where: { tenantId, isOwn: true } });
  }

  async create(tenantId: string, data: { name: string; aliases: string[]; website?: string }) {
    return this.prisma.brand.create({
      data: { tenantId, isOwn: true, ...data },
    });
  }

  async update(tenantId: string, id: string, data: { name?: string; aliases?: string[]; website?: string }) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException();
    return this.prisma.brand.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const brand = await this.prisma.brand.findFirst({ where: { id, tenantId } });
    if (!brand) throw new NotFoundException();
    await this.prisma.brand.delete({ where: { id } });
    return { ok: true };
  }
}
