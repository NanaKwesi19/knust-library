import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log('[Seed] ADMIN_EMAIL or ADMIN_PASSWORD is not configured; skipping admin seed.');
    return;
  }

  if (password.length < 12) {
    throw new Error('[Seed] ADMIN_PASSWORD must be at least 12 characters long.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== 'ADMIN' || existing.passwordHash !== passwordHash) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: 'ADMIN',
          passwordHash,
          isActive: true,
          emailVerified: true,
        },
      });
      console.log(`[Seed] Admin account updated: ${email}`);
    } else {
      console.log(`[Seed] Admin account already exists: ${email}`);
    }
    return;
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
    },
  });

  console.log(`[Seed] Admin account created: ${email}`);
}

main()
  .catch((error) => {
    console.error('[Seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
