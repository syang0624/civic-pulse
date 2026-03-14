import type { ContextPackage } from '@/shared/types';

export function buildStrategySystemPrompt(ctx: ContextPackage): string {
  const { profile, positions, locale } = ctx;
  const lang = locale === 'ko' ? 'Korean' : 'English';

  const policyPositions = positions.length > 0
    ? positions
        .map((position) => {
          const points = position.talking_points.length > 0
            ? position.talking_points.join('; ')
            : '-';
          return [
            `- Topic: ${position.topic}`,
            `  Stance: ${position.stance}`,
            `  Priority: ${position.priority}`,
            `  Key number: ${position.key_number ?? '-'}`,
            `  Talking points: ${points}`,
          ].join('\n');
        })
        .join('\n')
    : '- No policy positions provided yet.';

  const targetDemo = profile.target_demo.length > 0
    ? profile.target_demo.join(', ')
    : '-';

  return `You are a senior campaign strategist helping a local election candidate build practical, vote-winning strategy.

CANDIDATE PROFILE:
- Name: ${profile.name}
- District: ${profile.district_name}
- Party: ${profile.party || 'Independent'}
- Election type: ${profile.election_type}
- Target demographics: ${targetDemo}

POLICY POSITIONS:
${policyPositions}

RULES:
- Write all content in ${lang}.
- Keep recommendations specific to local context and stakeholder dynamics.
- Provide concrete, actionable advice that can be executed by a campaign team.
- Keep outputs realistic, politically coherent, and aligned with the candidate profile.
- Return ONLY valid JSON with the requested structure. No markdown, no commentary.`;
}

export function buildStrategyUserPrompt(params: {
  issue: {
    title: string;
    description: string | null;
    category: string;
    urgency: string;
  };
  focus?: string;
}): string {
  const { issue, focus } = params;

  return `Generate a campaign strategy analysis for the following local issue.

ISSUE:
- Title: ${issue.title}
- Description: ${issue.description ?? 'No description provided'}
- Category: ${issue.category}
- Urgency: ${issue.urgency}

${focus ? `ADDITIONAL FOCUS AREA:
- ${focus}

` : ''}Return a JSON object with exactly this structure:
{
  "issue_summary": "Brief analysis of the issue from a campaign perspective",
  "key_voter_groups": [
    { "group": "group name", "concern": "what they care about", "approach": "how to reach them" }
  ],
  "messaging_angle": {
    "core_message": "The single key message",
    "framing": "How to frame this issue",
    "tone_recommendation": "Recommended tone for this issue"
  },
  "campaign_actions": [
    { "action": "specific action", "timeline": "when", "expected_impact": "what it achieves" }
  ],
  "talking_points": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "social_media_strategy": {
    "key_hashtags": ["hashtag1", "hashtag2"],
    "content_themes": ["theme 1", "theme 2"],
    "recommended_platforms": ["platform 1", "platform 2"],
    "post_frequency": "recommended posting frequency"
  },
  "risks_and_counters": [
    { "risk": "potential criticism", "counter": "how to respond" }
  ]
}

Return ONLY valid JSON with these field names and nested keys exactly as shown.`;
}
