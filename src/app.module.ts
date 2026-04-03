import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScholarsModule } from './scholars/scholars.module';
import { BooksModule } from './books/books.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // ── Rate limiting ──────────────────────────────────────────────────
    // Disabled in development (NODE_ENV=development) to allow rapid iteration
    // Enabled in production for protection
    ...(process.env.NODE_ENV === 'production'
      ? [
          ThrottlerModule.forRoot([
            {
              name:  'default',
              ttl:   60_000,
              limit: 60,
            },
            {
              name:  'auth',
              ttl:   60_000,
              limit: 10,
            },
          ]),
        ]
      : []),

    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    ScholarsModule,
    BooksModule,
    EventsModule,
  ],
  providers: [
    // Apply throttle guard only if ThrottlerModule is imported (production mode)
    ...(process.env.NODE_ENV === 'production'
      ? [
          {
            provide:  APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
  ],
})
export class AppModule {}
