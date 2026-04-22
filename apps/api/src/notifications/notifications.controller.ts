import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentSession } from '../auth/current-session.decorator';
import type { AuthContext } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

class ReadNotificationsDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}

class PaginationQuery {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentSession() auth: AuthContext, @Query() query: PaginationQuery) {
    return this.notificationsService.list(auth.account.id, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post('read')
  read(@CurrentSession() auth: AuthContext, @Body() body: ReadNotificationsDto) {
    return this.notificationsService.markRead(auth.account.id, body.ids);
  }

  @Post('read-all')
  readAll(@CurrentSession() auth: AuthContext) {
    return this.notificationsService.markAllRead(auth.account.id);
  }

  @Get('unread-count')
  async unreadCount(@CurrentSession() auth: AuthContext) {
    return {
      unreadCount: await this.notificationsService.getUnreadCount(auth.account.id),
    };
  }
}

