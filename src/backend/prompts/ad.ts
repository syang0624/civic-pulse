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
  issueContext: string | null;
}): string {
  const { platform, topic, goal, issueContext } = params;
  const charLimit = PLATFORM_CHAR_LIMITS[platform];

  let prompt = `Create a ${platform} campaign post about "${topic}".

CHARACTER LIMIT for content: Stay under ${charLimit} characters.

PLATFORM STYLE: ${PLATFORM_STYLE[platform]}

GOAL: ${GOAL_INSTRUCTION[goal]}

Return a JSON object with exactly these fields:
{
  "title": "A catchy, attention-grabbing title/headline (10-30 chars)",
  "content": "The main post content (respect the character limit above)",
  "hashtags": ["hashtag1", "hashtag2", ...up to 10 relevant hashtags without # prefix],
  "image_suggestions": ["Description of suggested image 1", "Description of suggested image 2", "Description of suggested image 3"]
}

For image_suggestions, describe 3 images that would complement this post. Be specific about composition, subjects, and mood. These are descriptions for image generation or stock photo search.

Return ONLY valid JSON, no markdown, no explanation.`;

  if (issueContext) {
    prompt += `\n\nRELEVANT ISSUE DATA:\n${issueContext}`;
  }

  return prompt;
}
