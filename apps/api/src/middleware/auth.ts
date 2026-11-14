import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { and, eq, gt } from 'drizzle-orm';
import { env, isProd } from '../config/env';
import { db } from '../db/client';
import { sessions, users, type User } from '../db/schema';
import { hashToken } from '../lib/crypto';
import { unauthorized } from '../lib/errors';

/**
 * Sessions are opaque random tokens in an httpOnly cookie; only their SHA-256
 * hash is stored. Unlike JWTs they can be revoked instantly (logout,
 * "sign out everywhere", account deletion).
 *
 * The `__Host-` prefix forces Secure + Path=/ + no Domain, so the cookie is
 * bound to the exact web origin (the API is reached through a same-origin
 * proxy on the web app's domain).
 */
export const SESSION_COOKIE = isProd ? '__Host-fitcv_session' : 'fitcv_session';

export const sessionCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/',
  maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
});

const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    sessionId?: string;
  }
}

export async function loadSession(req: Request, _res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return next();

  const now = new Date();
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, now)))
    .limit(1);

  if (row) {
    req.user = row.user;
    req.sessionId = row.session.id;
    // Avoid a DB write on every request: touch at most once per hour.
    if (now.getTime() - row.session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
      void db
        .update(sessions)
        .set({ lastUsedAt: now })
        .where(eq(sessions.id, row.session.id))
        .catch(() => undefined);
    }
  }
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  next();
}

/** Narrow `req.user` after requireAuth. */
export function currentUser(req: Request): User {
  if (!req.user) throw unauthorized();
  return req.user;
}
