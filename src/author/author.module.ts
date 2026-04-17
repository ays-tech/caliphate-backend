import { Module } from '@nestjs/common';
import { AuthorService } from './author.service';
import { AuthorController, AdminAuthorController } from './author.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports:     [PrismaModule, StorageModule],
  providers:   [AuthorService],
  controllers: [AuthorController, AdminAuthorController],
  exports:     [AuthorService],
})
export class AuthorModule {}
