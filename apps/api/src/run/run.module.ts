import { Module } from '@nestjs/common';
import { RunService } from './run.service';

@Module({
  providers: [RunService],
  exports: [RunService],
})
export class RunModule {}
