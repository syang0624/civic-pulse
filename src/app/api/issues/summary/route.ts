import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const regionCode = searchParams.get('region_code');

  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let query = supabase
    .from('issues')
    .select('id, category, urgency, trend, last_seen')
    .gte('last_seen', thirtyDaysAgo.toISOString());

  if (regionCode) {
    query = query.eq('region_code', regionCode);
  }

  const { data: issues, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = issues?.length || 0;

  const by_urgency = { high: 0, medium: 0, low: 0 };
  const by_trend = { rising: 0, stable: 0, declining: 0 };
  const categoryCounts: Record<string, number> = {};

  issues?.forEach((issue) => {
    if (issue.urgency === 'high') by_urgency.high++;
    else if (issue.urgency === 'medium') by_urgency.medium++;
    else if (issue.urgency === 'low') by_urgency.low++;

    if (issue.trend === 'rising') by_trend.rising++;
    else if (issue.trend === 'stable') by_trend.stable++;
    else if (issue.trend === 'declining') by_trend.declining++;

    const cat = issue.category as string;
    if (cat) {
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }
  });

  const by_category = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const top_category = by_category.length > 0 ? by_category[0].category : null;

  return NextResponse.json({
    total,
    by_urgency,
    by_category,
    by_trend,
    top_category,
    high_urgency_count: by_urgency.high,
  });
}
