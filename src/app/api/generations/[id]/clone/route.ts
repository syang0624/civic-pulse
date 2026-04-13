import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import type { Generation } from '@/shared/types';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .eq('profile_id', user.id)
    .single<Generation>();

  if (error || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const seedText = existing.edited_text?.trim() || existing.output_text;
  const history = Array.isArray(existing.context_used?.version_history)
    ? existing.context_used.version_history
    : [];

  const { data: cloned, error: cloneError } = await supabase
    .from('generations')
    .insert({
      profile_id: user.id,
      tool: existing.tool,
      input_params: {
        ...existing.input_params,
        cloned_from: existing.id,
      },
      context_used: {
        ...(existing.context_used ?? {}),
        version_history: [
          ...history,
          {
            at: new Date().toISOString(),
            text: seedText,
          },
        ],
      },
      output_text: seedText,
      user_edited: false,
      edited_text: null,
      locale: existing.locale,
    })
    .select('*')
    .single();

  if (cloneError || !cloned) {
    return NextResponse.json({ error: cloneError?.message ?? 'Failed to clone' }, { status: 500 });
  }

  return NextResponse.json(cloned, { status: 201 });
}
