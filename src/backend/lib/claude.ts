import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

export interface ClaudeGenerationOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateWithClaude({
  system,
  prompt,
  maxTokens = 4096,
  temperature = 0.7,
}: ClaudeGenerationOptions): Promise<string> {
  const claude = getClaudeClient();

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    temperature,
    system,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text;
}
