import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ScholarsService } from './scholars.service';
import { ApplyScholarDto, UpdateScholarProfileDto, CreateScholarDto, UpdateScholarDto } from './dto/scholar.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { imageUploadOptions } from '../common/upload.config';

@Controller('scholars')
export class ScholarsController {
  constructor(private scholarsService: ScholarsService) {}

  @Get() @SkipThrottle()
  findAll(@Query('search') search?: string) { return this.scholarsService.findAll(search); }

  @Get('me/profile') @UseGuards(JwtAuthGuard) @SkipThrottle()
  getMyProfile(@CurrentUser() user: any) { return this.scholarsService.getMyProfile(user.id); }

  @Patch('me/profile') @UseGuards(JwtAuthGuard) @UseInterceptors(FileInterceptor('picture', imageUploadOptions))
  updateMyProfile(@Body() dto: UpdateScholarProfileDto, @CurrentUser() user: any, @UploadedFile() pic?: Express.Multer.File) {
    return this.scholarsService.updateMyProfile(user.id, dto, pic);
  }

  @Post('apply') @UseGuards(JwtAuthGuard) @UseInterceptors(FileInterceptor('picture', imageUploadOptions))
  apply(@Body() dto: ApplyScholarDto, @CurrentUser() user: any, @UploadedFile() pic?: Express.Multer.File) {
    return this.scholarsService.apply(user.id, dto, pic);
  }

  @Get(':id') @SkipThrottle()
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.scholarsService.findOne(id); }

  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.SUPER_ADMIN) @UseInterceptors(FileInterceptor('picture', imageUploadOptions))
  create(@Body() dto: CreateScholarDto, @UploadedFile() pic?: Express.Multer.File) { return this.scholarsService.create(dto, pic); }

  @Put(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.SUPER_ADMIN) @UseInterceptors(FileInterceptor('picture', imageUploadOptions))
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateScholarDto, @UploadedFile() pic?: Express.Multer.File) { return this.scholarsService.update(id, dto, pic); }

  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.SUPER_ADMIN)
  delete(@Param('id', ParseUUIDPipe) id: string) { return this.scholarsService.delete(id); }
}

@Controller('admin/scholars') @UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class AdminScholarApplicationController {
  constructor(private scholarsService: ScholarsService) {}

  @Get('applications') @SkipThrottle()
  list(@Query('status') status?: string) { return this.scholarsService.listApplications(status || 'PENDING'); }

  @Get('application-stats') @SkipThrottle()
  stats() { return this.scholarsService.getApplicationStats(); }

  @Patch(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Body('note') note?: string) { return this.scholarsService.approveApplication(id, note); }

  @Patch(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body('note') note?: string) { return this.scholarsService.rejectApplication(id, note); }
}
