import {
  Injectable, CanActivate, ExecutionContext,
  ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BookOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req    = context.switchToHttp().getRequest();
    const user   = req.user;
    const bookId = req.params.id;

    if (!user)   throw new ForbiddenException('Authentication required');
    if (!bookId) return true; // no book ID in route — let controller handle

    // Admins can manage any book
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    if (book.uploadedById !== user.id) {
      throw new ForbiddenException('You can only edit your own books');
    }

    req.book = book; // attach for controller reuse
    return true;
  }
}
