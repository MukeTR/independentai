import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma.service';
import { hashPassword, verifyPassword } from '../common/password';
import { FREE_TRIAL_MONTHS } from '@independentai/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { email: string; password: string; companyName: string; website?: string }) {
    const exists = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (exists) throw new ConflictException('Bu e-posta zaten kayıtlı');

    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + FREE_TRIAL_MONTHS);

    const tenant = await this.prisma.tenant.create({
      data: {
        name: input.companyName,
        website: input.website,
        trialEndsAt,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: input.email,
        passwordHash: hashPassword(input.password),
        role: 'OWNER',
      },
    });

    return this.issueToken(user.id, tenant.id, user.email);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('E-posta veya şifre hatalı');
    }
    return this.issueToken(user.id, user.tenantId, user.email);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user) throw new UnauthorizedException();
    const now = new Date();
    const trialDaysLeft = Math.max(
      0,
      Math.ceil((user.tenant.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    );
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        website: user.tenant.website,
        trialEndsAt: user.tenant.trialEndsAt,
        trialDaysLeft,
      },
    };
  }

  private async issueToken(userId: string, tenantId: string, email: string) {
    const token = await this.jwt.signAsync({ userId, tenantId, email });
    return { token };
  }
}
