import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude } from '@/backend/lib/claude';
import { speechGenerationSchema } from '@/backend/validators/generate';
import { assembleContext, formatIssueContext } from '@/backend/services/context';
import { buildQualityMeta } from '@/backend/services/quality';
import {
  buildSpeechSystemPrompt,
  buildSpeechUserPrompt,
  speechLengthToWords,
} from '@/backend/prompts/speech';
import type { Locale } from '@/shared/types';

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = speechGenerationSchema.safeParse(body);
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
  const dataLevel = params.data_level ?? 'medium';
  const targetWords = speechLengthToWords(params.length);
  const issueContext = formatIssueContext(ctx);

  const systemPrompt = buildSpeechSystemPrompt(ctx);
  const userPrompt = buildSpeechUserPrompt({
    topic: params.topic,
    occasion: params.occasion,
    tone,
    targetWords,
    dataLevel,
    issueContext,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: Math.max(8192, targetWords * 4),
      temperature: strictFactual ? 0.2 : 0.7,
    });

    const quality = buildQualityMeta({
      strictFactual,
      ctx,
      outputText,
    });

    const supabase = await createClient();
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        profile_id: user.id,
        tool: 'speech',
        input_params: params,
        context_used: {
          profile_fields: ['name', 'district_name', 'party', 'tone', 'target_demo'],
          issues_referenced: ctx.issues.map((i) => i.title),
          quality,
        },
        output_text: outputText,
        locale,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ output_text: outputText });
    }

    return NextResponse.json({ ...generation, quality });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
