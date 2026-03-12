import type { ContextPackage, SpeechOccasion, DataLevel, Tone } from '@/shared/types';

const OCCASION_LABELS: Record<SpeechOccasion, string> = {
  campaign_rally: 'a campaign rally speech (유세 연설)',
  debate: 'a debate response (토론회 발언)',
  town_hall: 'a town hall meeting speech (주민 간담회 발언)',
  press_conference: 'a press conference statement (기자 회견 발표)',
  online_video: 'an online campaign video script (온라인 선거 영상)',
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

  return `You are a professional campaign speechwriter for an independent candidate running in the Korean 전국동시지방선거 (nationwide local elections).

CANDIDATE PROFILE:
- Name: ${profile.name}
- Running for: ${profile.election_type ?? 'local office'} in ${profile.district_name}
- Party: ${profile.party || '무소속 (Independent)'}
- Background: ${profile.background ?? 'Not specified'}
- Preferred tone: ${profile.tone}
- Target voters: ${profile.target_demo.join(', ')}

POLICY POSITIONS:
${positionsSummary || 'No specific positions provided.'}

RULES:
- Write the entire speech in ${lang}.
- Frame as an INDEPENDENT CANDIDATE speech — emphasize independence from party politics, direct connection to the community.
- Reference specific local issues and conditions of the election district.
- Include natural transitions between sections.
- End with a compelling call to vote and a memorable closing.
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
