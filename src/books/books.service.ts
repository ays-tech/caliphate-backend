import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { PushService } from '../push/push.service';
import { IMAGE_TYPES } from '../common/config/upload.config';

@Injectable()
export class BooksService {
  constructor(
    private prisma:  PrismaService,
    private storage: StorageService,
    private push:    PushService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────
  async create(
    data: {
      title: string;
      description?: string;
      scholarId: string;
      type?: string;
      language?: string;
      format?: string;
      volumeTitle?: string;
    },
    uploadedById: string,
    coverFile?: Express.Multer.File,
    bookFile?:   Express.Multer.File,
  ) {
    if (!data.title?.trim())  throw new BadRequestException('Book title is required');
    if (!data.scholarId)      throw new BadRequestException('Scholar is required');

    if (coverFile && !IMAGE_TYPES.includes(coverFile.mimetype)) {
      throw new BadRequestException('Cover must be a JPEG, PNG, or WEBP image');
    }

    let coverUrl: string | undefined;
    if (coverFile) {
      coverUrl = await this.storage.uploadFile(coverFile, 'covers');
    }

    const book = await this.prisma.book.create({
      data: {
        title:       data.title.trim(),
        description: data.description?.trim() || null,
        scholarId:   data.scholarId,
        uploadedById,
        coverUrl,
        type:     (data.type     as any) || 'UNPUBLISHED',
        language: (data.language as any) || 'ARABIC',
        format:   (data.format   as any) || 'BOOK',
        status:   'PENDING',
      },
      include: {
        scholar:    true,
        uploadedBy: { select: { id: true, name: true } },
        _count:     { select: { volumes: true } },
      },
    });

    if (bookFile) {
      const fileUrl  = await this.storage.uploadFile(bookFile, 'volumes');
      const fileType = this.detectFileType(bookFile.mimetype);
      await this.prisma.bookVolume.create({
        data: {
          bookId:   book.id,
          title:    data.volumeTitle?.trim() || `${data.title.trim()} — Volume 1`,
          fileUrl,
          fileType,
          order: 1,
        },
      });
    }

    return book;
  }

  // ── Update ──────────────────────────────────────────────────────────
  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      scholarId?: string;
      type?: string;
      language?: string;
      format?: string;
    },
    userId: string,
    userRole: string,
    coverFile?: Express.Multer.File,
  ) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');

    if (userRole !== 'SUPER_ADMIN' && book.uploadedById !== userId) {
      throw new ForbiddenException('You can only edit your own books');
    }

    if (coverFile && !IMAGE_TYPES.includes(coverFile.mimetype)) {
      throw new BadRequestException('Cover must be a JPEG, PNG, or WEBP image');
    }

    let coverUrl = book.coverUrl;
    if (coverFile) {
      coverUrl = await this.storage.uploadFile(coverFile, 'covers');
      if (book.coverUrl) this.storage.deleteFile(book.coverUrl).catch(() => {});
    }

    return this.prisma.book.update({
      where: { id },
      data: {
        ...(data.title?.trim()             && { title:       data.title.trim() }),
        ...(data.description !== undefined && { description: data.description?.trim() || null }),
        ...(data.scholarId                 && { scholarId:   data.scholarId }),
        ...(data.type                      && { type:        data.type as any }),
        ...(data.language                  && { language:    data.language as any }),
        ...(data.format                    && { format:      data.format as any }),
        coverUrl,
        status: 'PENDING',
      },
      include: {
        scholar:    true,
        uploadedBy: { select: { id: true, name: true } },
        _count:     { select: { volumes: true } },
      },
    });
  }

  // ── Add Volume ──────────────────────────────────────────────────────
  async addVolume(
    bookId: string,
    volumeData: { title: string; order?: number },
    file: Express.Multer.File,
    userId: string,
    userRole: string,
  ) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    if (userRole !== 'SUPER_ADMIN' && book.uploadedById !== userId) {
      throw new ForbiddenException('You can only add volumes to your own books');
    }

    if (!volumeData.title?.trim()) {
      throw new BadRequestException('Volume title is required');
    }

    const fileUrl  = await this.storage.uploadFile(file, 'volumes');
    const fileType = this.detectFileType(file.mimetype);

    return this.prisma.bookVolume.create({
      data: {
        bookId,
        title:    volumeData.title.trim(),
        fileUrl,
        fileType,
        order: volumeData.order || 1,
      },
    });
  }

  private detectFileType(mimetype: string): string {
    if (mimetype === 'application/pdf')      return 'pdf';
    if (mimetype === 'application/epub+zip') return 'epub';
    if (mimetype.startsWith('audio/'))       return 'audio';
    if (mimetype.startsWith('video/'))       return 'video';
    if (mimetype.startsWith('image/'))       return 'image';
    return 'other';
  }

  // ── Find All (public) ───────────────────────────────────────────────
  async findAll(query: {
    search?: string; scholarId?: string; status?: string;
    type?: string; language?: string; format?: string;
    page?: number; limit?: number;
  }) {
    const page  = Math.max(1, query.page  || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip  = (page - 1) * limit;

    const where: any = { status: query.status || 'APPROVED' };
    if (query.search)    where.title     = { contains: query.search, mode: 'insensitive' };
    if (query.scholarId) where.scholarId = query.scholarId;
    if (query.type)      where.type      = query.type;
    if (query.language)  where.language  = query.language;
    if (query.format)    where.format    = query.format;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where, skip, take: limit,
        include: {
          scholar:    { select: { id: true, name: true, pictureUrl: true } },
          uploadedBy: { select: { id: true, name: true } },
          _count:     { select: { volumes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where }),
    ]);

    return { data: books, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Find All Admin ──────────────────────────────────────────────────
  async findAllAdmin(query: {
    search?: string; status?: string; page?: number; limit?: number;
  }) {
    const page  = Math.max(1, query.page  || 1);
    const limit = Math.min(50, query.limit || 12);
    const skip  = (page - 1) * limit;

    const where: any = {};
    if (query.search) where.title  = { contains: query.search, mode: 'insensitive' };
    if (query.status) where.status = query.status;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where, skip, take: limit,
        include: {
          scholar:    { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, name: true } },
          _count:     { select: { volumes: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where }),
    ]);

    return { data: books, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findMostRead(limit = 6) {
    return this.prisma.book.findMany({
      where:   { status: 'APPROVED' },
      orderBy: { readCount: 'desc' },
      take:    Math.min(20, limit),
      include: {
        scholar: { select: { id: true, name: true, pictureUrl: true } },
        _count:  { select: { volumes: true } },
      },
    });
  }

  async findRecent(limit = 6) {
    return this.prisma.book.findMany({
      where:   { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take:    Math.min(20, limit),
      include: {
        scholar: { select: { id: true, name: true, pictureUrl: true } },
        _count:  { select: { volumes: true } },
      },
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: {
        scholar:    true,
        uploadedBy: { select: { id: true, name: true } },
        volumes:    { orderBy: { order: 'asc' } },
      },
    });
    if (!book) throw new NotFoundException('Book not found');

    this.prisma.book.update({
      where: { id },
      data:  { readCount: { increment: 1 } },
    }).catch(() => {});

    return book;
  }

  // ── Approve — fires push notification ───────────────────────────────
  async approve(id: string) {
    const book = await this.prisma.book.findUnique({
      where:   { id },
      include: { scholar: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    const approved = await this.prisma.book.update({
      where: { id },
      data:  { status: 'APPROVED' },
      include: { scholar: true },
    });

    // Notify all subscribers (non-blocking)
    this.push.sendToAll({
      title: '📚 New Book — CaliphateMakhtaba',
      body:  `${book.title} by ${book.scholar?.name || 'Unknown Scholar'}`,
      url:   `/books/${book.id}`,
      tag:   `book-${book.id}`,
    }).catch(() => {});

    return approved;
  }

  async reject(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return this.prisma.book.update({
      where: { id }, data: { status: 'REJECTED' },
      include: { scholar: true },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const book = await this.prisma.book.findUnique({
      where:   { id },
      include: { volumes: true },
    });
    if (!book) throw new NotFoundException('Book not found');

    if (userRole !== 'SUPER_ADMIN' && book.uploadedById !== userId) {
      throw new ForbiddenException('You can only delete your own books');
    }

    if (book.coverUrl) this.storage.deleteFile(book.coverUrl).catch(() => {});
    for (const vol of book.volumes) {
      this.storage.deleteFile(vol.fileUrl).catch(() => {});
    }

    await this.prisma.book.delete({ where: { id } });
    return { message: 'Book deleted successfully' };
  }

  async getSignedVolumeUrl(volumeId: string) {
    const volume = await this.prisma.bookVolume.findUnique({
      where:   { id: volumeId },
      include: { book: { select: { status: true } } },
    });
    if (!volume) throw new NotFoundException('Volume not found');
    if (volume.book.status !== 'APPROVED') {
      throw new ForbiddenException('Book is not yet approved');
    }
    const url = await this.storage.getSignedUrl(volume.fileUrl);
    return { url, fileType: volume.fileType };
  }
}
