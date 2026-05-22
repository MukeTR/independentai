import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = Number(process.env.API_PORT ?? 4002);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Independent AI API → http://localhost:${port}/api`);
}
bootstrap();
