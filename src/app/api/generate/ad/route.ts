import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude, parseJsonFromAI, Type } from '@/backend/lib/claude';
import { adGenerationSchema } from '@/backend/validators/generate';
import { assembleContext, formatIssueContext } from '@/backend/services/context';
import { buildAdSystemPrompt, buildAdUserPrompt } from '@/backend/prompts/ad';
import { buildQualityMeta } from '@/backend/services/quality';
import type { Locale } from '@/shared/types';

interface StructuredAdOutput {
  title: string;
  content: string;
  hashtags: string[];
  image_suggestions: string[];
}

const AD_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    content: { type: Type.STRING },
    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
    image_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['title', 'content', 'hashtags', 'image_suggestions'],
};

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
  const strictFactual = Boolean(params.strict_factual);

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
    locale,
    issueContext,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 8192,
      temperature: strictFactual ? 0.2 : 0.8,
      responseSchema: AD_RESPONSE_SCHEMA,
    });

    const structured: StructuredAdOutput = parseJsonFromAI<StructuredAdOutput>(outputText) ?? {
      title: '',
      content: outputText,
      hashtags: [],
      image_suggestions: [],
    };

    const outputJson = JSON.stringify(structured);
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
        tool: 'ad',
        input_params: params,
        context_used: {
          profile_fields: ['name', 'district_name', 'party'],
          issues_referenced: ctx.issues.map((i) => i.title),
          quality,
        },
        output_text: outputJson,
        locale,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ output_text: outputJson, structured, quality });
    }

    return NextResponse.json({
      ...generation,
      structured,
      quality,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
