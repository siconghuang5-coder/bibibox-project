import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessageType } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentSession } from '../auth/current-session.decorator';
import type { AuthContext } from '../auth/auth.types';
import { ChatService } from './chat.service';

class ConversationDto {
  @IsString()
  digitalHumanAccountId!: string;
}

class ConversationMessagesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

class SendMessageDto {
  @IsEnum(MessageType)
  messageType!: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  textContent?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaMimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  transcription?: string;
}

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  conversations(@CurrentSession() auth: AuthContext) {
    return this.chatService.listConversations(auth.account.id);
  }

  @Post('conversations')
  ensureConversation(@CurrentSession() auth: AuthContext, @Body() body: ConversationDto) {
    return this.chatService.ensureConversation(auth.account.id, body.digitalHumanAccountId);
  }

  @Get('conversations/:id')
  detail(
    @CurrentSession() auth: AuthContext,
    @Param('id') id: string,
    @Query() query: ConversationMessagesQuery,
  ) {
    return this.chatService.getConversation(auth.account.id, id, query.page ?? 1, query.pageSize ?? 30);
  }

  @Post('conversations/:id/messages')
  sendMessage(@CurrentSession() auth: AuthContext, @Param('id') id: string, @Body() body: SendMessageDto) {
    return this.chatService.sendMessage(auth.account.id, id, body);
  }

  @Post('conversations/:id/read')
  markRead(@CurrentSession() auth: AuthContext, @Param('id') id: string) {
    return this.chatService.markConversationRead(auth.account.id, id);
  }

  @Get('unread-summary')
  unreadSummary(@CurrentSession() auth: AuthContext) {
    return this.chatService.getUnreadSummary(auth.account.id);
  }

  @Post('uploads/image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 8 * 1024 * 1024,
      },
    }),
  )
  uploadImage(
    @CurrentSession() auth: AuthContext,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    return this.chatService.uploadImage(auth.account.id, file);
  }

  @Post('uploads/audio')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 12 * 1024 * 1024,
      },
    }),
  )
  uploadAudio(
    @CurrentSession() auth: AuthContext,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
  ) {
    return this.chatService.uploadAudio(auth.account.id, file);
  }
}
