import Anthropic from '@anthropic-ai/sdk';

/** High-reasoning model: diagnosis, strategy and recommendations. */
export const REASONING_MODEL = 'claude-opus-5-5';
/** Lower-cost model: executing a plan that the reasoning model already made. */
export const EXECUTION_MODEL = 'claude-sonnet-5-5';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }
  client ??= new Anthropic({ apiKey });
  return client;
}

type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

interface ClaudeTextRequest {
  model: typeof REASONING_MODEL | typeof EXECUTION_MODEL;
  system: string;
  content: string | Anthropic.Beta.BetaContentBlockParam[];
  effort: Effort;
  label: string; // for error messages / logs
}

/**
 * Single Claude call that returns the concatenated text output.
 * Server-side refusal fallback is enabled so a safety-classifier false positive
 * re-runs on Anthropic's recommended fallback model instead of failing the request.
 */
export async function runClaudeText({ model, system, content, effort, label }: ClaudeTextRequest): Promise<string> {
  const response = await getAnthropicClient().beta.messages.create({
    model,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort },
    system,
    messages: [{ role: 'user', content }],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error(`Claude declined the ${label} request (${response.stop_details?.category ?? 'no category'})`);
  }

  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  if (!text) {
    throw new Error(`Claude returned empty response for ${label} (stop_reason: ${response.stop_reason})`);
  }

  console.log(`[claude] ${label}:`, {
    model: response.model,
    stop_reason: response.stop_reason,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
  });

  return text;
}
