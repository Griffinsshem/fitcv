import { env } from '../../config/env';
import { AiUpstreamError, fetchWithRetry, type AiProvider } from './provider';

interface AnthropicResponse {
  content: Array<{ type: string; name?: string; input?: unknown; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  stop_reason?: string;
}

/**
 * Anthropic Messages API. Structured output is obtained by forcing a single
 * tool call whose input_schema is our JSON schema.
 */
export class AnthropicProvider implements AiProvider {
  readonly name = 'anthropic';
  readonly model = env.ANTHROPIC_MODEL;

  async complete(req: {
    system: string;
    prompt: string;
    jsonSchema: Record<string, unknown>;
    name: string;
    maxTokens: number;
  }) {
    const res = await fetchWithRetry(`${env.ANTHROPIC_BASE_URL.replace(/\/$/, '')}/v1/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens,
        system: req.system,
        tools: [
          {
            name: req.name,
            description: 'Submit the final structured answer.',
            input_schema: req.jsonSchema,
          },
        ],
        tool_choice: { type: 'tool', name: req.name },
        messages: [{ role: 'user', content: req.prompt }],
      }),
    });
    const body = (await res.json()) as AnthropicResponse;
    const tool = body.content.find((c) => c.type === 'tool_use' && c.name === req.name);
    if (!tool) throw new AiUpstreamError('Anthropic response had no tool output', true);
    return {
      output: tool.input,
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
    };
  }
}
