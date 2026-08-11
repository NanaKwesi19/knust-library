import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const hashedPassword = await bcrypt.hash('admin123', 12);

const admin = await prisma.user.upsert({
  where: { email: 'admin@knust.edu.gh' },
  update: {},
  create: {
    fullName: 'System Administrator',
    email: 'admin@knust.edu.gh',
    password: hashedPassword,
    role: 'ADMIN',
    status: 'ACTIVE',
  },
});

console.log('Admin created:', admin.email);
console.log('Password: admin123');

await prisma.$disconnect();