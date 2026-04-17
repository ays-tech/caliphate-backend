import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { PushModule } from '../push/push.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports:     [PushModule, PrismaModule],
  providers:   [BooksService],
  controllers: [BooksController],
})
export class BooksModule {}
