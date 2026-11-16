import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import { AiUpstreamError, fetchWithRetry, type AiProvider } from './provider';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

type Req = {
  system: string;
  prompt: string;
  jsonSchema: Record<string, unknown>;
  name: string;
  maxTokens: number;
};
type Mode = 'schema' | 'json';

/** JSON-Schema keywords Gemini's constrained decoding handles well. */
const KEEP = new Set(['type', 'properties', 'items', 'enum', 'required', 'description', 'anyOf']);

/**
 * Gemini compiles the response schema into a decoding state machine and
 * rejects schemas with "too many states". Length/count limits (maxLength,
 * maxItems, …) are the main cause. We strip them here — the zod schema still
 * enforces every limit after the response comes back, so nothing is lost.
 */
export function toGeminiSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(toGeminiSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema)) {
    if (!KEEP.has(k)) continue;
    if (k === 'properties' && v && typeof v === 'object') {
      out[k] = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, toGeminiSchema(pv)]));
    } else if (k === 'items' || k === 'anyOf') {
      out[k] = toGeminiSchema(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

const isSchemaRejection = (err: unknown) =>
  err instanceof AiUpstreamError &&
  err.status === 400 &&
  /schema|too many states/i.test(err.message);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Google Gemini (generativelanguage v1beta) with JSON output.
 *
 * Resilience strategy for the free tier:
 *  - each model gets 2 quick attempts, then we fail over to the next model
 *    in GEMINI_FALLBACK_MODELS on 429/503/500/404;
 *  - if a model rejects the response schema, we retry it in plain JSON mode
 *    with the schema described in the prompt;
 *  - if every model is busy, we wait and do up to 3 rounds. This runs in a
 *    background job, so waiting costs the user nothing but time.
 */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly model = env.GEMINI_MODEL;
  private readonly models = [...new Set([env.GEMINI_MODEL, ...env.GEMINI_FALLBACK_MODELS])];

  constructor(private readonly roundDelaysMs: number[] = [10_000, 25_000]) {}

  async complete(req: Req) {
    let lastErr: unknown;
    for (let round = 0; round <= this.roundDelaysMs.length; round++) {
      let allBusy = true;
      for (const model of this.models) {
        try {
          return await this.tryModel(model, req);
        } catch (err) {
          lastErr = err;
          if (!(err instanceof AiUpstreamError)) throw err;
          const failover = err.isCapacity || err.status === 404 || err.status === 500;
          if (!failover) throw err;
          if (!err.isCapacity) allBusy = false;
          logger.warn(
            { model, status: err.status, round },
            'gemini model unavailable, failing over',
          );
        }
      }
      const delay = this.roundDelaysMs[round];
      if (!allBusy || delay === undefined) break;
      logger.warn({ round, delayMs: delay }, 'all gemini models busy, waiting before retrying');
      await sleep(delay);
    }
    throw lastErr;
  }

  /** Schema mode first; if the model rejects the schema, plain JSON mode. */
  private async tryModel(model: string, req: Req) {
    try {
      return await this.callModel(model, req, 'schema');
    } catch (err) {
      if (!isSchemaRejection(err)) throw err;
      logger.warn({ model }, 'gemini rejected response schema, retrying in JSON mode');
      return this.callModel(model, req, 'json');
    }
  }

  private async callModel(model: string, req: Req, mode: Mode) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent`;
    const schema = toGeminiSchema(req.jsonSchema);
    const prompt =
      mode === 'json'
        ? `${req.prompt}\n\nRespond with a single JSON object only (no markdown) that matches this JSON Schema:\n${JSON.stringify(schema)}`
        : req.prompt;

    const res = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            ...(mode === 'schema' ? { responseJsonSchema: schema } : {}),
            // Newer Gemini models spend part of the budget on internal
            // "thinking"; leave ample room so long CVs are not truncated.
            maxOutputTokens: Math.max(req.maxTokens * 3, 32768),
            temperature: 0.4,
          },
        }),
      },
      { attempts: 2 },
    );
    const body = (await res.json()) as GeminiResponse;
    const candidate = body.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) {
      throw new AiUpstreamError(
        `Gemini returned no text (finishReason: ${candidate?.finishReason ?? 'unknown'})`,
        true,
      );
    }
    let output: unknown;
    try {
      // Tolerate ```json fences in JSON mode.
      output = JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
    } catch {
      output = null; // triggers the schema-validation retry in generateStructured
    }
    return {
      output,
      inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
