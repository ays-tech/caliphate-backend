import {
  Injectable, NotFoundException, ConflictException,
  ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ApplyAuthorDto, UpdateAuthorProfileDto } from './dto/author.dto';

@Injectable()
export class AuthorService {
  constructor(
    private prisma:   PrismaService,
    private storage:  StorageService,
  ) {}

  // ── Apply to become an author ──────────────────────────────────────
  async apply(userId: string, dto: ApplyAuthorDto, avatarFile?: Express.Multer.File) {
    // One profile per user
    const existing = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (existing) {
      if (existing.status === 'REJECTED') {
        // Allow re-application after rejection — update existing
        let avatarUrl = existing.avatarUrl;
        if (avatarFile) avatarUrl = await this.storage.uploadFile(avatarFile, 'avatars');
        return this.prisma.authorProfile.update({
          where: { userId },
          data: {
            penName:    dto.penName,
            bio:        dto.bio?.trim() || null,
            avatarUrl,
            status:     'PENDING',
            reviewNote: null,
          },
          include: { user: { select: { id: true, name: true, email: true } } },
        });
      }
      throw new ConflictException(
        existing.status === 'PENDING'
          ? 'Your author application is already under review'
          : 'You already have an approved author profile',
      );
    }

    let avatarUrl: string | undefined;
    if (avatarFile) avatarUrl = await this.storage.uploadFile(avatarFile, 'avatars');

    return this.prisma.authorProfile.create({
      data: {
        userId,
        penName:  dto.penName,
        bio:      dto.bio?.trim() || null,
        avatarUrl,
        status:   'PENDING',
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  // ── Get current user's profile ────────────────────────────────────
  async getMyProfile(userId: string) {
    const profile = await this.prisma.authorProfile.findUnique({
      where:   { userId },
      include: {
        user:  { select: { id: true, name: true, email: true, role: true } },
        books: {
          orderBy: { createdAt: 'desc' },
          take:    10,
          select: {
            id: true, title: true, status: true, coverUrl: true,
            language: true, format: true, createdAt: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('No author profile found. Apply at POST /api/author/apply');
    return profile;
  }

  // ── Update own profile ────────────────────────────────────────────
  async updateMyProfile(
    userId:    string,
    dto:       UpdateAuthorProfileDto,
    avatarFile?: Express.Multer.File,
  ) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Author profile not found');

    let avatarUrl = profile.avatarUrl;
    if (avatarFile) {
      avatarUrl = await this.storage.uploadFile(avatarFile, 'avatars');
      if (profile.avatarUrl) this.storage.deleteFile(profile.avatarUrl).catch(() => {});
    }

    return this.prisma.authorProfile.update({
      where: { userId },
      data: {
        ...(dto.penName?.trim() && { penName: dto.penName.trim() }),
        ...(dto.bio !== undefined && { bio: dto.bio.trim() || null }),
        avatarUrl,
      },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  // ── Admin: list pending author applications ───────────────────────
  async listPending(status?: string) {
    return this.prisma.authorProfile.findMany({
      where:   { status: (status as any) || 'PENDING' },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Admin: approve author ─────────────────────────────────────────
  async approve(profileId: string, note?: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Author profile not found');

    // Update profile status AND promote user role to AUTHOR
    const [updatedProfile] = await this.prisma.$transaction([
      this.prisma.authorProfile.update({
        where: { id: profileId },
        data:  { status: 'APPROVED', reviewNote: note || null },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.user.update({
        where: { id: profile.userId },
        data:  { role: 'AUTHOR' },
      }),
    ]);

    return updatedProfile;
  }

  // ── Admin: reject author ──────────────────────────────────────────
  async reject(profileId: string, note?: string) {
    const profile = await this.prisma.authorProfile.findUnique({ where: { id: profileId } });
    if (!profile) throw new NotFoundException('Author profile not found');

    return this.prisma.authorProfile.update({
      where: { id: profileId },
      data:  { status: 'REJECTED', reviewNote: note || null },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  // ── Get public author profile by id ──────────────────────────────
  async getPublicProfile(profileId: string) {
    const profile = await this.prisma.authorProfile.findUnique({
      where:   { id: profileId },
      include: {
        user:  { select: { id: true, name: true } },
        books: {
          where:   { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          include: { scholar: { select: { id: true, name: true } } },
        },
      },
    });
    if (!profile || profile.status !== 'APPROVED') {
      throw new NotFoundException('Author not found');
    }
    return profile;
  }

  // ── Stats for admin dashboard ─────────────────────────────────────
  async getStats() {
    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.authorProfile.count(),
      this.prisma.authorProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.authorProfile.count({ where: { status: 'APPROVED' } }),
      this.prisma.authorProfile.count({ where: { status: 'REJECTED' } }),
    ]);
    return { total, pending, approved, rejected };
  }
}
