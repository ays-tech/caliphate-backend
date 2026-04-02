import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: 'superadmin@makhtaba.com' },
  });

  if (existing) {
    console.log('Super admin already exists, skipping seed.');
    return;
  }

  const hashed = await bcrypt.hash('SuperAdmin@123', 10);

  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@makhtaba.com',
      password: hashed,
      role: Role.SUPER_ADMIN,
      approved: true,
    },
  });

  console.log('✅ Super admin seeded: superadmin@makhtaba.com / SuperAdmin@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
