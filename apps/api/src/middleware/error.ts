import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

/**
 * Single place that turns errors into responses. Expected errors (AppError,
 * validation) return their message; unexpected errors are logged with the
 * stack and the client only sees a generic message plus a request id.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = String(req.id ?? '');

  if (err instanceof AppError) {
    if (err.status >= 500) req.log?.warn({ code: err.code }, err.message);
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, requestId },
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        requestId,
      },
    });
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 4 MB).' : 'Invalid file upload.';
    return res.status(400).json({ error: { code: 'BAD_UPLOAD', message, requestId } });
  }
  // body-parser errors (malformed JSON, payload too large)
  if (typeof err === 'object' && err && 'type' in err && 'status' in err) {
    const status = Number((err as { status: number }).status) || 400;
    return res.status(status).json({
      error: { code: 'BAD_REQUEST', message: 'Malformed or too-large request body.', requestId },
    });
  }

  (req.log ?? logger).error({ err }, 'unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'Something went wrong on our side. Please try again.',
      requestId,
    },
  });
}
