import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class ApprovedScholarGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req  = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
    if (user.role !== 'SCHOLAR') throw new ForbiddenException('Only approved scholars can perform this action. Apply at /scholars/apply');
    const scholar = await this.prisma.scholar.findUnique({ where: { userId: user.id } });
    if (!scholar || scholar.claimStatus !== 'APPROVED') {
      throw new ForbiddenException(scholar?.claimStatus === 'PENDING' ? 'Your scholar application is still under review' : 'You do not have an approved scholar profile');
    }
    req.scholarProfile = scholar;
    return true;
  }
}
