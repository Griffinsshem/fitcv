import { z } from 'zod';
import { notFound } from './errors';

const uuidSchema = z.string().uuid();

/** Validate a path id up-front so malformed ids are a 404, not a DB error. */
export function parseId(value: unknown, what = 'Resource'): string {
  const r = uuidSchema.safeParse(value);
  if (!r.success) throw notFound(what);
  return r.data;
}
