import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { AccountType } from '@prisma/client';
import { CurrentSession } from './current-session.decorator';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { AuthContext } from './auth.types';

class RegisterDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{4,20}$/)
  username!: string;

  @IsString()
  @MaxLength(30)
  displayName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;
}

class LoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;

  @IsEnum(AccountType)
  accountType!: AccountType;
}

class WechatLoginDto {
  @IsString()
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('wechat/login')
  wechatLogin(@Body() body: WechatLoginDto) {
    return this.authService.loginWithWeChat(body.code);
  }

  @Post('wechat')
  compatWechat(@Body() body: WechatLoginDto) {
    return this.authService.loginWithWeChat(body.code, { compatMode: true });
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@CurrentSession() auth: AuthContext) {
    return this.authService.logout(auth.token);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentSession() auth: AuthContext) {
    return this.authService.getMe(auth.account.id);
  }
}
