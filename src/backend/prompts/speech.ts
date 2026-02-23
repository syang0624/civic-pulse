import type { ContextPackage, SpeechOccasion, DataLevel, Tone } from '@/shared/types';

const OCCASION_LABELS: Record<SpeechOccasion, string> = {
  council_session: 'a council session speech',
  campaign_rally: 'a campaign rally speech',
  town_hall: 'a town hall meeting speech',
  community_event: 'a community event speech',
  online_video: 'an online video script',
};

const DATA_LEVEL_INSTRUCTION: Record<DataLevel, string> = {
  light: 'Use a story-driven approach with minimal statistics. Focus on personal anecdotes and emotional connection.',
  medium: 'Balance storytelling with relevant statistics and data points.',
  heavy: 'Lead with data, statistics, and research findings. Support every major claim with numbers.',
};

const TONE_INSTRUCTION: Record<Tone, string> = {
  formal: 'Use formal, professional language appropriate for official settings.',
  conversational: 'Use warm, approachable language as if speaking directly to neighbors.',
  passionate: 'Use energetic, motivating language that inspires action and emotion.',
  data_driven: 'Use precise, analytical language that emphasizes evidence and logic.',
};

export function buildSpeechSystemPrompt(ctx: ContextPackage): string {
  const { profile, positions, locale } = ctx;

  const lang = locale === 'ko' ? 'Korean' : 'English';
  const positionsSummary = positions
    .map((p) => `- ${p.topic}: ${p.stance} (Priority: ${p.priority})`)
    .join('\n');

  return `You are a professional speechwriter for a local politician in South Korea.

POLITICIAN PROFILE:
- Name: ${profile.name}
- District: ${profile.district_name}
- Party: ${profile.party}
- Background: ${profile.background ?? 'Not specified'}
- Preferred tone: ${profile.tone}
- Target demographics: ${profile.target_demo.join(', ')}

POLICY POSITIONS:
${positionsSummary || 'No specific positions provided.'}

RULES:
- Write the entire speech in ${lang}.
- Match the politician's voice and policy positions.
- Include natural transitions between sections.
- End with a memorable closing that reinforces the core message.
- Do NOT include stage directions or speaker labels.
- Output ONLY the speech text, no preamble or commentary.`;
}

export function buildSpeechUserPrompt(params: {
  topic: string;
  occasion: SpeechOccasion;
  tone: Tone;
  targetWords: number;
  dataLevel: DataLevel;
  issueContext: string | null;
}): string {
  const { topic, occasion, tone, targetWords, dataLevel, issueContext } = params;

  let prompt = `Write ${OCCASION_LABELS[occasion]} about "${topic}".

TARGET LENGTH: approximately ${targetWords} words.

TONE: ${TONE_INSTRUCTION[tone]}

DATA STYLE: ${DATA_LEVEL_INSTRUCTION[dataLevel]}`;

  if (issueContext) {
    prompt += `\n\nRELEVANT ISSUE DATA:\n${issueContext}`;
  }

  return prompt;
}

export function speechLengthToWords(length: string | number): number {
  if (typeof length === 'number') return length;
  const map: Record<string, number> = {
    '3min': 450,
    '5min': 750,
    '10min': 1500,
  };
  return map[length] ?? 750;
}
