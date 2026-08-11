import { PrismaClient, Role, AccountStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedLibrarySettings() {
  const existing = await prisma.librarySetting.findFirst();
  if (existing) {
    console.log('[Seed] Library settings already exist; preserving current configuration.');
    return;
  }

  await prisma.librarySetting.create({
    data: {
      libraryName: 'KNUST Library',
      institution: 'Kwame Nkrumah University of Science and Technology',
      address: 'Kumasi, Ghana',
      phone: '+233 32 206 0000',
      email: 'library@knust.edu.gh',
      website: 'https://library.knust.edu.gh',
      maxBooksPerStudent: 5,
      maxBooksPerStaff: 10,
      loanDurationDays: 14,
      renewalLimit: 1,
      fineRatePerDay: 2.0,
      maxFineAmount: 50.0,
      lostBookDaysThreshold: 90,
      lostBookFee: 150.0,
      gracePeriodDays: 3,
      openingHours: {
        Monday: { open: '09:00', close: '22:00', closed: false },
        Tuesday: { open: '09:00', close: '22:00', closed: false },
        Wednesday: { open: '09:00', close: '22:00', closed: false },
        Thursday: { open: '09:00', close: '22:00', closed: false },
        Friday: { open: '09:00', close: '22:00', closed: false },
        Saturday: { open: '09:00', close: '20:00', closed: false },
        Sunday: { open: '00:00', close: '00:00', closed: true }
      }
    }
  });
  console.log('[Seed] Default KNUST library settings created.');
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME?.trim() || 'KNUST Library Administrator';

  if (!email || !password) {
    console.log('[Seed] ADMIN_EMAIL or ADMIN_PASSWORD is not configured; skipping admin seed.');
    return;
  }
  if (password.length < 12) throw new Error('[Seed] ADMIN_PASSWORD must be at least 12 characters long.');

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { fullName: existing.fullName || fullName, password: passwordHash, role: Role.ADMIN, status: AccountStatus.ACTIVE } });
    console.log(`[Seed] Admin account ensured: ${email}`);
    return;
  }
  await prisma.user.create({ data: { fullName, email, password: passwordHash, role: Role.ADMIN, status: AccountStatus.ACTIVE } });
  console.log(`[Seed] Admin account created: ${email}`);
}

async function main() {
  await seedLibrarySettings();
  await seedAdmin();
}

main()
  .catch((error) => { console.error('[Seed] Failed:', error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
