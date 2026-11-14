import type { NextFunction, Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../config/env';
import { forbidden } from '../lib/errors';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER = 'x-fitcv-csrf';

/**
 * CSRF defence in depth, on top of SameSite=Lax cookies:
 *  1. State-changing requests must carry a custom header. Browsers cannot
 *     send custom headers cross-site without a CORS preflight, which this API
 *     never approves (it has no CORS policy at all).
 *  2. If an Origin header is present it must be one of our web origins.
 */
export function csrfGuard(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get(CSRF_HEADER) !== '1') return next(forbidden('Missing CSRF header.'));
  const origin = req.get('origin');
  if (origin && !env.WEB_ORIGIN.includes(origin.replace(/\/$/, ''))) {
    return next(forbidden('Origin not allowed.'));
  }
  next();
}

const json429 = (message: string) => ({
  error: { code: 'RATE_LIMITED', message },
});

/** Key by user when signed in, otherwise by client IP (IPv6 /64 aware). */
const userOrIpKey = (req: Request) =>
  req.user ? `u:${req.user.id}` : `ip:${ipKeyGenerator(req.ip ?? '')}`;

// NOTE: in-memory stores are correct for a single instance. When scaling to
// multiple instances, plug a shared store (e.g. rate-limit-redis) in here.
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: json429('Too many requests. Please slow down.'),
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: json429('Too many sign-in attempts. Try again in a few minutes.'),
});

/** Burst limit on expensive AI endpoints (the daily quota is enforced separately). */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 6,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: json429('You are generating too quickly. Wait a minute and try again.'),
});
