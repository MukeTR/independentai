import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CompetitorService } from './competitor.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';

const competitorSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  website: z.string().url().optional(),
});

@Controller('competitors')
export class CompetitorController {
  constructor(private readonly competitor: CompetitorService) {}

  @Get()
  list(@CurrentUser() u: AuthedUser) {
    return this.competitor.list(u.tenantId);
  }

  @Post()
  create(@CurrentUser() u: AuthedUser, @Body() body: unknown) {
    return this.competitor.create(u.tenantId, competitorSchema.parse(body));
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthedUser, @Param('id') id: string) {
    return this.competitor.remove(u.tenantId, id);
  }
}
