import { PrismaClient, Role, AccountStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || 'KNUST Library Administrator';

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
    await prisma.user.update({
      where: { id: existing.id },
      data: { fullName: existing.fullName || fullName, password: passwordHash, role: Role.ADMIN, status: AccountStatus.ACTIVE },
    });
    console.log(`[Seed] Admin account ensured: ${email}`);
    return;
  }

  await prisma.user.create({
    data: { fullName, email, password: passwordHash, role: Role.ADMIN, status: AccountStatus.ACTIVE },
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
    await pool.end();
  });
