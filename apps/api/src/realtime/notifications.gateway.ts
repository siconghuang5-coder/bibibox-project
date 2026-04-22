import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    const rawToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : typeof client.handshake.query?.token === 'string'
          ? client.handshake.query.token
          : '';

    if (!rawToken) {
      client.disconnect();
      return;
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        tokenHash: this.hashToken(rawToken),
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      client.disconnect();
      return;
    }

    client.data.accountId = session.accountId;
    client.join(this.room(session.accountId));
    this.logger.debug(`Socket joined room for account ${session.accountId}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.accountId) {
      client.leave(this.room(client.data.accountId));
    }
  }

  emitNotificationCreated(accountId: string, payload: unknown) {
    this.server.to(this.room(accountId)).emit('notification:new', payload);
  }

  emitUnreadCount(accountId: string, unreadCount: number) {
    this.server.to(this.room(accountId)).emit('notification:count', { unreadCount });
  }

  emitFeedPost(payload: unknown) {
    this.server.emit('feed:new-post', payload);
  }

  private room(accountId: string) {
    return `account:${accountId}`;
  }

  private hashToken(value: string) {
    const crypto = require('crypto') as typeof import('crypto');
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}

