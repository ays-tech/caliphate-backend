import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private push:   PushService,
  ) {}

  async create(
    data: { title: string; description?: string; date: string },
    userId: string,
  ) {
    const event = await this.prisma.event.create({
      data: {
        title:       data.title,
        description: data.description,
        date:        new Date(data.date),
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    const d = new Date(data.date);
    const dateStr = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

    this.push.sendToAll({
      title: '📅 New Event — CaliphateMakhtaba',
      body:  `${event.title} · ${dateStr}`,
      url:   '/',
      tag:   `event-${event.id}`,
    }).catch(() => {});

    return event;
  }

  async findAll() {
    return this.prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findUpcoming() {
    return this.prisma.event.findMany({
      where:   { date: { gte: new Date() } },
      orderBy: { date: 'asc' },
      take:    5,
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where:   { id },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async delete(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted' };
  }
}
