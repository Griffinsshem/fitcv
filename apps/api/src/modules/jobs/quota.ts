import { and, count, eq, gt, ne } from 'drizzle-orm';
import { env } from '../../config/env';
import { db } from '../../db/client';
import { aiJobs } from '../../db/schema';
import { tooMany } from '../../lib/errors';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * AI usage per rolling 24h. Failed jobs do not count against the user.
 * This is the hook where paid hourly/daily passes will plug in later:
 * swap the fixed limit for an entitlement lookup.
 */
export async function aiCallsInLastDay(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.userId, userId),
        gt(aiJobs.createdAt, new Date(Date.now() - DAY_MS)),
        ne(aiJobs.status, 'FAILED'),
      ),
    );
  return row?.n ?? 0;
}

export async function assertAiQuota(userId: string): Promise<void> {
  if (env.AI_DAILY_LIMIT === 0) return; // 0 = unlimited
  const used = await aiCallsInLastDay(userId);
  if (used >= env.AI_DAILY_LIMIT) {
    throw tooMany(
      `You've used all ${env.AI_DAILY_LIMIT} AI generations for the last 24 hours. Try again later.`,
    );
  }
}
