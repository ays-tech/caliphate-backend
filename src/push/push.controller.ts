import {
  Controller, Post, Delete, Get, Body,
  UseGuards, HttpCode,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';

@Controller('push')
export class PushController {
  constructor(
    private pushService: PushService,
    private prisma:      PrismaService,
  ) {}

  @Get('vapid-public-key')
  @SkipThrottle()
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
  }

  @Post('subscribe')
  @SkipThrottle()
  subscribe(@Body() body: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string;
  }) {
    return this.pushService.subscribe(body);
  }

  @Delete('unsubscribe')
  @SkipThrottle()
  unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribe(body.endpoint);
  }

  // ── Admin: subscriber count ───────────────────────────────────────
  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @SkipThrottle()
  async getStats() {
    const count = await this.prisma.pushSubscription.count();
    return { subscribers: count };
  }

  // ── Admin: send custom broadcast to all subscribers ───────────────
  @Post('broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(200)
  async broadcast(@Body() body: {
    title:   string;
    message: string;
    url?:    string;
  }) {
    if (!body.title?.trim())   return { sent: 0, error: 'Title is required' };
    if (!body.message?.trim()) return { sent: 0, error: 'Message is required' };

    const count = await this.prisma.pushSubscription.count();
    if (count === 0) return { sent: 0, error: 'No subscribers yet' };

    await this.pushService.sendToAll({
      title: body.title.trim(),
      body:  body.message.trim(),
      url:   body.url?.trim() || '/',
      tag:   `broadcast-${Date.now()}`,
    });

    return {
      sent:    count,
      message: `Notification sent to ${count} subscriber(s)`,
    };
  }
}
