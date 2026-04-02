import { Module } from '@nestjs/common';
import { ScholarsService } from './scholars.service';
import { ScholarsController } from './scholars.controller';

@Module({
  providers: [ScholarsService],
  controllers: [ScholarsController],
})
export class ScholarsModule {}
