import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';

async function getOwnedGeneration(id: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .eq('profile_id', userId)
    .single();

  return { data, error, supabase };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data, error } = await getOwnedGeneration(id, user.id);

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { edited_text?: unknown };
  const editedText = typeof body.edited_text === 'string' ? body.edited_text.trim() : '';

  if (!editedText) {
    return NextResponse.json({ error: 'edited_text is required' }, { status: 400 });
  }

  const { id } = await params;
  const { data: existing, error: existingError, supabase } = await getOwnedGeneration(id, user.id);

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('generations')
    .update({
      edited_text: editedText,
      user_edited: true,
      context_used: {
        ...(existing.context_used ?? {}),
        version_history: [
          ...((Array.isArray(existing.context_used?.version_history)
            ? existing.context_used.version_history
            : []) as Array<{ at: string; text: string }>),
          {
            at: new Date().toISOString(),
            text: existing.edited_text?.trim() || existing.output_text,
          },
        ],
      },
    })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to update generation' }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { data: existing, error: existingError, supabase } = await getOwnedGeneration(id, user.id);

  if (existingError || !existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('generations')
    .delete()
    .eq('id', id)
    .eq('profile_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
