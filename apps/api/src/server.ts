import { createApp } from './app';
import { env } from './config/env';
import { pool } from './db/client';
import { logger } from './lib/logger';
import { housekeeping, recoverStaleJobs } from './modules/jobs/runner';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV, ai: env.AI_PROVIDER }, 'fitcv api listening');
});

// Slow AI jobs run in the background, so HTTP requests stay short.
server.requestTimeout = 60_000;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 61_000;

void recoverStaleJobs().catch((err) => logger.error({ err }, 'stale job recovery failed'));
const housekeepingTimer = setInterval(
  () => void housekeeping().catch((err) => logger.error({ err }, 'housekeeping failed')),
  60 * 60 * 1000,
);
housekeepingTimer.unref();

let shuttingDown = false;
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');
  server.close(async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  });
  // Hard exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 20_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => logger.error({ err }, 'unhandled rejection'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception');
  shutdown('uncaughtException');
});
