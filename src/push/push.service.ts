import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body:  string;
  url?:  string;
  tag?:  string;
  icon?: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private wp:      any    = null;
  private enabled          = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    // Use require() at runtime — avoids TS compile errors if @types/web-push
    // is missing, and gives a clear warning instead of crashing
    try {
      this.wp = require('web-push');
    } catch {
      this.logger.warn('web-push package not found — run: npm install web-push');
      return;
    }

    const pub  = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const mail = process.env.VAPID_EMAIL || 'admin@lo9in.com';

    if (!pub || !priv) {
      this.logger.warn(
        'VAPID keys not configured — push notifications disabled.\n' +
        '  1. Run: npx web-push generate-vapid-keys\n' +
        '  2. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env',
      );
      return;
    }

    this.wp.setVapidDetails(`mailto:${mail}`, pub, priv);
    this.enabled = true;
    this.logger.log('Push notifications ready ✓');
  }

  // ── Subscribe ─────────────────────────────────────────────────────
  async subscribe(sub: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string;
  }) {
    return this.prisma.pushSubscription.upsert({
      where:  { endpoint: sub.endpoint },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, userId: sub.userId ?? null },
      create: {
        endpoint: sub.endpoint,
        p256dh:   sub.keys.p256dh,
        auth:     sub.keys.auth,
        userId:   sub.userId ?? null,
      },
    });
  }

  // ── Unsubscribe ───────────────────────────────────────────────────
  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { message: 'Unsubscribed' };
  }

  // ── Send to all subscribers ───────────────────────────────────────
  async sendToAll(payload: PushPayload): Promise<void> {
    if (!this.enabled || !this.wp) return;

    const subs = await this.prisma.pushSubscription.findMany();
    if (!subs.length) return;

    const data = JSON.stringify({
      title: payload.title,
      body:  payload.body,
      icon:  payload.icon ?? '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      url:   payload.url  ?? '/',
      tag:   payload.tag  ?? 'makhtaba',
    });

    let sent    = 0;
    let removed = 0;

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await this.wp.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            data,
            { TTL: 86400 },
          );
          sent++;
        } catch (err: any) {
          // 410 = subscription expired — remove it
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await this.prisma.pushSubscription
              .deleteMany({ where: { endpoint: sub.endpoint } })
              .catch(() => {});
            removed++;
          }
        }
      }),
    );

    this.logger.log(
      `Push sent: ${sent}/${subs.length}` +
      (removed ? ` · removed ${removed} expired` : ''),
    );
  }
}
