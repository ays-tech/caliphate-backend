import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('pending-admins')
  @Roles(Role.SUPER_ADMIN)
  findPendingAdmins() {
    return this.usersService.findPendingAdmins();
  }

  @Patch(':id/approve')
  @Roles(Role.SUPER_ADMIN)
  approveAdmin(@Param('id') id: string) {
    return this.usersService.approveAdmin(id);
  }

  @Patch(':id/promote')
  @Roles(Role.SUPER_ADMIN)
  promoteToAdmin(@Param('id') id: string) {
    return this.usersService.promoteToAdmin(id);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN)
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
