import { createClient } from '@/backend/lib/supabase/server';
import type { ContextPackage, Locale } from '@/shared/types';

export async function assembleContext(
  userId: string,
  locale: Locale,
  issueId?: string,
): Promise<ContextPackage | null> {
  const supabase = await createClient();

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, policy_positions(*)')
    .eq('id', userId)
    .single();

  if (!profileData) return null;

  const { policy_positions, ...profile } = profileData;

  let issues: ContextPackage['issues'] = [];

  if (issueId) {
    const { data: issue } = await supabase
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .single();

    if (issue) {
      issues = [
        {
          title: locale === 'ko' ? issue.title_ko : (issue.title_en ?? issue.title_ko),
          category: issue.category,
          description:
            locale === 'ko'
              ? issue.description_ko
              : (issue.description_en ?? issue.description_ko),
          sentiment: issue.sentiment,
          urgency: issue.urgency,
          mention_count: issue.mention_count,
          sub_region: issue.sub_region,
          last_seen: issue.last_seen,
        },
      ];
    }
  } else if (profile.district_code) {
    const { data: recentIssues } = await supabase
      .from('issues')
      .select('*')
      .eq('region_code', profile.district_code)
      .order('last_seen', { ascending: false })
      .limit(5);

    if (recentIssues) {
      issues = recentIssues.map((issue) => ({
        title: locale === 'ko' ? issue.title_ko : (issue.title_en ?? issue.title_ko),
        category: issue.category,
        description:
          locale === 'ko'
            ? issue.description_ko
            : (issue.description_en ?? issue.description_ko),
        sentiment: issue.sentiment,
        urgency: issue.urgency,
        mention_count: issue.mention_count,
        sub_region: issue.sub_region,
        last_seen: issue.last_seen,
      }));
    }
  }

  return {
    profile: {
      name: profile.name,
      district_name: profile.district_name,
      party: profile.party,
      background: profile.background,
      tone: profile.tone,
      target_demo: profile.target_demo,
    },
    positions: (policy_positions ?? []).map((p: Record<string, unknown>) => ({
      topic: p.topic as string,
      stance: p.stance as string,
      priority: p.priority as string,
      key_number: p.key_number as string | null,
      talking_points: p.talking_points as string[],
    })),
    issues,
    documents: [],
    locale,
  };
}

export function formatIssueContext(ctx: ContextPackage): string | null {
  if (ctx.issues.length === 0) return null;

  return ctx.issues
    .map(
      (issue) =>
        `- "${issue.title}" (${issue.category}, urgency: ${issue.urgency}, mentions: ${issue.mention_count})${
          issue.description ? `\n  ${issue.description}` : ''
        }`,
    )
    .join('\n');
}
