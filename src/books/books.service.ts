import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class BooksService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────
  // Accepts an optional bookFile — if provided, it is automatically
  // saved as Volume 1 so admins don't need a second step.
  async create(
    data: {
      title: string;
      description?: string;
      scholarId: string;
      type?: string;
      volumeTitle?: string;
    },
    uploadedById: string,
    coverFile?: Express.Multer.File,
    bookFile?:  Express.Multer.File,
  ) {
    // Upload cover if provided
    let coverUrl: string | undefined;
    if (coverFile) {
      coverUrl = await this.storage.uploadFile(coverFile, 'covers');
    }

    // Create the book record
    const book = await this.prisma.book.create({
      data: {
        title:       data.title,
        description: data.description,
        scholarId:   data.scholarId,
        uploadedById,
        coverUrl,
        type:   (data.type as any) || 'UNPUBLISHED',
        status: 'PENDING',
      },
      include: {
        scholar:    true,
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    // If a book file was attached, auto-create Volume 1
    if (bookFile) {
      const fileUrl  = await this.storage.uploadFile(bookFile, 'volumes');
      const fileType = this.detectFileType(bookFile.mimetype);
      await this.prisma.bookVolume.create({
        data: {
          bookId:   book.id,
          title:    data.volumeTitle?.trim() || `${data.title} – Volume 1`,
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

    let coverUrl = book.coverUrl;
    if (coverFile) {
      coverUrl = await this.storage.uploadFile(coverFile, 'covers');
    }

    return this.prisma.book.update({
      where: { id },
      data: {
        ...(data.title                  && { title:       data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.scholarId              && { scholarId:   data.scholarId }),
        ...(data.type                   && { type:        data.type as any }),
        coverUrl,
        status: 'PENDING', // reset to pending after edit
      },
      include: {
        scholar:    true,
        uploadedBy: { select: { id: true, name: true } },
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
      throw new ForbiddenException('Not your book');
    }

    const fileUrl  = await this.storage.uploadFile(file, 'volumes');
    const fileType = this.detectFileType(file.mimetype);

    return this.prisma.bookVolume.create({
      data: {
        bookId,
        title:    volumeData.title,
        fileUrl,
        fileType,
        order: volumeData.order || 1,
      },
    });
  }

  private detectFileType(mimetype: string): string {
    if (mimetype === 'application/pdf')      return 'pdf';
    if (mimetype === 'application/epub+zip') return 'epub';
    if (mimetype.startsWith('image/'))       return 'image';
    return 'other';
  }

  // ── Find All (public — approved only) ──────────────────────────────
  async findAll(query: {
    search?: string; scholarId?: string; status?: string;
    type?: string; page?: number; limit?: number;
  }) {
    const page  = query.page  || 1;
    const limit = query.limit || 12;
    const skip  = (page - 1) * limit;
    const where: any = { status: query.status || 'APPROVED' };

    if (query.search)    where.title      = { contains: query.search, mode: 'insensitive' };
    if (query.scholarId) where.scholarId  = query.scholarId;
    if (query.type)      where.type       = query.type;

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

  // ── Find All Admin (all statuses) ───────────────────────────────────
  async findAllAdmin(query: {
    search?: string; status?: string; page?: number; limit?: number;
  }) {
    const page  = query.page  || 1;
    const limit = query.limit || 12;
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
      take:    limit,
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
      take:    limit,
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

    await this.prisma.book.update({
      where: { id },
      data:  { readCount: { increment: 1 } },
    });

    return book;
  }

  async approve(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return this.prisma.book.update({
      where: { id }, data: { status: 'APPROVED' }, include: { scholar: true },
    });
  }

  async reject(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');
    return this.prisma.book.update({
      where: { id }, data: { status: 'REJECTED' }, include: { scholar: true },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');

    if (userRole !== 'SUPER_ADMIN' && book.uploadedById !== userId) {
      throw new ForbiddenException('Not your book');
    }

    await this.prisma.book.delete({ where: { id } });
    return { message: 'Book deleted' };
  }

  async getSignedVolumeUrl(volumeId: string) {
    const volume = await this.prisma.bookVolume.findUnique({
      where:   { id: volumeId },
      include: { book: { select: { status: true } } },
    });
    if (!volume) throw new NotFoundException('Volume not found');
    if (volume.book.status !== 'APPROVED') throw new ForbiddenException('Book not approved');

    const url = await this.storage.getSignedUrl(volume.fileUrl);
    return { url, fileType: volume.fileType };
  }
}
