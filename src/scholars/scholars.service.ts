import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ApplyScholarDto, UpdateScholarProfileDto, CreateScholarDto, UpdateScholarDto } from './dto/scholar.dto';

@Injectable()
export class ScholarsService {
  constructor(private prisma: PrismaService, private storage: StorageService) {}

  // ── Application flow ──────────────────────────────────────────────────
  async apply(userId: string, dto: ApplyScholarDto, pictureFile?: Express.Multer.File) {
    const existing = await this.prisma.scholar.findUnique({ where: { userId } });
    if (existing) {
      if (existing.claimStatus === 'REJECTED') {
        let pictureUrl = existing.pictureUrl;
        if (pictureFile) pictureUrl = await this.storage.uploadFile(pictureFile, 'scholars');
        return this.prisma.scholar.update({ where: { id: existing.id }, data: { name: dto.name, biography: dto.biography?.trim() || null, pictureUrl, claimStatus: 'PENDING', reviewNote: null } });
      }
      throw new ConflictException(existing.claimStatus === 'PENDING' ? 'Your application is already under review' : 'You already have an approved scholar profile');
    }
    let pictureUrl: string | undefined;
    if (pictureFile) pictureUrl = await this.storage.uploadFile(pictureFile, 'scholars');
    return this.prisma.scholar.create({ data: { userId, name: dto.name, biography: dto.biography?.trim() || null, pictureUrl, claimStatus: 'PENDING' } });
  }

  async getMyProfile(userId: string) {
    const scholar = await this.prisma.scholar.findUnique({
      where: { userId },
      include: { books: { orderBy: { createdAt: 'desc' }, include: { _count: { select: { volumes: true } } } }, _count: { select: { books: true } } },
    });
    if (!scholar) throw new NotFoundException('No scholar profile found. Apply at POST /api/scholars/apply');
    return scholar;
  }

  async updateMyProfile(userId: string, dto: UpdateScholarProfileDto, pictureFile?: Express.Multer.File) {
    const scholar = await this.prisma.scholar.findUnique({ where: { userId } });
    if (!scholar) throw new NotFoundException('Scholar profile not found');
    if (scholar.claimStatus !== 'APPROVED') throw new ForbiddenException('Profile must be approved before you can edit it');
    let pictureUrl = scholar.pictureUrl;
    if (pictureFile) { pictureUrl = await this.storage.uploadFile(pictureFile, 'scholars'); if (scholar.pictureUrl) this.storage.deleteFile(scholar.pictureUrl).catch(() => {}); }
    return this.prisma.scholar.update({ where: { id: scholar.id }, data: { ...(dto.name?.trim() && { name: dto.name.trim() }), ...(dto.biography !== undefined && { biography: dto.biography?.trim() || null }), pictureUrl }, include: { _count: { select: { books: true } } } });
  }

  // ── Admin: application review ─────────────────────────────────────────
  async listApplications(status?: string) {
    return this.prisma.scholar.findMany({
      where: { claimStatus: status ? (status as any) : { not: null } },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approveApplication(scholarId: string, note?: string) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id: scholarId } });
    if (!scholar) throw new NotFoundException('Scholar not found');
    if (!scholar.userId) throw new BadRequestException('This scholar has no user account');
    const [updated] = await this.prisma.$transaction([
      this.prisma.scholar.update({ where: { id: scholarId }, data: { claimStatus: 'APPROVED', reviewNote: note || null }, include: { user: { select: { id: true, name: true, email: true } } } }),
      this.prisma.user.update({ where: { id: scholar.userId }, data: { role: 'SCHOLAR' } }),
    ]);
    return updated;
  }

  async rejectApplication(scholarId: string, note?: string) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id: scholarId } });
    if (!scholar) throw new NotFoundException('Scholar not found');
    return this.prisma.scholar.update({ where: { id: scholarId }, data: { claimStatus: 'REJECTED', reviewNote: note || null }, include: { user: { select: { id: true, name: true, email: true } } } });
  }

  async getApplicationStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.scholar.count({ where: { claimStatus: { not: null } } }),
      this.prisma.scholar.count({ where: { claimStatus: 'PENDING' } }),
      this.prisma.scholar.count({ where: { claimStatus: 'APPROVED' } }),
      this.prisma.scholar.count({ where: { claimStatus: 'REJECTED' } }),
    ]);
    return { total, pending, approved, rejected };
  }

  // ── Admin: CRUD ───────────────────────────────────────────────────────
  async create(dto: CreateScholarDto, pictureFile?: Express.Multer.File) {
    if (!dto.name?.trim()) throw new BadRequestException('Scholar name is required');
    let pictureUrl: string | undefined;
    if (pictureFile) pictureUrl = await this.storage.uploadFile(pictureFile, 'scholars');
    return this.prisma.scholar.create({ data: { name: dto.name.trim(), biography: dto.biography?.trim() || null, pictureUrl }, include: { _count: { select: { books: true } } } });
  }

  async findAll(search?: string) {
    return this.prisma.scholar.findMany({
      where: search?.trim() ? { name: { contains: search.trim(), mode: 'insensitive' } } : {},
      include: { _count: { select: { books: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const scholar = await this.prisma.scholar.findUnique({
      where: { id },
      include: { books: { where: { status: 'APPROVED' }, include: { volumes: true, _count: { select: { volumes: true } } }, orderBy: { createdAt: 'desc' } }, _count: { select: { books: true } } },
    });
    if (!scholar) throw new NotFoundException('Scholar not found');
    return scholar;
  }

  async update(id: string, dto: UpdateScholarDto, pictureFile?: Express.Multer.File) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id } });
    if (!scholar) throw new NotFoundException('Scholar not found');
    let pictureUrl = scholar.pictureUrl;
    if (pictureFile) { pictureUrl = await this.storage.uploadFile(pictureFile, 'scholars'); if (scholar.pictureUrl) this.storage.deleteFile(scholar.pictureUrl).catch(() => {}); }
    return this.prisma.scholar.update({ where: { id }, data: { ...(dto.name?.trim() && { name: dto.name.trim() }), ...(dto.biography !== undefined && { biography: dto.biography?.trim() || null }), pictureUrl }, include: { _count: { select: { books: true } } } });
  }

  async delete(id: string) {
    const scholar = await this.prisma.scholar.findUnique({ where: { id }, include: { books: { include: { volumes: true } } } });
    if (!scholar) throw new NotFoundException('Scholar not found');
    for (const book of scholar.books) {
      if (book.coverUrl) this.storage.deleteFile(book.coverUrl).catch(() => {});
      for (const vol of book.volumes) this.storage.deleteFile(vol.fileUrl).catch(() => {});
    }
    if (scholar.pictureUrl) this.storage.deleteFile(scholar.pictureUrl).catch(() => {});
    await this.prisma.book.deleteMany({ where: { scholarId: id } });
    await this.prisma.scholar.delete({ where: { id } });
    return { message: 'Scholar and all associated books deleted' };
  }
}
