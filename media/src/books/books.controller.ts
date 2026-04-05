import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFiles, UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { BooksService } from './books.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBookDto, UpdateBookDto, CreateVolumeDto } from './books.dto';
import {
  imageUploadOptions,
  bookFileUploadOptions,
  createBookMultipartOptions,
} from '../common/config/upload.config';

@Controller('books')
export class BooksController {
  constructor(private booksService: BooksService) {}

  // ── Public ──────────────────────────────────────────────────────────

  @Get()
  @SkipThrottle()
  findAll(
    @Query('search')    search?: string,
    @Query('scholarId') scholarId?: string,
    @Query('type')      type?: string,
    @Query('language')  language?: string,
    @Query('format')    format?: string,
    @Query('page')      page?: string,
    @Query('limit')     limit?: string,
  ) {
    return this.booksService.findAll({
      search, scholarId, type, language, format,
      page:  page  ? parseInt(page)  : 1,
      limit: limit ? parseInt(limit) : 12,
    });
  }

  @Get('most-read')
  @SkipThrottle()
  findMostRead(@Query('limit') limit?: string) {
    return this.booksService.findMostRead(limit ? parseInt(limit) : 6);
  }

  @Get('recent')
  @SkipThrottle()
  findRecent(@Query('limit') limit?: string) {
    return this.booksService.findRecent(limit ? parseInt(limit) : 6);
  }

  @Get('volumes/:volumeId/download')
  @UseGuards(JwtAuthGuard)
  getSignedUrl(@Param('volumeId', ParseUUIDPipe) volumeId: string) {
    return this.booksService.getSignedVolumeUrl(volumeId);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @SkipThrottle()
  findAllAdmin(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page')   page?: string,
    @Query('limit')  limit?: string,
  ) {
    return this.booksService.findAllAdmin({
      search, status,
      page:  page  ? parseInt(page)  : 1,
      limit: limit ? parseInt(limit) : 12,
    });
  }

  @Get(':id')
  @SkipThrottle()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.findOne(id);
  }

  // ── Admin ───────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover',    maxCount: 1 },
        { name: 'bookFile', maxCount: 1 },
      ],
      createBookMultipartOptions,
    ),
  )
  create(
    @Body() body: CreateBookDto,
    @CurrentUser() user: any,
    @UploadedFiles()
    files?: { cover?: Express.Multer.File[]; bookFile?: Express.Multer.File[] },
  ) {
    const cover    = files?.cover?.[0];
    const bookFile = files?.bookFile?.[0];
    return this.booksService.create(body, user.id, cover, bookFile);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('cover', imageUploadOptions))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateBookDto,
    @CurrentUser() user: any,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    return this.booksService.update(id, body, user.id, user.role, cover);
  }

  @Post(':id/volumes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', bookFileUploadOptions))
  addVolume(
    @Param('id', ParseUUIDPipe) bookId: string,
    @Body() body: CreateVolumeDto,
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.booksService.addVolume(bookId, body, file, user.id, user.role);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.approve(id);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.reject(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.booksService.delete(id, user.id, user.role);
  }
}
