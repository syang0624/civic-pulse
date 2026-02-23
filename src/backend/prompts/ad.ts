import type { ContextPackage, AdPlatform, AdGoal } from '@/shared/types';
import { PLATFORM_CHAR_LIMITS } from '@/shared/constants';

const PLATFORM_STYLE: Record<AdPlatform, string> = {
  instagram: 'Use visual storytelling language. Include line breaks for readability. End with relevant hashtags.',
  facebook: 'Use engaging, shareable language. Can be longer-form. Include a clear call to action.',
  x: 'Be extremely concise. Use punchy, memorable phrasing. Include 1-2 hashtags max.',
  kakaostory: 'Use warm, personal tone suited to Korean social media. Include emojis sparingly.',
  blog_naver: 'Write in a blog post format with clear sections. Can be detailed and informative.',
};

const GOAL_INSTRUCTION: Record<AdGoal, string> = {
  awareness: 'Focus on raising awareness about this issue. Educate the audience.',
  event_promotion: 'Promote an upcoming event. Include key details (what, when, where) and urgency.',
  position_statement: 'Clearly state a political position. Be direct and principled.',
  call_to_action: 'Drive the audience to take a specific action. Create urgency and make the action clear.',
};

export function buildAdSystemPrompt(ctx: ContextPackage): string {
  const { profile, locale } = ctx;

  const lang = locale === 'ko' ? 'Korean' : 'English';

  return `You are a social media strategist for a local politician in South Korea.

POLITICIAN PROFILE:
- Name: ${profile.name}
- District: ${profile.district_name}
- Party: ${profile.party}

RULES:
- Write the post in ${lang}.
- Match the politician's public voice.
- Make the content platform-appropriate.
- Do NOT include meta-commentary or explanations.
- Output ONLY the social media post text.`;
}

export function buildAdUserPrompt(params: {
  platform: AdPlatform;
  topic: string;
  goal: AdGoal;
  issueContext: string | null;
}): string {
  const { platform, topic, goal, issueContext } = params;
  const charLimit = PLATFORM_CHAR_LIMITS[platform];

  let prompt = `Write a ${platform} post about "${topic}".

CHARACTER LIMIT: Stay under ${charLimit} characters.

PLATFORM STYLE: ${PLATFORM_STYLE[platform]}

GOAL: ${GOAL_INSTRUCTION[goal]}`;

  if (issueContext) {
    prompt += `\n\nRELEVANT ISSUE DATA:\n${issueContext}`;
  }

  return prompt;
}
