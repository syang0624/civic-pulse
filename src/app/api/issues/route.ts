import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import type { IssueCategory, Urgency, Trend } from '@/shared/types';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as IssueCategory | null;
  const urgency = searchParams.get('urgency') as Urgency | null;
  const trend = searchParams.get('trend') as Trend | null;
  const sort = searchParams.get('sort') ?? 'recent';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')));
  const regionCode = searchParams.get('region_code');
  const q = searchParams.get('q');

  const supabase = await createClient();

  let query = supabase
    .from('issues')
    .select('*', { count: 'exact' });

  if (category) query = query.eq('category', category);
  if (urgency) query = query.eq('urgency', urgency);
  if (trend) query = query.eq('trend', trend);
  if (regionCode) query = query.eq('region_code', regionCode);
  if (q) query = query.or(`title_ko.ilike.%${q}%,title_en.ilike.%${q}%`);

  const sortMap: Record<string, { column: string; ascending: boolean; secondary?: { column: string; ascending: boolean } }> = {
    recent:   { column: 'last_seen',      ascending: false, secondary: { column: 'urgency',       ascending: true  } },
    mentions: { column: 'mention_count',   ascending: false, secondary: { column: 'last_seen',     ascending: false } },
    urgency:  { column: 'urgency',         ascending: true,  secondary: { column: 'mention_count', ascending: false } },
  };
  const { column, ascending, secondary } = sortMap[sort] ?? sortMap.recent;
  query = query.order(column, { ascending });
  if (secondary) {
    query = query.order(secondary.column, { ascending: secondary.ascending });
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  });
}