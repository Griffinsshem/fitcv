import { z } from 'zod';
import { env } from '../../config/env';
import { AppError, serviceUnavailable } from '../../lib/errors';
import { logger } from '../../lib/logger';

export interface AiUsage {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface StructuredRequest<T extends z.ZodType> {
  system: string;
  prompt: string;
  schema: T;
  /** Name for the structured output (used as tool name for Anthropic). */
  name: string;
  maxTokens?: number;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  /** Returns raw JSON text/object as produced by the model, plus usage. */
  complete(req: {
    system: string;
    prompt: string;
    jsonSchema: Record<string, unknown>;
    name: string;
    maxTokens: number;
  }): Promise<{ output: unknown; inputTokens: number; outputTokens: number }>;
}

export class AiUpstreamError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    /** Upstream HTTP status, if the provider answered at all. */
    public readonly status?: number,
  ) {
    super(message);
  }

  /** Provider is overloaded or rate-limiting us: worth trying another model. */
  get isCapacity(): boolean {
    return this.status === 429 || this.status === 503 || this.status === 529;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch with timeout + bounded retries on 429/5xx/network errors. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { attempts = 3 }: { attempts?: number } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(env.AI_TIMEOUT_MS) });
      if (res.ok) return res;
      const retryable = res.status === 429 || res.status >= 500;
      const body = await res.text().catch(() => '');
      // Upstream bodies can echo request content — log only a short prefix.
      lastErr = new AiUpstreamError(
        `AI provider HTTP ${res.status}: ${body.slice(0, 200)}`,
        retryable,
        res.status,
      );
      if (!retryable) break;
    } catch (err) {
      lastErr = new AiUpstreamError(`AI provider network error: ${(err as Error).message}`, true);
    }
    if (i < attempts - 1) await sleep(1000 * 2 ** i + Math.random() * 300);
  }
  throw lastErr;
}

/**
 * Bring model output within the schema's size limits before validation:
 * truncates over-long strings and arrays, and turns `null` into "missing"
 * so zod defaults apply. Models that were not given the limits (Gemini's
 * simplified schema) would otherwise fail validation on trivia like a bullet
 * that is a few characters too long.
 */
export function clampToSchema(value: unknown, schema: unknown): unknown {
  if (!schema || typeof schema !== 'object') return value;
  const s = schema as Record<string, unknown>;
  if (value === null) return undefined;
  if (typeof value === 'string' && typeof s.maxLength === 'number') {
    return value.trim().slice(0, s.maxLength);
  }
  if (Array.isArray(value)) {
    const items = value
      .map((v) => clampToSchema(v, s.items))
      .filter((v) => v !== undefined && v !== '');
    return typeof s.maxItems === 'number' ? items.slice(0, s.maxItems) : items;
  }
  if (typeof value === 'object' && value && s.properties && typeof s.properties === 'object') {
    const props = s.properties as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const c = clampToSchema(v, props[k]);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return value;
}

const cache = new Map<'anthropic' | 'gemini', Promise<AiProvider>>();

function load(name: 'anthropic' | 'gemini'): Promise<AiProvider> {
  let p = cache.get(name);
  if (!p) {
    p =
      name === 'anthropic'
        ? import('./anthropic').then((m) => new m.AnthropicProvider())
        : import('./gemini').then((m) => new m.GeminiProvider());
    cache.set(name, p);
  }
  return p;
}

const hasKey = (name: 'anthropic' | 'gemini') =>
  name === 'anthropic' ? !!env.ANTHROPIC_API_KEY : !!env.GEMINI_API_KEY;

export async function getProvider(): Promise<AiProvider> {
  if (!hasKey(env.AI_PROVIDER)) {
    const key = env.AI_PROVIDER === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY';
    throw serviceUnavailable('AI_NOT_CONFIGURED', `AI is not configured yet (missing ${key}).`);
  }
  return load(env.AI_PROVIDER);
}

/**
 * Primary provider first; if the other provider's key is also configured it
 * becomes an automatic backup for outages and overload (e.g. Gemini free tier
 * returning 503 "high demand").
 */
export async function getProviderChain(): Promise<AiProvider[]> {
  const chain = [await getProvider()];
  const other = env.AI_PROVIDER === 'anthropic' ? 'gemini' : 'anthropic';
  if (hasKey(other)) chain.push(await load(other));
  return chain;
}

/** Errors where trying a different provider is worthwhile. */
function shouldTryNextProvider(err: unknown): boolean {
  if (!(err instanceof AiUpstreamError)) return false;
  return (
    err.isCapacity || err.status === undefined || (err.status ?? 0) >= 500 || err.status === 404
  );
}

export function isAiConfigured(): boolean {
  return hasKey(env.AI_PROVIDER);
}

/**
 * Ask the model for output matching `schema`. Output is ALWAYS validated with
 * zod — model output is untrusted input. On invalid output we retry once,
 * feeding the validation errors back to the model.
 */
export async function generateStructured<T extends z.ZodType>(
  req: StructuredRequest<T>,
): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  const chain = await getProviderChain();
  const jsonSchema = z.toJSONSchema(req.schema, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;

  let lastErr: unknown;
  for (const [i, provider] of chain.entries()) {
    try {
      return await runWithProvider(provider, req, jsonSchema);
    } catch (err) {
      lastErr = err;
      if (i === chain.length - 1 || !shouldTryNextProvider(err)) throw err;
      logger.warn(
        { from: provider.name, to: chain[i + 1]?.name, status: (err as AiUpstreamError).status },
        'AI provider unavailable, switching to backup provider',
      );
    }
  }
  throw lastErr;
}

async function runWithProvider<T extends z.ZodType>(
  provider: AiProvider,
  req: StructuredRequest<T>,
  jsonSchema: Record<string, unknown>,
): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  let prompt = req.prompt;
  let inputTokens = 0;
  let outputTokens = 0;

  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await provider.complete({
      system: req.system,
      prompt,
      jsonSchema,
      name: req.name,
      maxTokens: req.maxTokens ?? 4096,
    });
    inputTokens += r.inputTokens;
    outputTokens += r.outputTokens;

    const parsed = req.schema.safeParse(clampToSchema(r.output, jsonSchema));
    if (parsed.success) {
      return {
        data: parsed.data,
        usage: { provider: provider.name, model: provider.model, inputTokens, outputTokens },
      };
    }
    const issues = parsed.error.issues
      .slice(0, 10)
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; ');
    logger.warn({ name: req.name, issues }, 'AI output failed validation');
    prompt = `${req.prompt}\n\nYour previous answer was invalid: ${issues}. Return corrected output that satisfies the schema exactly.`;
  }
  throw new AppError(502, 'AI_BAD_OUTPUT', 'The AI returned an unusable answer. Please try again.');
}
