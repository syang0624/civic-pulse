import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import type { Generation } from '@/shared/types';

function endpointByTool(tool: string): string | null {
  if (tool === 'speech') return '/api/generate/speech';
  if (tool === 'email') return '/api/generate/email';
  if (tool === 'ad') return '/api/generate/ad';
  if (tool === 'pledge') return '/api/generate/pledge';
  if (tool === 'strategy') return '/api/generate/strategy';
  if (tool === 'sentiment') return '/api/generate/sentiment';
  return null;
}

export async function POST(
  request: NextRequest,
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

  const endpoint = endpointByTool(existing.tool);
  if (!endpoint) {
    return NextResponse.json({ error: 'Unsupported tool for regeneration' }, { status: 400 });
  }

  const originalText = existing.edited_text?.trim() || existing.output_text;
  const history = Array.isArray(existing.context_used?.version_history)
    ? existing.context_used.version_history
    : [];

  const payload = {
    ...existing.input_params,
    seed_text: originalText,
  };

  const origin = new URL(request.url).origin;
  const localeHeader = request.headers.get('x-locale') ?? existing.locale;
  const regenerated = await fetch(`${origin}${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-locale': localeHeader,
      cookie: request.headers.get('cookie') ?? '',
    },
    body: JSON.stringify(payload),
  });

  const regeneratedJson = await regenerated.json();
  if (!regenerated.ok) {
    return NextResponse.json({ error: regeneratedJson?.error ?? 'Regeneration failed' }, { status: regenerated.status });
  }

  const newId = regeneratedJson?.id as string | undefined;
  if (!newId) {
    return NextResponse.json(regeneratedJson);
  }

  const { data: updated, error: updateError } = await supabase
    .from('generations')
    .update({
      context_used: {
        ...(regeneratedJson.context_used ?? {}),
        version_history: [
          ...history,
          {
            at: new Date().toISOString(),
            text: originalText,
          },
        ],
      },
    })
    .eq('id', newId)
    .eq('profile_id', user.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return NextResponse.json(regeneratedJson);
  }

  return NextResponse.json(updated);
}
