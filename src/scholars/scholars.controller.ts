import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query,
  UseGuards, UseInterceptors, UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle } from '@nestjs/throttler';
import { ScholarsService } from './scholars.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateScholarDto, UpdateScholarDto } from './scholars.dto';
import { imageUploadOptions } from '../common/config/upload.config';

@Controller('scholars')
export class ScholarsController {
  constructor(private scholarsService: ScholarsService) {}

  @Get()
  @SkipThrottle()
  findAll(@Query('search') search?: string) {
    return this.scholarsService.findAll(search);
  }

  @Get(':id')
  @SkipThrottle()
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.scholarsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('picture', imageUploadOptions))
  create(
    @Body() body: CreateScholarDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.scholarsService.create(body.name, body.biography, file);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('picture', imageUploadOptions))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateScholarDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.scholarsService.update(id, body.name, body.biography, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.scholarsService.delete(id);
  }
}
