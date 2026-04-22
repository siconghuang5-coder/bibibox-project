import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      throw new UnauthorizedException('未登录');
    }

    const session = await this.authService.validateToken(token);
    if (!session) {
      throw new UnauthorizedException('登录已失效');
    }

    request.auth = {
      account: session.account,
      session,
      token,
    };

    return true;
  }
}

