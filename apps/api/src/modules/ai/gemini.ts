import { env } from '../../config/env';
import { AiUpstreamError, fetchWithRetry, type AiProvider } from './provider';

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

/** Google Gemini (generativelanguage v1beta) with JSON-mode output. */
export class GeminiProvider implements AiProvider {
  readonly name = 'gemini';
  readonly model = env.GEMINI_MODEL;

  async complete(req: {
    system: string;
    prompt: string;
    jsonSchema: Record<string, unknown>;
    name: string;
    maxTokens: number;
  }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      this.model,
    )}:generateContent`;
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: req.jsonSchema,
          maxOutputTokens: Math.max(req.maxTokens, 8192),
          temperature: 0.4,
        },
      }),
    });
    const body = (await res.json()) as GeminiResponse;
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text) throw new AiUpstreamError('Gemini response was empty', true);
    let output: unknown;
    try {
      output = JSON.parse(text);
    } catch {
      output = null; // triggers schema-validation retry
    }
    return {
      output,
      inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
