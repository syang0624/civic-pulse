import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude } from '@/backend/lib/claude';
import { adGenerationSchema } from '@/backend/validators/generate';
import { assembleContext, formatIssueContext } from '@/backend/services/context';
import { buildAdSystemPrompt, buildAdUserPrompt } from '@/backend/prompts/ad';
import type { Locale } from '@/shared/types';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = adGenerationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 },
    );
  }

  const params = result.data;
  const locale = (request.headers.get('x-locale') ?? 'ko') as Locale;

  const ctx = await assembleContext(user.id, locale, params.issue_id);
  if (!ctx) {
    return NextResponse.json(
      { error: 'Profile not found. Please complete your profile first.' },
      { status: 404 },
    );
  }

  const issueContext = formatIssueContext(ctx);

  const systemPrompt = buildAdSystemPrompt(ctx);
  const userPrompt = buildAdUserPrompt({
    platform: params.platform,
    topic: params.topic,
    goal: params.goal,
    issueContext,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 1024,
      temperature: 0.8,
    });

    const supabase = await createClient();
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        profile_id: user.id,
        tool: 'ad',
        input_params: params,
        context_used: {
          profile_fields: ['name', 'district_name', 'party'],
          issues_referenced: ctx.issues.map((i) => i.title),
        },
        output_text: outputText,
        locale,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ output_text: outputText });
    }

    return NextResponse.json(generation);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
