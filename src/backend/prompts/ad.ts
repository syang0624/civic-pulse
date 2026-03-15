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

  return `You are a social media campaign strategist for an independent candidate running in the Korean 전국동시지방선거 (nationwide local elections).

CANDIDATE PROFILE:
- Name: ${profile.name}
- Running for: ${profile.election_type ?? 'local office'} in ${profile.district_name}
- Party: ${profile.party || '무소속 (Independent)'}

RULES:
- Write all text content in ${lang}.
- Match the candidate's public voice and campaign messaging.
- Make the content platform-appropriate.
- Generate structured output as specified.
- Return ONLY valid JSON, no markdown code blocks, no commentary.`;
}

export function buildAdUserPrompt(params: {
  platform: AdPlatform;
  topic: string;
  goal: AdGoal;
  locale: 'ko' | 'en';
  issueContext: string | null;
}): string {
  const { platform, topic, goal, locale, issueContext } = params;
  const charLimit = PLATFORM_CHAR_LIMITS[platform];
  const imageSuggestionLanguage = locale === 'ko' ? 'Korean' : 'English';
  const imageSuggestionExample = locale === 'ko'
    ? '["시장 골목에서 주민과 인사하는 후보의 따뜻한 장면", "지역 지도와 핵심 공약이 함께 보이는 정보형 카드뉴스", "해 질 무렵 광장에서 시민들과 대화하는 현장 사진"]'
    : '["A warm candid shot of the candidate greeting residents in a local market", "An infographic-style visual combining a local map with key campaign pledges", "An evening town-square scene with the candidate engaging citizens in conversation"]';

  let prompt = `Create a ${platform} campaign post about "${topic}".

CHARACTER LIMIT for content: Stay under ${charLimit} characters.

PLATFORM STYLE: ${PLATFORM_STYLE[platform]}

GOAL: ${GOAL_INSTRUCTION[goal]}

Return a JSON object with exactly these fields:
{
  "title": "A catchy, attention-grabbing title/headline (10-30 chars)",
  "content": "The main post content (respect the character limit above)",
  "hashtags": ["hashtag1", "hashtag2", ...up to 10 relevant hashtags without # prefix],
  "image_suggestions": ${imageSuggestionExample}
}

For image_suggestions, describe 3 images that would complement this post. Be specific about composition, subjects, and mood. These are descriptions for image generation or stock photo search.
Write all image_suggestions descriptions in ${imageSuggestionLanguage}.

Return ONLY valid JSON, no markdown, no explanation.`;

  if (issueContext) {
    prompt += `\n\nRELEVANT ISSUE DATA:\n${issueContext}`;
  }

  return prompt;
}
