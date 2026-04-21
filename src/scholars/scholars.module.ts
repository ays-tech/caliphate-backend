import { Module } from '@nestjs/common';
import { ScholarsService } from './scholars.service';
import { ScholarsController, AdminScholarApplicationController } from './scholars.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports:     [PrismaModule, StorageModule],
  providers:   [ScholarsService],
  controllers: [ScholarsController, AdminScholarApplicationController],
  exports:     [ScholarsService],
})
export class ScholarsModule {}
