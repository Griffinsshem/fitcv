import { Router } from 'express';
import { and, eq, ne } from 'drizzle-orm';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import type { MeResponse } from '@fitcv/shared';
import { env } from '../../config/env';
import { db } from '../../db/client';
import { sessions, users } from '../../db/schema';
import { hashToken, newSessionToken } from '../../lib/crypto';
import { unauthorized } from '../../lib/errors';
import {
  currentUser,
  requireAuth,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '../../middleware/auth';
import { authLimiter } from '../../middleware/security';
import { aiCallsInLastDay } from '../jobs/quota';

const google = new OAuth2Client();

const GoogleLoginSchema = z.object({ credential: z.string().min(100).max(4096) });

export const authRouter = Router();

/**
 * Sign in with Google. The browser obtains a Google ID token (JWT) via
 * Google Identity Services and posts it here; we verify its signature,
 * audience (our client id), issuer and expiry with Google's public keys.
 * No Google client secret is needed and no Google access token is stored.
 */
authRouter.post('/google', authLimiter, async (req, res) => {
  const { credential } = GoogleLoginSchema.parse(req.body);

  let payload;
  try {
    const ticket = await google.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('Google sign-in could not be verified. Please try again.');
  }
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw unauthorized('Your Google account email must be verified.');
  }

  const email = payload.email.toLowerCase();
  const profile = {
    email,
    name: (payload.name ?? '').slice(0, 120),
    avatarUrl: payload.picture?.startsWith('https://') ? payload.picture.slice(0, 500) : null,
    lastLoginAt: new Date(),
  };

  // Upsert keyed on Google's stable subject id (emails can change).
  const [user] = await db
    .insert(users)
    .values({ googleSub: payload.sub, ...profile })
    .onConflictDoUpdate({ target: users.googleSub, set: profile })
    .returning();

  const token = newSessionToken();
  await db.insert(sessions).values({
    userId: user!.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    userAgent: (req.get('user-agent') ?? '').slice(0, 256),
  });

  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
  res.json({ ok: true });
});

authRouter.post('/logout', async (req, res) => {
  if (req.sessionId) await db.delete(sessions).where(eq(sessions.id, req.sessionId));
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

/** Revoke every other session (e.g. after signing in on a shared computer). */
authRouter.post('/logout-others', requireAuth, async (req, res) => {
  const user = currentUser(req);
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, user.id), ne(sessions.id, req.sessionId!)));
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = currentUser(req);
  const body: MeResponse = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
    },
    usage: { aiCallsToday: await aiCallsInLastDay(user.id), aiDailyLimit: env.AI_DAILY_LIMIT },
  };
  res.set('Cache-Control', 'no-store').json(body);
});

/** Permanently delete the account and all data (cascades). */
authRouter.delete('/me', requireAuth, async (req, res) => {
  const user = currentUser(req);
  await db.delete(users).where(eq(users.id, user.id));
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});
