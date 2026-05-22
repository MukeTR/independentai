import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { PromptService } from './prompt.service';
import { RunService } from '../run/run.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';

const createSchema = z.object({
  text: z.string().min(5).max(500),
  category: z.string().optional(),
  language: z.string().optional(),
});

const updateSchema = z.object({
  text: z.string().min(5).max(500).optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

@Controller('prompts')
export class PromptController {
  constructor(
    private readonly prompt: PromptService,
    private readonly run: RunService,
  ) {}

  @Get()
  list(@CurrentUser() u: AuthedUser) {
    return this.prompt.list(u.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthedUser, @Param('id') id: string) {
    return this.prompt.get(u.tenantId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthedUser, @Body() body: unknown) {
    return this.prompt.create(u.tenantId, createSchema.parse(body));
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthedUser, @Param('id') id: string, @Body() body: unknown) {
    return this.prompt.update(u.tenantId, id, updateSchema.parse(body));
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthedUser, @Param('id') id: string) {
    return this.prompt.remove(u.tenantId, id);
  }

  @Post(':id/run')
  async runNow(@CurrentUser() u: AuthedUser, @Param('id') id: string) {
    return this.run.runPromptForTenant(u.tenantId, id);
  }
}
