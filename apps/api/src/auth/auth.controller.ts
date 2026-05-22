import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { Public } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
  website: z.string().url().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: unknown) {
    const data = registerSchema.parse(body);
    return this.auth.register(data);
  }

  @Public()
  @Post('login')
  async login(@Body() body: unknown) {
    const data = loginSchema.parse(body);
    return this.auth.login(data.email, data.password);
  }

  @Get('me')
  async me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }
}
