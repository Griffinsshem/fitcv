import pino from 'pino';
import { env, isProd } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'fitcv-api' },
  // Defence in depth: never let secrets or CV content reach the logs.
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'res.headers["set-cookie"]',
      '*.credential',
      '*.token',
      '*.apiKey',
    ],
    censor: '[redacted]',
  },
  ...(isProd || env.NODE_ENV === 'test'
    ? {}
    : { transport: { target: 'pino-pretty', options: { colorize: true } } }),
});
