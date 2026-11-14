import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/**
 * Applies committed SQL migrations. Uses the DIRECT (non-pooled) URL because
 * migrations take advisory locks that PgBouncer transaction pooling breaks.
 * Run at deploy time, before the new server version starts.
 */
async function main() {
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL_DIRECT or DATABASE_URL is required');
    process.exit(1);
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  // dist/migrate.js -> ../drizzle ; src/db/migrate.ts -> ../../drizzle
  const candidates = [path.resolve(here, '../drizzle'), path.resolve(here, '../../drizzle')];
  const { existsSync } = await import('node:fs');
  const migrationsFolder = candidates.find((p) => existsSync(path.join(p, 'meta')));
  if (!migrationsFolder) throw new Error('Migrations folder not found');

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await migrate(drizzle(client), { migrationsFolder });
    console.warn('Migrations applied');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
