import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext, AuthenticatedRequest } from './auth.types';

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.auth;
  },
);

