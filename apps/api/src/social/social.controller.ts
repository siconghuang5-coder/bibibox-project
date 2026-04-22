import { Body, Controller, Get, Param, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PostScope } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentSession } from '../auth/current-session.decorator';
import type { AuthContext } from '../auth/auth.types';
import { SocialService } from './social.service';

class FeedQueryDto {
  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}

class CreatePostDto {
  @IsEnum(PostScope)
  scope!: PostScope;

  @IsString()
  @MaxLength(280)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @IsString({ each: true })
  mediaUrls?: string[];
}

class CreateCommentDto {
  @IsString()
  @MaxLength(220)
  content!: string;
}

class MentionDto {
  @IsArray()
  @IsString({ each: true })
  accountIds!: string[];
}

@Controller()
@UseGuards(AuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('moments/feed')
  moments(@CurrentSession() auth: AuthContext, @Query() query: FeedQueryDto) {
    return this.socialService.getMomentsFeed(auth.account.id, query.page ?? 1, query.pageSize ?? 10);
  }

  @Get('square/feed')
  square(@CurrentSession() auth: AuthContext, @Query() query: FeedQueryDto) {
    return this.socialService.getSquareFeed(auth.account.id, query.page ?? 1, query.pageSize ?? 10);
  }

  @Post('posts')
  createPost(@CurrentSession() auth: AuthContext, @Body() body: CreatePostDto) {
    return this.socialService.createPost({
      authorId: auth.account.id,
      scope: body.scope,
      content: body.content,
      mediaUrls: body.mediaUrls,
    });
  }

  @Post('uploads/images')
  @UseInterceptors(
    FilesInterceptor('files', 4, {
      limits: {
        files: 4,
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadImages(
    @CurrentSession() auth: AuthContext,
    @UploadedFiles()
    files: Array<{
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }>,
  ) {
    return this.socialService.uploadImages(auth.account.id, files ?? []);
  }

  @Get('posts/:id')
  getPost(@CurrentSession() auth: AuthContext, @Param('id') id: string) {
    return this.socialService.getPost(auth.account.id, id);
  }

  @Get('posts/:id/comments')
  comments(@CurrentSession() auth: AuthContext, @Param('id') id: string, @Query() query: FeedQueryDto) {
    return this.socialService.listPostComments(auth.account.id, id, query.page ?? 1, query.pageSize ?? 20);
  }

  @Post('posts/:id/like')
  like(@CurrentSession() auth: AuthContext, @Param('id') id: string) {
    return this.socialService.toggleLike(auth.account, id);
  }

  @Post('posts/:id/comments')
  comment(@CurrentSession() auth: AuthContext, @Param('id') id: string, @Body() body: CreateCommentDto) {
    return this.socialService.commentPost(auth.account, id, body.content);
  }

  @Post('comments/:id/reply')
  reply(@CurrentSession() auth: AuthContext, @Param('id') id: string, @Body() body: CreateCommentDto) {
    return this.socialService.replyComment(auth.account, id, body.content);
  }

  @Post('posts/:id/mentions')
  mentions(@CurrentSession() auth: AuthContext, @Param('id') id: string, @Body() body: MentionDto) {
    return this.socialService.mentionUsers(auth.account, id, body.accountIds);
  }

  @Get('search/users')
  search(@CurrentSession() auth: AuthContext, @Query('q') query = '') {
    return this.socialService.searchUsers(auth.account.id, query);
  }

  @Get('profiles/:accountId')
  profile(@CurrentSession() auth: AuthContext, @Param('accountId') accountId: string) {
    return this.socialService.getProfile(auth.account.id, accountId);
  }

  @Post('follows/:accountId')
  follow(@CurrentSession() auth: AuthContext, @Param('accountId') accountId: string) {
    return this.socialService.toggleFollow(auth.account, accountId);
  }

  @Post('friends/:accountId/request')
  requestFriend(@CurrentSession() auth: AuthContext, @Param('accountId') accountId: string) {
    return this.socialService.requestFriend(auth.account, accountId);
  }

  @Post('friends/:requestId/accept')
  acceptFriend(@CurrentSession() auth: AuthContext, @Param('requestId') requestId: string) {
    return this.socialService.acceptFriend(auth.account, requestId);
  }
}
