import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region');
  const category = searchParams.get('category');
  const urgency = searchParams.get('urgency');

  const supabase = await createClient();

  let query = supabase
    .from('issues')
    .select('*')
    .order('mention_count', { ascending: false })
    .limit(50);

  if (region) {
    query = query.eq('region_code', region);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (urgency) {
    query = query.eq('urgency', urgency);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [] });
}
