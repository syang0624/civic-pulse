import type { ContextPackage, Tone } from '@/shared/types';

const TONE_INSTRUCTION: Record<Tone, string> = {
  formal: 'Use formal, respectful language suitable for official constituent communication.',
  conversational: 'Use warm, approachable language while remaining professional.',
  passionate: 'Use empathetic and motivating language while staying grounded.',
  data_driven: 'Use concise, evidence-oriented language and concrete facts.',
};

export function buildEmailSystemPrompt(ctx: ContextPackage): string {
  const lang = ctx.locale === 'ko' ? 'Korean' : 'English';
  return `You are a political communications aide for a local Korean election candidate.

RULES:
- Write in ${lang}.
- Keep the tone aligned with candidate profile.
- Acknowledge the citizen concern directly and respectfully.
- Do not promise anything that contradicts stated policy positions.
- Keep factual claims conservative and verifiable.
- Return only the email text, no markdown or commentary.`;
}

export function buildEmailUserPrompt(args: {
  inboundEmail: string;
  tone: Tone;
  issueContext: string | null;
  strictFactual: boolean;
}): string {
  const { inboundEmail, tone, issueContext, strictFactual } = args;
  let prompt = `Draft a reply to this constituent email.

INBOUND EMAIL:
${inboundEmail}

TONE:
${TONE_INSTRUCTION[tone]}

STRUCTURE:
1) Greeting and acknowledgment
2) Clarify concern and candidate position
3) Concrete next-step / commitment
4) Respectful close`;

  if (issueContext) {
    prompt += `\n\nLOCAL ISSUE CONTEXT:\n${issueContext}`;
  }

  if (strictFactual) {
    prompt += '\n\nSTRICT FACTUAL MODE: avoid unverified numbers; if uncertain, use qualitative wording.';
  }

  return prompt;
}
