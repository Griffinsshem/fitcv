import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// Both keys configured, Gemini primary: Claude must take over when Gemini is overloaded.
beforeAll(() => {
  vi.stubEnv('AI_PROVIDER', 'gemini');
  vi.stubEnv('GEMINI_API_KEY', 'g-test');
  vi.stubEnv('ANTHROPIC_API_KEY', 'a-test');
});
afterEach(() => vi.unstubAllGlobals());

describe('provider chain', () => {
  it('switches from an overloaded Gemini to Claude automatically', async () => {
    const { generateStructured } = await import('../src/modules/ai/provider');
    const hosts: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        hosts.push(new URL(url).host);
        if (url.includes('googleapis'))
          return new Response('{"error":{"code":503}}', { status: 503 });
        return new Response(
          JSON.stringify({
            content: [{ type: 'tool_use', name: 'submit', input: { greeting: 'hello' } }],
            usage: { input_tokens: 3, output_tokens: 2 },
          }),
          { status: 200 },
        );
      }),
    );
    const r = await generateStructured({
      system: 's',
      prompt: 'p',
      name: 'submit',
      schema: z.object({ greeting: z.string() }),
    });
    expect(r.data).toEqual({ greeting: 'hello' });
    expect(r.usage.provider).toBe('anthropic');
    expect(hosts).toContain('generativelanguage.googleapis.com');
    expect(hosts.at(-1)).toBe('api.anthropic.com');
  }, 20_000);
});
