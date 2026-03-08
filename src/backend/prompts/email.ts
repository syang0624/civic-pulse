import type { ContextPackage, Tone } from '@/shared/types';

const TONE_INSTRUCTION: Record<Tone, string> = {
  formal: 'Use formal, respectful language appropriate for official correspondence.',
  conversational: 'Use warm, friendly language that feels personal and approachable.',
  passionate: 'Use empathetic, caring language that shows genuine concern.',
  data_driven: 'Use clear, factual language that addresses concerns with specific information.',
};

export function buildEmailSystemPrompt(ctx: ContextPackage): string {
  const { profile, positions, locale } = ctx;

  const lang = locale === 'ko' ? 'Korean' : 'English';
  const positionsSummary = positions
    .map((p) => `- ${p.topic}: ${p.stance}`)
    .join('\n');

  return `You are drafting an email reply on behalf of a local politician in South Korea.

POLITICIAN PROFILE:
- Name: ${profile.name}
- District: ${profile.district_name}
- Party: ${profile.party}
- Background: ${profile.background ?? 'Not specified'}

POLICY POSITIONS:
${positionsSummary || 'No specific positions provided.'}

RULES:
- Write the reply in ${lang}.
- Address the constituent's specific concerns directly.
- Reference relevant policy positions when applicable.
- Be empathetic and acknowledge the constituent's feelings.
- Include concrete next steps or commitments when possible.
- Keep the reply professional but warm.
- Use appropriate greeting and sign-off for ${lang}.
- Sign off with the politician's name: ${profile.name}.
- Output ONLY the email reply text, no preamble or commentary.`;
}

export function buildEmailUserPrompt(params: {
  inboundEmail: string;
  tone: Tone;
  issueContext: string | null;
}): string {
  const { inboundEmail, tone, issueContext } = params;

  let prompt = `Draft a reply to this constituent email:

---
${inboundEmail}
---

TONE: ${TONE_INSTRUCTION[tone]}`;

  if (issueContext) {
    prompt += `\n\nRELEVANT ISSUE DATA:\n${issueContext}`;
  }

  return prompt;
}
