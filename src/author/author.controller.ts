import {
  Controller, Post, Get, Patch, Param, Body,
  UseGuards, UseInterceptors, UploadedFile,
  ParseUUIDPipe, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthorService } from './author.service';
import { ApplyAuthorDto, UpdateAuthorProfileDto } from './dto/author.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { imageUploadOptions } from '../common/upload.config';

// ── Author self-service routes ────────────────────────────────────────
@Controller('author')
export class AuthorController {
  constructor(private authorService: AuthorService) {}

  /**
   * POST /api/author/apply
   * Any logged-in user can apply to become an author.
   * Rejected users can re-apply.
   */
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  apply(
    @Body() dto: ApplyAuthorDto,
    @CurrentUser() user: any,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authorService.apply(user.id, dto, avatar);
  }

  /**
   * GET /api/author/me
   * Returns the current user's author profile + their books.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  getMyProfile(@CurrentUser() user: any) {
    return this.authorService.getMyProfile(user.id);
  }

  /**
   * PATCH /api/author/me
   * Update own profile (pen name, bio, avatar).
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', imageUploadOptions))
  updateMyProfile(
    @Body() dto: UpdateAuthorProfileDto,
    @CurrentUser() user: any,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.authorService.updateMyProfile(user.id, dto, avatar);
  }

  /**
   * GET /api/author/:id
   * Public: view an approved author's profile and books.
   */
  @Get(':id')
  @SkipThrottle()
  getPublicProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.authorService.getPublicProfile(id);
  }
}

// ── Admin author management routes ────────────────────────────────────
@Controller('admin/authors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminAuthorController {
  constructor(private authorService: AuthorService) {}

  /**
   * GET /api/admin/authors/pending
   * List pending (or filtered) author applications.
   */
  @Get('pending')
  @SkipThrottle()
  listPending(@Query('status') status?: string) {
    return this.authorService.listPending(status);
  }

  /**
   * GET /api/admin/authors/stats
   */
  @Get('stats')
  @SkipThrottle()
  getStats() {
    return this.authorService.getStats();
  }

  /**
   * PATCH /api/admin/authors/:id/approve
   */
  @Patch(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('note') note?: string,
  ) {
    return this.authorService.approve(id, note);
  }

  /**
   * PATCH /api/admin/authors/:id/reject
   */
  @Patch(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('note') note?: string,
  ) {
    return this.authorService.reject(id, note);
  }
}
