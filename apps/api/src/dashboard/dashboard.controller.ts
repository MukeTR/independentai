import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthedUser } from '../auth/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('metrics')
  metrics(@CurrentUser() u: AuthedUser, @Query('days') days?: string) {
    return this.dashboard.metrics(u.tenantId, days ? Number(days) : 30);
  }
}
