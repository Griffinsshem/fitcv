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
  ) {
    super(message);
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
      );
      if (!retryable) break;
    } catch (err) {
      lastErr = new AiUpstreamError(`AI provider network error: ${(err as Error).message}`, true);
    }
    if (i < attempts - 1) await sleep(1000 * 2 ** i + Math.random() * 300);
  }
  throw lastErr;
}

let providerPromise: Promise<AiProvider> | null = null;

export async function getProvider(): Promise<AiProvider> {
  if (env.AI_PROVIDER === 'anthropic' && !env.ANTHROPIC_API_KEY) {
    throw serviceUnavailable(
      'AI_NOT_CONFIGURED',
      'AI is not configured yet (missing ANTHROPIC_API_KEY).',
    );
  }
  if (env.AI_PROVIDER === 'gemini' && !env.GEMINI_API_KEY) {
    throw serviceUnavailable(
      'AI_NOT_CONFIGURED',
      'AI is not configured yet (missing GEMINI_API_KEY).',
    );
  }
  providerPromise ??=
    env.AI_PROVIDER === 'anthropic'
      ? import('./anthropic').then((m) => new m.AnthropicProvider())
      : import('./gemini').then((m) => new m.GeminiProvider());
  return providerPromise;
}

export function isAiConfigured(): boolean {
  return env.AI_PROVIDER === 'anthropic' ? !!env.ANTHROPIC_API_KEY : !!env.GEMINI_API_KEY;
}

/**
 * Ask the model for output matching `schema`. Output is ALWAYS validated with
 * zod — model output is untrusted input. On invalid output we retry once,
 * feeding the validation errors back to the model.
 */
export async function generateStructured<T extends z.ZodType>(
  req: StructuredRequest<T>,
): Promise<{ data: z.infer<T>; usage: AiUsage }> {
  const provider = await getProvider();
  const jsonSchema = z.toJSONSchema(req.schema, { io: 'input', unrepresentable: 'any' }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;

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

    const parsed = req.schema.safeParse(r.output);
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
