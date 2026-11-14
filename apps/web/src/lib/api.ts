import type { ApiError } from '@fitcv/shared';

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

/**
 * Same-origin fetch wrapper. Requests go to /api/* on the web domain and are
 * proxied to the API, so the session cookie is first-party and httpOnly.
 * The custom CSRF header is required by the API for state-changing calls.
 */
export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: {
      'x-fitcv-csrf': '1',
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as T | ApiError | null;
  if (!res.ok) {
    const err = (body as ApiError | null)?.error;
    // Render's free tier sleeps; the first request can hit a 502/504 while it wakes.
    const fallback =
      res.status >= 502
        ? 'The server is waking up. Please try again in a few seconds.'
        : 'Request failed.';
    throw new ApiClientError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? fallback,
      err?.details,
    );
  }
  return body as T;
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}
