import { NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { generateWithClaude } from '@/backend/lib/claude';
import { createClient } from '@/backend/lib/supabase/server';
import { createAdminClient } from '@/backend/lib/supabase/admin';
import { ELECTION_DISTRICTS } from '@/shared/constants';
import { fetchDistrictNews } from '@/backend/lib/news-fetcher';
import type { NewsArticle } from '@/backend/lib/news-fetcher';
import type { IssueCategory, IssueSource, Trend, Urgency } from '@/shared/types';

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
  source_indices: number[];
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
      const sourceIndices = Array.isArray(item.source_indices)
        ? (item.source_indices as number[]).filter((n) => typeof n === 'number')
        : [];

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
        source_indices: sourceIndices,
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
        source_indices: [...new Set([...existing.source_indices, ...issue.source_indices])],
      });
      continue;
    }

    deduped.set(key, issue);
  }

  return Array.from(deduped.values());
}

function buildSources(sourceIndices: number[], articles: NewsArticle[]): IssueSource[] {
  return sourceIndices
    .map((i) => articles[i - 1])
    .filter(Boolean)
    .map((a) => ({
      url: a.link,
      name: a.sourceName || '뉴스',
      title: a.title,
      published_at: a.publishedAt,
    }));
}

function buildPromptWithArticles(
  articles: NewsArticle[],
  regionName: string,
  districtSuffix: string,
): string {
  const articleList = articles
    .map(
      (a, i) =>
        `${i + 1}. "${a.title}" (${a.sourceName}, ${new Date(a.publishedAt).toLocaleDateString('ko-KR')})`,
    )
    .join('\n');

  return `다음은 ${regionName}${districtSuffix} 관련 최근 실제 뉴스 기사 목록입니다:

${articleList}

위 뉴스 기사들을 바탕으로, 이 지역의 주요 이슈 최대 10개를 정리하세요.

중요 규칙:
1. 각 이슈의 제목(title_ko)은 반드시 해당 기사가 실제로 보도한 내용을 직접적으로 반영해야 합니다. 기사 내용을 재해석하거나 창의적으로 바꾸지 마세요.
2. 설명(description_ko)은 기사가 실제로 보도한 사실만 요약하세요. 추측이나 해석을 추가하지 마세요.
3. 관련 기사가 여러 개인 경우 하나의 이슈로 묶되, 제목은 핵심 사실을 정확히 반영해야 합니다.
4. 기사와 무관한 이슈를 만들어내지 마세요.

예시:
- 기사: "서울시 증여세 신고 건수 전년 대비 30% 증가" → 제목: "증여세 신고 건수 급증" ✓
- 기사: "서울시 증여세 신고 건수 전년 대비 30% 증가" → 제목: "새로운 나눔 문화 확산" ✗ (기사 내용과 다름)

각 이슈에 대해 다음 필드를 포함하는 JSON 배열을 반환하세요:
- title_ko: 이슈 제목 (한국어, 기사 내용을 직접 반영하는 간결한 헤드라인)
- title_en: 이슈 제목 (영어 번역)
- category: 다음 중 하나: education, housing, transport, safety, environment, economy, welfare, governance, healthcare, culture
- description_ko: 2-3문장 설명 (한국어, 기사가 보도한 사실만 요약)
- description_en: 2-3문장 설명 (영어 번역)
- urgency: 다음 중 하나: high, medium, low
- trend: 다음 중 하나: rising, stable, declining
- sentiment: 0-100 숫자 (기사의 보도 논조. 0=매우 부정적 보도, 100=매우 긍정적 보도)
- mention_count: 이 이슈와 관련된 기사 수
- source_indices: 이 이슈의 출처 기사 번호 배열 (1부터 시작)

JSON 배열만 반환하세요. 마크다운 코드 블록 없이.`;
}

function buildFallbackPrompt(regionName: string, districtSuffix: string): string {
  return `${regionName}${districtSuffix} 지역의 현재 주요 이슈 10개를 생성하세요.

중요 규칙:
1. 각 이슈는 이 지역에서 실제로 논의되고 있을 법한 구체적이고 사실적인 주제여야 합니다.
2. 추상적이거나 모호한 제목 대신, 구체적인 사안을 다루세요.
3. 다양한 카테고리에 걸쳐 이슈를 분배하세요.

각 이슈에 대해 다음 필드를 포함하는 JSON 배열을 반환하세요:
- title_ko: 이슈 제목 (한국어, 간결한 뉴스 헤드라인 스타일)
- title_en: 이슈 제목 (영어 번역)
- category: 다음 중 하나: education, housing, transport, safety, environment, economy, welfare, governance, healthcare, culture
- description_ko: 2-3문장 설명 (한국어)
- description_en: 2-3문장 설명 (영어 번역)
- urgency: 다음 중 하나: high, medium, low
- trend: 다음 중 하나: rising, stable, declining
- sentiment: 50
- mention_count: 예상 언급 수 (10-500)
- source_indices: []

JSON 배열만 반환하세요. 마크다운 코드 블록 없이.`;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const supabase = await createClient();
  const admin = createAdminClient();

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
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  if (force) {
    await admin
      .from('issues')
      .delete()
      .eq('region_code', districtCode)
      .gte('first_seen', todayStart.toISOString());
  } else {
    const { count: todayCount } = await admin
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('region_code', districtCode)
      .gte('first_seen', todayStart.toISOString());

    if (todayCount && todayCount >= 10) {
      return NextResponse.json({
        data: [],
        inserted: 0,
        updated: 0,
        skipped: true,
        message: 'Issues already crawled today for this district',
      });
    }
  }

  const articles = await fetchDistrictNews(
    districtName || regionName,
    regionName,
  );

  const hasRealNews = articles.length > 0;

  const system = hasRealNews
    ? 'You are a Korean local news analyst. Analyze real news articles and extract the key local issues for a specific region in South Korea. Focus on issues relevant to candidates running in 전국동시지방선거 (nationwide local elections).'
    : 'You are a Korean local news analyst. Generate realistic, current local issues for a specific region in South Korea. These should be issues that a candidate running in the 전국동시지방선거 would need to know about.';

  const prompt = hasRealNews
    ? buildPromptWithArticles(articles, regionName, districtSuffix)
    : buildFallbackPrompt(regionName, districtSuffix);

  let generatedIssues: GeneratedIssue[] = [];
  try {
    const rawResult = await generateWithClaude({
      system,
      prompt,
      maxTokens: 16384,
      temperature: 0.4,
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
  const { data: existingIssues, error: existingError } = await admin
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
    const sources = hasRealNews
      ? buildSources(issue.source_indices, articles)
      : [];

    if (existing) {
      const { error: updateError } = await admin
        .from('issues')
        .update({
          last_seen: nowIso,
          mention_count: (existing.mention_count ?? 0) + issue.mention_count,
          source_session: sources.length > 0 ? JSON.stringify(sources) : null,
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
      source_session: sources.length > 0 ? JSON.stringify(sources) : null,
    });
  }

  if (issuesToInsert.length === 0) {
    return NextResponse.json({ data: [], inserted: 0, updated: updatedCount });
  }

  const { data: insertedIssues, error: insertError } = await admin
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
    source_count: articles.length,
  });
}
