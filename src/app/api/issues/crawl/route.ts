import { NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { generateWithClaude } from '@/backend/lib/claude';
import { createClient } from '@/backend/lib/supabase/server';
import { ELECTION_DISTRICTS } from '@/shared/constants';
import type { IssueCategory, Trend, Urgency } from '@/shared/types';

interface GeneratedIssue {
  title_ko: string;
  title_en: string;
  category: IssueCategory;
  description_ko: string;
  description_en: string;
  urgency: Urgency;
  trend: Trend;
  sentiment: number;
  mention_count: number;
}

const VALID_CATEGORIES: IssueCategory[] = [
  'education',
  'housing',
  'transport',
  'safety',
  'environment',
  'economy',
  'welfare',
  'governance',
  'healthcare',
  'culture',
];

const VALID_URGENCY: Urgency[] = ['high', 'medium', 'low'];
const VALID_TRENDS: Trend[] = ['rising', 'stable', 'declining'];

function parseGeneratedIssues(rawText: string): GeneratedIssue[] {
  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const parsed: unknown = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error('Model output is not an array');
  }

  return parsed
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const category = String(item.category ?? '').trim() as IssueCategory;
      const urgency = String(item.urgency ?? '').trim() as Urgency;
      const trend = String(item.trend ?? '').trim() as Trend;
      const sentimentRaw = Number(item.sentiment ?? 50);
      const mentionCountRaw = Number(item.mention_count ?? 50);

      return {
        title_ko: String(item.title_ko ?? '').trim(),
        title_en: String(item.title_en ?? '').trim(),
        category: VALID_CATEGORIES.includes(category) ? category : 'governance',
        description_ko: String(item.description_ko ?? '').trim(),
        description_en: String(item.description_en ?? '').trim(),
        urgency: VALID_URGENCY.includes(urgency) ? urgency : 'medium',
        trend: VALID_TRENDS.includes(trend) ? trend : 'stable',
        sentiment: Number.isFinite(sentimentRaw)
          ? Math.min(100, Math.max(0, Math.round(sentimentRaw)))
          : 50,
        mention_count: Number.isFinite(mentionCountRaw)
          ? Math.min(500, Math.max(10, Math.round(mentionCountRaw)))
          : 50,
      };
    })
    .filter((issue) => issue.title_ko.length > 0)
    .slice(0, 10);
}

function deduplicateByTitle(issues: GeneratedIssue[]): GeneratedIssue[] {
  const deduped = new Map<string, GeneratedIssue>();

  for (const issue of issues) {
    const key = issue.title_ko.toLowerCase();
    const existing = deduped.get(key);

    if (existing) {
      deduped.set(key, {
        ...existing,
        mention_count: existing.mention_count + issue.mention_count,
        sentiment: Math.round((existing.sentiment + issue.sentiment) / 2),
      });
      continue;
    }

    deduped.set(key, issue);
  }

  return Array.from(deduped.values());
}

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('district_code, district_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.district_code) {
    return NextResponse.json(
      { error: 'Profile district is required to crawl issues' },
      { status: 400 },
    );
  }

  const districtCode = profile.district_code;
  const districtName = profile.district_name ?? '';
  const regionName = ELECTION_DISTRICTS[districtCode]?.name ?? districtCode;
  const districtSuffix = districtName ? ` (${districtName})` : '';
  const nowIso = new Date().toISOString();

  const system =
    'You are a Korean local news analyst. Generate realistic, current local issues for a specific region in South Korea. These should be issues that a candidate running in the 전국동시지방선거 (nationwide local elections) would need to know about.';

  const prompt = `Generate exactly 10 current local issues for ${regionName}${districtSuffix}.\n\nFor each issue, provide a JSON array with these fields:\n- title_ko: Issue title in Korean (concise, news-headline style)\n- title_en: Issue title in English\n- category: One of: education, housing, transport, safety, environment, economy, welfare, governance, healthcare, culture\n- description_ko: 2-3 sentence description in Korean\n- description_en: 2-3 sentence description in English\n- urgency: One of: high, medium, low\n- trend: One of: rising, stable, declining\n- sentiment: Number 0-100 (0=very negative, 100=very positive public sentiment)\n- mention_count: Estimated number of recent mentions (10-500)\n\nMake the issues realistic, diverse across categories, and specific to the region. Include both ongoing issues and emerging ones.\n\nReturn ONLY a valid JSON array, no markdown code blocks, no explanation.`;

  let generatedIssues: GeneratedIssue[] = [];
  try {
    const rawResult = await generateWithClaude({
      system,
      prompt,
      maxTokens: 4096,
      temperature: 0.7,
    });
    generatedIssues = deduplicateByTitle(parseGeneratedIssues(rawResult));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to generate issues: ${message}` },
      { status: 500 },
    );
  }

  if (generatedIssues.length === 0) {
    return NextResponse.json(
      { error: 'No valid issues generated from model response' },
      { status: 500 },
    );
  }

  const generatedTitles = generatedIssues.map((issue) => issue.title_ko);
  const { data: existingIssues, error: existingError } = await supabase
    .from('issues')
    .select('id, title_ko, mention_count')
    .eq('region_code', districtCode)
    .in('title_ko', generatedTitles);

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingByTitle = new Map(
    (existingIssues ?? []).map((issue) => [issue.title_ko.toLowerCase(), issue]),
  );

  const issuesToInsert = [];
  let updatedCount = 0;

  for (const issue of generatedIssues) {
    const existing = existingByTitle.get(issue.title_ko.toLowerCase());

    if (existing) {
      const { error: updateError } = await supabase
        .from('issues')
        .update({
          last_seen: nowIso,
          mention_count: (existing.mention_count ?? 0) + issue.mention_count,
        })
        .eq('id', existing.id);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      updatedCount += 1;
      continue;
    }

    issuesToInsert.push({
      title_ko: issue.title_ko,
      title_en: issue.title_en,
      category: issue.category,
      subcategory: null,
      description_ko: issue.description_ko,
      description_en: issue.description_en,
      region_code: districtCode,
      sub_region: districtName,
      latitude: null,
      longitude: null,
      sentiment: issue.sentiment,
      urgency: issue.urgency,
      trend: issue.trend,
      mention_count: issue.mention_count,
      first_seen: nowIso,
      last_seen: nowIso,
      source_session: null,
    });
  }

  if (issuesToInsert.length === 0) {
    return NextResponse.json({ data: [], inserted: 0, updated: updatedCount });
  }

  const { data: insertedIssues, error: insertError } = await supabase
    .from('issues')
    .insert(issuesToInsert)
    .select('*');

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    data: insertedIssues ?? [],
    inserted: insertedIssues?.length ?? 0,
    updated: updatedCount,
  });
}
