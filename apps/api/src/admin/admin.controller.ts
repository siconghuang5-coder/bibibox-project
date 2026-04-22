import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PostScope, PostSource, ProductStatus, ProductType } from '@prisma/client';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentSession } from '../auth/current-session.decorator';
import type { AuthContext } from '../auth/auth.types';
import { AdminService } from './admin.service';

class UserListQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  accountType?: string;
}

class PostListQuery {
  @IsOptional()
  @IsEnum(PostScope)
  scope?: PostScope;

  @IsOptional()
  @IsEnum(PostSource)
  source?: PostSource;

  @IsOptional()
  @IsString()
  q?: string;
}

class ProductListQuery {
  @IsOptional()
  @IsEnum(ProductType)
  productType?: ProductType;

  @IsOptional()
  @IsString()
  q?: string;
}

class OrderListQuery {
  @IsOptional()
  @IsString()
  q?: string;
}

class AssetListQuery {
  @IsOptional()
  @IsString()
  q?: string;
}

class ConversationListQuery {
  @IsOptional()
  @IsString()
  q?: string;
}

class ImpersonatePostDto {
  @IsString()
  authorId!: string;

  @IsEnum(PostScope)
  scope!: PostScope;

  @IsString()
  @MaxLength(280)
  content!: string;

  @IsOptional()
  @ArrayMaxSize(4)
  mediaUrls?: string[];
}

class GenerateDraftDto {
  @IsString()
  digitalHumanId!: string;

  @IsString()
  topic!: string;

  @IsEnum(PostScope)
  scope!: PostScope;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsBoolean()
  generateImage?: boolean;
}

class PublishDraftDto {
  @IsString()
  digitalHumanId!: string;

  @IsEnum(PostScope)
  scope!: PostScope;

  @IsString()
  content!: string;

  @IsOptional()
  mediaUrls?: string[];
}

class ScheduleDraftDto extends GenerateDraftDto {
  @IsString()
  scheduledAt!: string;
}

class PinTopicDto {
  @IsBoolean()
  pinned!: boolean;
}

class UpsertProductDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductType)
  productType!: ProductType;

  @IsEnum(ProductStatus)
  status!: ProductStatus;

  @IsInt()
  @Min(0)
  priceCoins!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  relatedAccountId?: string;
}

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  overview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  users(@Query() query: UserListQuery) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  userDetail(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Get('posts')
  posts(@Query() query: PostListQuery) {
    return this.adminService.listPosts(query);
  }

  @Get('products')
  products(@Query() query: ProductListQuery) {
    return this.adminService.listProducts(query);
  }

  @Post('products')
  upsertProduct(@Body() body: UpsertProductDto) {
    return this.adminService.upsertProduct(body);
  }

  @Get('orders')
  orders(@Query() query: OrderListQuery) {
    return this.adminService.listOrders(query);
  }

  @Get('assets')
  assets(@Query() query: AssetListQuery) {
    return this.adminService.listAssets(query);
  }

  @Get('chats')
  chats(@Query() query: ConversationListQuery) {
    return this.adminService.listConversations(query);
  }

  @Post('posts/impersonate')
  impersonate(@CurrentSession() auth: AuthContext, @Body() body: ImpersonatePostDto) {
    return this.adminService.impersonatePost(auth.account, body);
  }

  @Post('ai-publish/generate')
  generate(@Body() body: GenerateDraftDto) {
    return this.adminService.generateDraft(body);
  }

  @Post('ai-publish/publish')
  publish(@CurrentSession() auth: AuthContext, @Body() body: PublishDraftDto) {
    return this.adminService.publishDraft(auth.account, body);
  }

  @Post('ai-publish/schedule')
  schedule(@CurrentSession() auth: AuthContext, @Body() body: ScheduleDraftDto) {
    return this.adminService.scheduleDraft(auth.account, body);
  }

  @Get('notifications')
  notifications() {
    return this.adminService.listNotifications();
  }

  @Patch('topics/:id/pin')
  pinTopic(@Param('id') id: string, @Body() body: PinTopicDto) {
    return this.adminService.pinTopic(id, body.pinned);
  }
}
