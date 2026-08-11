import pg from 'pg';
import { execFileSync } from 'node:child_process';

const { Client } = pg;

const migrations = [
  '20260720211126_add_export_logs_and_widgets',
  '20260721172641_add_admin_models',
  '20260722180152_add_complaint_resolver',
  '20260730100759_add_open_library_fields',
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for database initialization.');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS exists
    `);

    if (result.rows[0].exists) {
      console.log('Prisma migration history already exists; skipping baseline.');
      return;
    }

    const schemaResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
      ) AS exists
    `);

    if (!schemaResult.rows[0].exists) {
      console.log('Database is empty; Prisma migrations will initialize it normally.');
      return;
    }

    console.log('Existing database detected without Prisma migration history.');
    console.log('Baselining the four migrations already represented by the existing schema...');
  } finally {
    await client.end();
  }

  for (const migration of migrations) {
    console.log(`Marking migration as applied: ${migration}`);
    execFileSync('npx', ['prisma', 'migrate', 'resolve', '--applied', migration], {
      stdio: 'inherit',
      env: process.env,
    });
  }

  console.log('Database baseline completed.');
}

main().catch((error) => {
  console.error('Database baseline failed:', error);
  process.exit(1);
});
