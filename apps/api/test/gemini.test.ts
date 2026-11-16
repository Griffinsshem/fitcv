import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GenerationResultSchema, MasterProfileSchema } from '@fitcv/shared';
import { GeminiProvider, toGeminiSchema } from '../src/modules/ai/gemini';
import { AiUpstreamError, clampToSchema } from '../src/modules/ai/provider';
import { userFacingError } from '../src/modules/jobs/runner';

const req = {
  system: 's',
  prompt: 'p',
  jsonSchema: { type: 'object', properties: { a: { type: 'string', maxLength: 5 } } },
  name: 'x',
  maxTokens: 100,
};

const ok = (obj: unknown, fenced = false) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              { text: fenced ? '```json\n' + JSON.stringify(obj) + '\n```' : JSON.stringify(obj) },
            ],
          },
        },
      ],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    }),
    { status: 200 },
  );
const busy = () => new Response('{"error":{"code":503,"message":"high demand"}}', { status: 503 });
const tooManyStates = () =>
  new Response(
    '{"error":{"code":400,"message":"The specified schema produces a constraint that has too many states for serving."}}',
    { status: 400 },
  );

afterEach(() => vi.unstubAllGlobals());

describe('toGeminiSchema', () => {
  it('strips size limits from the real CV schemas but keeps structure', () => {
    for (const schema of [MasterProfileSchema, GenerationResultSchema]) {
      const full = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' });
      const simple = JSON.stringify(toGeminiSchema(full));
      expect(simple).not.toMatch(
        /maxLength|maxItems|minLength|minItems|pattern|default|\$schema|\$ref/,
      );
      expect(simple).toContain('"experience"');
      expect(simple.length).toBeLessThan(JSON.stringify(full).length);
    }
  });
});

describe('GeminiProvider', () => {
  it('fails over to the next model when the main model is overloaded', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        return url.includes('gemini-3.8-flash') ? busy() : ok({ a: 'hi' });
      }),
    );
    const r = await new GeminiProvider([]).complete(req);
    expect(r.output).toEqual({ a: 'hi' });
    expect(calls.filter((u) => u.includes('gemini-3.8-flash'))).toHaveLength(2);
  }, 15_000);

  it('retries in plain JSON mode when a model rejects the schema (the 20:08 failure)', async () => {
    const bodies: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body)) as { generationConfig: Record<string, unknown> };
        bodies.push(body.generationConfig);
        return body.generationConfig.responseJsonSchema ? tooManyStates() : ok({ a: 'hi' }, true);
      }),
    );
    const r = await new GeminiProvider([]).complete(req);
    expect(r.output).toEqual({ a: 'hi' }); // markdown fences tolerated too
    expect(bodies[0]?.responseJsonSchema).toBeDefined();
    expect(bodies.at(-1)?.responseJsonSchema).toBeUndefined();
  });

  it('waits and tries another round when every model is busy', async () => {
    let n = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => (++n <= 6 ? busy() : ok({ a: 'later' }))),
    );
    const r = await new GeminiProvider([10]).complete(req);
    expect(r.output).toEqual({ a: 'later' });
  }, 20_000);

  it('does not fail over on a bad API key', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"bad key"}', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new GeminiProvider([]).complete(req)).rejects.toBeInstanceOf(AiUpstreamError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('clampToSchema', () => {
  it('trims over-long strings and lists so valid answers are not rejected', () => {
    const full = z.toJSONSchema(MasterProfileSchema, { io: 'input', unrepresentable: 'any' });
    const raw = {
      contact: { fullName: 'Griffins Shem', email: null },
      summary: 'x'.repeat(5000),
      skills: Array.from({ length: 150 }, (_, i) => `skill${i}`),
      experience: [{ id: 'exp-1', role: 'Engineer', company: 'Acme', bullets: ['y'.repeat(900)] }],
    };
    const parsed = MasterProfileSchema.safeParse(clampToSchema(raw, full));
    expect(parsed.success).toBe(true);
    expect(parsed.data?.summary).toHaveLength(2000);
    expect(parsed.data?.skills).toHaveLength(100);
    expect(parsed.data?.experience[0]?.bullets[0]).toHaveLength(400);
    expect(MasterProfileSchema.safeParse(raw).success).toBe(false); // without clamping it would fail
  });
});

describe('userFacingError', () => {
  it('explains failures in plain words', () => {
    expect(userFacingError(new AiUpstreamError('x', true, 503))).toMatch(/very busy/);
    expect(userFacingError(new AiUpstreamError('x', false, 403))).toMatch(/key/);
    expect(
      userFacingError(
        new AiUpstreamError('AI provider network error: aborted due to timeout', true),
      ),
    ).toMatch(/too long/);
    expect(userFacingError(new Error('boom'))).toMatch(/failed to respond/);
  });
});
