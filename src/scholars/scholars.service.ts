import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ScholarsService {
  constructor(
    private prisma:   PrismaService,
    private storage:  StorageService,
  ) {}

  async create(
    name:      string,
    biography: string | undefined,
    file?:     Express.Multer.File,
  ) {
    if (!name?.trim()) throw new BadRequestException('Scholar name is required');

    let pictureUrl: string | undefined;
    if (file) {
      pictureUrl = await this.storage.uploadFile(file, 'scholars');
    }

    return this.prisma.scholar.create({
      data: {
        name:      name.trim(),
        biography: biography?.trim() || null,
        pictureUrl,
      },
      include: { _count: { select: { books: true } } },
    });
  }

  async findAll(search?: string) {
    return this.prisma.scholar.findMany({
      where: search?.trim()
        ? { name: { contains: search.trim(), mode: 'insensitive' } }
        : {},
      include: { _count: { select: { books: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const scholar = await this.prisma.scholar.findUnique({
      where: { id },
      include: {
        books: {
          where:   { status: 'APPROVED' },
          include: { volumes: true, _count: { select: { volumes: true } } },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { books: true } },
      },
    });
    if (!scholar) throw new NotFoundException('Scholar not found');
    return scholar;
  }

  async update(
    id:        string,
    name:      string | undefined,
    biography: string | undefined,
    file?:     Express.Multer.File,
  ) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id } });
    if (!scholar) throw new NotFoundException('Scholar not found');

    let pictureUrl = scholar.pictureUrl;
    if (file) {
      pictureUrl = await this.storage.uploadFile(file, 'scholars');
      // Delete old picture from disk (best-effort)
      if (scholar.pictureUrl) {
        this.storage.deleteFile(scholar.pictureUrl).catch(() => {});
      }
    }

    return this.prisma.scholar.update({
      where: { id },
      data: {
        ...(name?.trim()            && { name:      name.trim() }),
        ...(biography !== undefined && { biography: biography.trim() || null }),
        pictureUrl,
      },
      include: { _count: { select: { books: true } } },
    });
  }

  async delete(id: string) {
    const scholar = await this.prisma.scholar.findUnique({
      where:   { id },
      include: {
        books: {
          include: { volumes: true },
        },
      },
    });
    if (!scholar) throw new NotFoundException('Scholar not found');

    // 1. Delete all volume files from disk (best-effort)
    for (const book of scholar.books) {
      if (book.coverUrl) {
        this.storage.deleteFile(book.coverUrl).catch(() => {});
      }
      for (const volume of book.volumes) {
        this.storage.deleteFile(volume.fileUrl).catch(() => {});
      }
    }

    // 2. Delete scholar picture from disk (best-effort)
    if (scholar.pictureUrl) {
      this.storage.deleteFile(scholar.pictureUrl).catch(() => {});
    }

    // 3. Delete all the scholar's books (cascades to volumes via DB)
    await this.prisma.book.deleteMany({ where: { scholarId: id } });

    // 4. Now safe to delete the scholar
    await this.prisma.scholar.delete({ where: { id } });

    return { message: 'Scholar and all associated books deleted successfully' };
  }
}
