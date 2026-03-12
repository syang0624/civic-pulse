import type { ContextPackage } from '@/shared/types';

export function buildPledgeSystemPrompt(ctx: ContextPackage): string {
  const { profile, positions, locale } = ctx;
  const lang = locale === 'ko' ? 'Korean' : 'English';
  const positionsSummary = positions
    .map((p) => `- ${p.topic}: ${p.stance} (Priority: ${p.priority})`)
    .join('\n');

  return `You are a campaign policy strategist for an independent candidate running in the Korean 전국동시지방선거 (nationwide local elections).

CANDIDATE PROFILE:
- Name: ${profile.name}
- Running for: ${profile.election_type ?? 'local office'} in ${profile.district_name}
- Party: ${profile.party || '무소속 (Independent)'}
- Target voters: ${profile.target_demo.join(', ')}

EXISTING POLICY POSITIONS:
${positionsSummary || 'No specific positions provided yet.'}

RULES:
- Write all content in ${lang}.
- Generate campaign pledges that are realistic, achievable at the local government level.
- Each pledge must be specific to the candidate's region and election type.
- Pledges should build on existing policy positions where available.
- Rank pledges by recommended priority with clear reasoning.
- Return ONLY valid JSON, no markdown code blocks, no commentary.`;
}

export function buildPledgeUserPrompt(params: {
  focusAreas: string[];
  numPledges: number;
  regionContext: string | null;
  issueContext: string | null;
}): string {
  const { focusAreas, numPledges, regionContext, issueContext } = params;

  let prompt = `Generate exactly ${numPledges} campaign pledges (공약).

FOCUS AREAS: ${focusAreas.join(', ')}
${regionContext ? `\nADDITIONAL REGIONAL CONTEXT: ${regionContext}` : ''}
${issueContext ? `\nCURRENT LOCAL ISSUES:\n${issueContext}` : ''}

Return a JSON array of pledges, ranked from highest to lowest priority. Each pledge object must have:
{
  "rank": 1,
  "title": "Short pledge title (공약 제목)",
  "category": "One of: education, housing, transport, safety, environment, economy, welfare, governance, healthcare, culture",
  "problem": "The specific problem this pledge addresses (2-3 sentences)",
  "solution": "The proposed solution in detail (3-5 sentences)",
  "timeline": "Implementation timeline (e.g., '1년 내 시행' or '임기 내 단계적 추진')",
  "expected_outcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
  "talking_points": ["Key point 1 for speeches", "Key point 2", "Key point 3"],
  "priority_reason": "Why this pledge should be prioritized (1-2 sentences)",
  "estimated_budget": "Rough budget estimate or 'N/A'"
}

Return ONLY a valid JSON array, no markdown, no explanation.`;

  return prompt;
}
