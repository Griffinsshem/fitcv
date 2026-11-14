import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { sql } from 'drizzle-orm';
import { env } from './config/env';
import { db } from './db/client';
import { logger } from './lib/logger';
import { loadSession, requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { csrfGuard, globalLimiter } from './middleware/security';
import { applicationsRouter } from './modules/applications/routes';
import { authRouter } from './modules/auth/routes';
import { jobsRouter } from './modules/jobs/routes';
import { profileRouter } from './modules/profile/routes';
import { isAiConfigured } from './modules/ai/provider';

export function createApp() {
  const app = express();

  // Behind Vercel's proxy and Render's load balancer: trust exactly N hops so
  // req.ip is the real client and X-Forwarded-For cannot be spoofed further.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // JSON API only: strict security headers, nothing is ever framed or sniffed.
  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );

  // Liveness and readiness probes (no auth, no rate limit).
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      await db.execute(sql`select 1`);
      res.json({ status: 'ready', db: 'ok', ai: isAiConfigured() ? 'configured' : 'missing' });
    } catch {
      res.status(503).json({ status: 'unavailable', db: 'error' });
    }
  });

  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  const api = Router();
  api.use(loadSession);
  api.use(globalLimiter);
  api.use(csrfGuard);

  api.use('/auth', authRouter);
  api.use('/profile', requireAuth, profileRouter);
  api.use('/applications', requireAuth, applicationsRouter);
  api.use('/jobs', requireAuth, jobsRouter);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
