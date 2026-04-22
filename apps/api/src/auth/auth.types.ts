import type { Account, AuthSession } from '@prisma/client';
import type { Request } from 'express';

export interface AuthContext {
  account: Account;
  session: AuthSession;
  token: string;
}

export type AuthenticatedRequest = Request & {
  auth: AuthContext;
};

