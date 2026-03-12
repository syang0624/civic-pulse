import { NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { profileUpdateSchema } from '@/backend/validators/profile';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from('profiles')
    .select('*, policy_positions(*)')
    .eq('id', user.id)
    .single();

  let data = existing;

  if (error || !data) {
    const defaults = {
      id: user.id,
      name: user.email?.split('@')[0] ?? '',
      district_code: 'seoul',
      district_name: '',
      party: '',
      tone: 'formal' as const,
      target_demo: ['youth'] as string[],
      locale: 'ko' as const,
    };

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .upsert(defaults)
      .select('*, policy_positions(*)')
      .single();

    if (createError || !created) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    data = created;
  }

  const { policy_positions, ...rest } = data;
  const profile = { ...rest, positions: policy_positions ?? [] };

  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = profileUpdateSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, ...result.data })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
