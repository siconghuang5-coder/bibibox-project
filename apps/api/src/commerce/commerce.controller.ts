import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductType } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentSession } from '../auth/current-session.decorator';
import type { AuthContext } from '../auth/auth.types';
import { CommerceService } from './commerce.service';

class CartItemDto {
  @IsString()
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}

class CheckoutDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items?: CartItemDto[];
}

class RechargeDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCoins!: number;
}

@Controller()
@UseGuards(AuthGuard)
export class CommerceController {
  constructor(private readonly commerceService: CommerceService) {}

  @Get('market/home')
  home(@CurrentSession() auth: AuthContext) {
    return this.commerceService.getMarketHome(auth.account.id);
  }

  @Get('products')
  products(
    @CurrentSession() auth: AuthContext,
    @Query('productType') productType?: ProductType,
    @Query('q') query = '',
  ) {
    return this.commerceService.listProducts(auth.account.id, productType, query);
  }

  @Get('products/:id')
  product(@CurrentSession() auth: AuthContext, @Param('id') id: string) {
    return this.commerceService.getProductDetail(auth.account.id, id);
  }

  @Get('cart')
  cart(@CurrentSession() auth: AuthContext) {
    return this.commerceService.getCart(auth.account.id);
  }

  @Post('cart/items')
  addToCart(@CurrentSession() auth: AuthContext, @Body() body: CartItemDto) {
    return this.commerceService.upsertCartItem(auth.account.id, body);
  }

  @Patch('cart/products/:productId')
  updateCart(
    @CurrentSession() auth: AuthContext,
    @Param('productId') productId: string,
    @Body()
    body: {
      quantity: number;
    },
  ) {
    return this.commerceService.upsertCartItem(auth.account.id, {
      productId,
      quantity: body.quantity,
    });
  }

  @Delete('cart/items/:id')
  removeFromCart(@CurrentSession() auth: AuthContext, @Param('id') id: string) {
    return this.commerceService.removeCartItem(auth.account.id, id);
  }

  @Post('wallet/recharge')
  recharge(@CurrentSession() auth: AuthContext, @Body() body: RechargeDto) {
    return this.commerceService.rechargeWallet(auth.account.id, body.amountCoins);
  }

  @Post('orders/checkout')
  checkout(@CurrentSession() auth: AuthContext, @Body() body: CheckoutDto) {
    return this.commerceService.checkout(auth.account.id, body.items);
  }

  @Get('orders')
  orders(@CurrentSession() auth: AuthContext) {
    return this.commerceService.listOrders(auth.account.id);
  }

  @Get('assets')
  assets(@CurrentSession() auth: AuthContext) {
    return this.commerceService.getAssetsDashboard(auth.account.id);
  }
}
