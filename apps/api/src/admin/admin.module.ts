import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialModule } from '../social/social.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, PrismaModule, SocialModule, NotificationsModule, AiModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
