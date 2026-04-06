import { Controller, Post, Delete, Get, Body } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PushService } from './push.service';

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

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
}
