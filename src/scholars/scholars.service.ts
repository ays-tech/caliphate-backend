import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ScholarsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(name: string, biography: string, file?: Express.Multer.File) {
    let pictureUrl: string | undefined;
    if (file) {
      pictureUrl = await this.storage.uploadFile(file, 'scholars');
    }

    return this.prisma.scholar.create({
      data: { name, biography, pictureUrl },
    });
  }

  async findAll(search?: string) {
    return this.prisma.scholar.findMany({
      where: search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {},
      include: {
        _count: { select: { books: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const scholar = await this.prisma.scholar.findUnique({
      where: { id },
      include: {
        books: {
          where: { status: 'APPROVED' },
          include: { volumes: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!scholar) throw new NotFoundException('Scholar not found');
    return scholar;
  }

  async update(
    id: string,
    name: string,
    biography: string,
    file?: Express.Multer.File,
  ) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id } });
    if (!scholar) throw new NotFoundException('Scholar not found');

    let pictureUrl = scholar.pictureUrl;
    if (file) {
      pictureUrl = await this.storage.uploadFile(file, 'scholars');
    }

    return this.prisma.scholar.update({
      where: { id },
      data: { name, biography, pictureUrl },
    });
  }

  async delete(id: string) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id } });
    if (!scholar) throw new NotFoundException('Scholar not found');
    await this.prisma.scholar.delete({ where: { id } });
    return { message: 'Scholar deleted' };
  }
}
