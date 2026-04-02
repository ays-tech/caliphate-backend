import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScholarsService } from './scholars.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('scholars')
export class ScholarsController {
  constructor(private scholarsService: ScholarsService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.scholarsService.findAll(search);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.scholarsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('picture'))
  create(
    @Body('name') name: string,
    @Body('biography') biography: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.scholarsService.create(name, biography, file);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('picture'))
  update(
    @Param('id') id: string,
    @Body('name') name: string,
    @Body('biography') biography: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.scholarsService.update(id, name, biography, file);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN)
  delete(@Param('id') id: string) {
    return this.scholarsService.delete(id);
  }
}
