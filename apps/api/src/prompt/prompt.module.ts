import { Module } from '@nestjs/common';
import { PromptController } from './prompt.controller';
import { PromptService } from './prompt.service';
import { RunModule } from '../run/run.module';

@Module({
  imports: [RunModule],
  controllers: [PromptController],
  providers: [PromptService],
})
export class PromptModule {}
