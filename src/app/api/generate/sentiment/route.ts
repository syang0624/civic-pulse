import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude, parseJsonFromAI } from '@/backend/lib/claude';
import { sentimentGenerationSchema } from '@/backend/validators/generate';
import { assembleContext, formatIssueContext } from '@/backend/services/context';
import { buildSentimentSystemPrompt, buildSentimentUserPrompt } from '@/backend/prompts/sentiment';
import { buildQualityMeta } from '@/backend/services/quality';
import type { Generation, Locale } from '@/shared/types';

interface SentimentStructured {
  period: string;
  top_trending_up: string[];
  top_trending_down: string[];
  new_issues: string[];
  negative_hotspots: string[];
  recommended_actions: string[];
}

const SENTIMENT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    period: { type: Type.STRING },
    top_trending_up: { type: Type.ARRAY, items: { type: Type.STRING } },
    top_trending_down: { type: Type.ARRAY, items: { type: Type.STRING } },
    new_issues: { type: Type.ARRAY, items: { type: Type.STRING } },
    negative_hotspots: { type: Type.ARRAY, items: { type: Type.STRING } },
    recommended_actions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'period',
    'top_trending_up',
    'top_trending_down',
    'new_issues',
    'negative_hotspots',
    'recommended_actions',
  ],
};

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = sentimentGenerationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 },
    );
  }

  const params = result.data;
  const locale = (request.headers.get('x-locale') ?? 'ko') as Locale;
  const strictFactual = Boolean(params.strict_factual);
  const period = params.period ?? '4weeks';
  const compareTo = params.compare_to ?? 'none';

  const ctx = await assembleContext(user.id, locale);
  if (!ctx) {
    return NextResponse.json(
      { error: 'Profile not found. Please complete your profile first.' },
      { status: 404 },
    );
  }

  const issueContext = formatIssueContext(ctx);
  const systemPrompt = buildSentimentSystemPrompt(ctx);
  const userPrompt = buildSentimentUserPrompt({
    period,
    compareTo,
    issueContext,
    strictFactual,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 4096,
      temperature: strictFactual ? 0.2 : 0.5,
      responseSchema: SENTIMENT_RESPONSE_SCHEMA,
    });

    const structured =
      parseJsonFromAI<SentimentStructured>(outputText) ??
      {
        period,
        top_trending_up: [],
        top_trending_down: [],
        new_issues: [],
        negative_hotspots: [],
        recommended_actions: [outputText],
      };

    const quality = buildQualityMeta({ strictFactual, ctx, outputText });
    const contextUsed: Generation['context_used'] = {
      profile_fields: ['district_name', 'tone'],
      issues_referenced: ctx.issues.map((i) => i.title),
      quality,
    };

    const supabase = await createClient();
    const outputJson = JSON.stringify(structured);
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        profile_id: user.id,
        tool: 'sentiment',
        input_params: {
          period,
          compare_to: compareTo,
          strict_factual: strictFactual,
        },
        context_used: contextUsed,
        output_text: outputJson,
        locale,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ output_text: outputJson, structured, quality });
    }

    return NextResponse.json({ ...generation, structured, quality });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
