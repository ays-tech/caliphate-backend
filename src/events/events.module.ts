import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PushModule } from '../push/push.module';

@Module({
  imports:     [PushModule],
  providers:   [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
