import { Module } from '@nestjs/common';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { PushModule } from '../push/push.module';

@Module({
  imports:     [PushModule],
  providers:   [BooksService],
  controllers: [BooksController],
})
export class BooksModule {}
