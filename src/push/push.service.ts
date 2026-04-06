import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title:  string;
  body:   string;
  icon?:  string;
  badge?: string;
  url?:   string;
  tag?:   string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    const publicKey  = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email      = process.env.VAPID_EMAIL || 'admin@lo9in.com';

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not set — push notifications disabled. Run: npx web-push generate-vapid-keys');
      return;
    }

    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    this.logger.log('Push notifications ready');
  }

  async subscribe(sub: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string;
  }) {
    return this.prisma.pushSubscription.upsert({
      where:  { endpoint: sub.endpoint },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId: sub.userId || null },
      create: {
        endpoint: sub.endpoint,
        p256dh:   sub.keys.p256dh,
        auth:     sub.keys.auth,
        userId:   sub.userId || null,
      },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { message: 'Unsubscribed' };
  }

  async sendToAll(payload: PushPayload) {
    if (!process.env.VAPID_PUBLIC_KEY) return;

    const subs = await this.prisma.pushSubscription.findMany();
    if (subs.length === 0) return;

    const data = JSON.stringify({
      title:  payload.title,
      body:   payload.body,
      icon:   payload.icon  || '/icons/icon-192.png',
      badge:  payload.badge || '/icons/icon-192.png',
      url:    payload.url   || '/',
      tag:    payload.tag   || 'makhtaba',
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            data,
            { TTL: 86400 },
          );
        } catch (err: any) {
          if (err.statusCode === 410) {
            await this.prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
          }
        }
      }),
    );
  }
}
