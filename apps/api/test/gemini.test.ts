import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiProvider } from '../src/modules/ai/gemini';
import { AiUpstreamError } from '../src/modules/ai/provider';
import { userFacingError } from '../src/modules/jobs/runner';

const req = { system: 's', prompt: 'p', jsonSchema: {}, name: 'x', maxTokens: 100 };

const ok = (obj: unknown) =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    }),
    { status: 200 },
  );
const busy = () => new Response('{"error":{"code":503,"message":"high demand"}}', { status: 503 });

afterEach(() => vi.unstubAllGlobals());

describe('GeminiProvider failover', () => {
  it('fails over to the next model when the main model is overloaded', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        calls.push(url);
        return url.includes('gemini-3.8-flash') ? busy() : ok({ hello: 'world' });
      }),
    );
    const r = await new GeminiProvider().complete(req);
    expect(r.output).toEqual({ hello: 'world' });
    expect(calls.filter((u) => u.includes('gemini-3.8-flash'))).toHaveLength(2); // 2 quick attempts
    expect(calls.at(-1)).toContain('gemini-flash-latest');
  }, 15_000);

  it('does not fail over on a bad request (e.g. invalid key)', async () => {
    const fetchMock = vi.fn(async () => new Response('{"error":"bad key"}', { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new GeminiProvider().complete(req)).rejects.toBeInstanceOf(AiUpstreamError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('userFacingError', () => {
  it('explains capacity problems and timeouts in plain words', () => {
    expect(userFacingError(new AiUpstreamError('x', true, 503))).toMatch(/very busy/);
    expect(userFacingError(new AiUpstreamError('x', true, 429))).toMatch(/very busy/);
    expect(
      userFacingError(
        new AiUpstreamError(
          'AI provider network error: The operation was aborted due to timeout',
          true,
        ),
      ),
    ).toMatch(/too long/);
    expect(userFacingError(new Error('boom'))).toMatch(/failed to respond/);
  });
});
