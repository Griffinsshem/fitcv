import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import * as schema from './schema';

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Neon requires TLS; sslmode=require in the URL enables it.
});

pool.on('error', (err) => logger.error({ err }, 'postgres pool error'));

export const db = drizzle(pool, { schema });
export type Db = typeof db;
