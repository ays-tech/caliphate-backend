import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Allows only users who are:
 *   1. role = AUTHOR (or ADMIN / SUPER_ADMIN who bypass)
 *   2. Have an AuthorProfile with status = APPROVED
 *
 * Admins always pass — they don't need an author profile.
 */
@Injectable()
export class ApprovedAuthorGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req  = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) throw new ForbiddenException('Authentication required');

    // Admins bypass author checks
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

    if (user.role !== 'AUTHOR') {
      throw new ForbiddenException(
        'You must be an approved author to perform this action. Apply at /author/apply',
      );
    }

    const profile = await this.prisma.authorProfile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new ForbiddenException(
        'Author profile not found. Apply at /author/apply',
      );
    }

    if (profile.status !== 'APPROVED') {
      throw new ForbiddenException(
        `Your author profile is ${profile.status.toLowerCase()}. ` +
        (profile.status === 'PENDING'
          ? 'Please wait for admin approval.'
          : 'Please contact support.'),
      );
    }

    // Attach profile to request for use in controllers
    req.authorProfile = profile;
    return true;
  }
}
