import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { z } from 'zod';
import { BrandService } from './brand.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';

const brandSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  website: z.string().url().optional(),
});

@Controller('brands')
export class BrandController {
  constructor(private readonly brand: BrandService) {}

  @Get()
  list(@CurrentUser() u: AuthedUser) {
    return this.brand.list(u.tenantId);
  }

  @Post()
  create(@CurrentUser() u: AuthedUser, @Body() body: unknown) {
    return this.brand.create(u.tenantId, brandSchema.parse(body));
  }

  @Patch(':id')
  update(@CurrentUser() u: AuthedUser, @Param('id') id: string, @Body() body: unknown) {
    return this.brand.update(u.tenantId, id, brandSchema.partial().parse(body));
  }

  @Delete(':id')
  remove(@CurrentUser() u: AuthedUser, @Param('id') id: string) {
    return this.brand.remove(u.tenantId, id);
  }
}
