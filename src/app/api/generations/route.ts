import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import type { GenerationTool } from '@/shared/types';

const TOOLS: GenerationTool[] = ['speech', 'email', 'ad', 'pledge', 'strategy', 'sentiment'];

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const toolParam = searchParams.get('tool');
  const search = searchParams.get('search')?.trim() ?? '';
  const sort = searchParams.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')));
  const tool = toolParam && TOOLS.includes(toolParam as GenerationTool)
    ? (toolParam as GenerationTool)
    : null;

  const supabase = await createClient();

  let query = supabase
    .from('generations')
    .select('*', { count: 'exact' })
    .eq('profile_id', user.id);

  if (tool) {
    query = query.eq('tool', tool);
  }
  if (search) {
    query = query.ilike('output_text', `%${search}%`);
  }

  query = query.order('created_at', { ascending: sort === 'oldest' });

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
