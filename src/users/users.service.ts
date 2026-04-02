import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approved: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingAdmins() {
    return this.prisma.user.findMany({
      where: { role: 'ADMIN', approved: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approved: true,
        createdAt: true,
      },
    });
  }

  async approveAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'ADMIN') throw new ForbiddenException('User is not an admin');

    return this.prisma.user.update({
      where: { id: userId },
      data: { approved: true },
      select: { id: true, name: true, email: true, role: true, approved: true },
    });
  }

  async promoteToAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: 'ADMIN', approved: false },
      select: { id: true, name: true, email: true, role: true, approved: true },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'SUPER_ADMIN') throw new ForbiddenException('Cannot delete super admin');

    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'User deleted' };
  }
}
