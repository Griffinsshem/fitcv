import { createHash, randomBytes } from 'node:crypto';

/** 256-bit random, URL-safe session token. */
export const newSessionToken = (): string => randomBytes(32).toString('base64url');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');
