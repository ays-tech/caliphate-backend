import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScholarsModule } from './scholars/scholars.module';
import { BooksModule } from './books/books.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // ── Serve static media files ──────────────────────────────────────
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'media'),
      serveRoot: '/media',
    }),

    // ── Rate limiting ──────────────────────────────────────────────────
    // Default: 60 requests per minute per IP across all routes.
    // Auth endpoints get a tighter limit — see AuthModule / controllers.
    ThrottlerModule.forRoot([
      {
        name:    'default',
        ttl:     60_000, // 1 minute window (ms)
        limit:   60,     // 60 requests per window
      },
      {
        name:    'auth',
        ttl:     60_000, // 1 minute window
        limit:   10,     // 10 requests per window (login/register)
      },
    ]),

    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ScholarsModule,
    BooksModule,
    EventsModule,
  ],
  providers: [
    // Apply the default throttle globally to every route
    {
      provide:  APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
