import type { ContextPackage } from '@/shared/types';

export function buildSentimentSystemPrompt(ctx: ContextPackage): string {
  const lang = ctx.locale === 'ko' ? 'Korean' : 'English';
  return `You are a civic intelligence analyst for Korean local campaigns.

RULES:
- Write in ${lang}.
- Summarize trend and urgency from provided issues only.
- Keep output practical for campaign planning.
- Return only valid JSON.`;
}

export function buildSentimentUserPrompt(args: {
  period: '1week' | '2weeks' | '4weeks' | '8weeks';
  compareTo: 'none' | 'neighboring';
  issueContext: string | null;
  strictFactual: boolean;
}): string {
  const { period, compareTo, issueContext, strictFactual } = args;
  return `Create a weekly sentiment brief for period=${period}, compare_to=${compareTo}.

ISSUE CONTEXT:
${issueContext ?? '- No issues available -'}

STRICT FACTUAL MODE: ${strictFactual ? 'enabled' : 'disabled'}.

Return JSON with this shape:
{
  "period": "${period}",
  "top_trending_up": ["..."],
  "top_trending_down": ["..."],
  "new_issues": ["..."],
  "negative_hotspots": ["..."],
  "recommended_actions": ["...", "...", "..."]
}`;
}
