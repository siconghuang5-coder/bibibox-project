import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CozeService } from './coze.service';

@Module({
  imports: [ConfigModule],
  providers: [CozeService],
  exports: [CozeService],
})
export class AiModule {}

