import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude } from '@/backend/lib/claude';
import { emailGenerationSchema } from '@/backend/validators/generate';
import { assembleContext, formatIssueContext } from '@/backend/services/context';
import { buildEmailSystemPrompt, buildEmailUserPrompt } from '@/backend/prompts/email';
import { buildQualityMeta } from '@/backend/services/quality';
import type { Generation, Locale } from '@/shared/types';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = emailGenerationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 },
    );
  }

  const params = result.data;
  const locale = (request.headers.get('x-locale') ?? 'ko') as Locale;
  const strictFactual = Boolean(params.strict_factual);

  const ctx = await assembleContext(user.id, locale, params.issue_id);
  if (!ctx) {
    return NextResponse.json(
      { error: 'Profile not found. Please complete your profile first.' },
      { status: 404 },
    );
  }

  const tone = params.tone ?? ctx.profile.tone;
  const issueContext = formatIssueContext(ctx);
  const systemPrompt = buildEmailSystemPrompt(ctx);
  const userPrompt = buildEmailUserPrompt({
    inboundEmail: params.inbound_email,
    tone,
    issueContext,
    strictFactual,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 4096,
      temperature: strictFactual ? 0.2 : 0.6,
    });

    const quality = buildQualityMeta({ strictFactual, ctx, outputText });
    const contextUsed: Generation['context_used'] = {
      profile_fields: ['name', 'district_name', 'party', 'tone'],
      issues_referenced: ctx.issues.map((i) => i.title),
      quality,
    };

    const supabase = await createClient();
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        profile_id: user.id,
        tool: 'email',
        input_params: {
          inbound_email: params.inbound_email,
          tone,
          issue_id: params.issue_id,
          strict_factual: strictFactual,
        },
        context_used: contextUsed,
        output_text: outputText,
        locale,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ output_text: outputText, quality });
    }

    return NextResponse.json({ ...generation, quality });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
