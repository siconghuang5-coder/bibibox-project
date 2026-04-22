import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class RealtimeModule {}
