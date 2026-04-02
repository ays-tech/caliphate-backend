import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(name: string, email: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(password, 10);
    await this.prisma.user.create({
      data: { name, email, password: hashed },
    });

    return { message: 'Registered successfully. Await approval to access admin features.' };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.role === 'ADMIN' && !user.approved) {
      throw new UnauthorizedException('Your account is pending approval by super admin');
    }

    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '7d' },
    );

    return {
      access_token: token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        approved: user.approved,
      },
    };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where:  { id: userId },
      select: { id: true, name: true, email: true, role: true, approved: true, createdAt: true },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // Verify current password
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    // Prevent reusing the same password
    const same = await bcrypt.compare(newPassword, user.password);
    if (same) throw new BadRequestException('New password must be different from your current password');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data:  { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }
}
