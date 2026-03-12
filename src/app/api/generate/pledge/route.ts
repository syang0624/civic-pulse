import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude } from '@/backend/lib/claude';
import { pledgeGenerationSchema } from '@/backend/validators/generate';
import { assembleContext, formatIssueContext } from '@/backend/services/context';
import {
  buildPledgeSystemPrompt,
  buildPledgeUserPrompt,
} from '@/backend/prompts/pledge';
import type { Locale, IssueCategory } from '@/shared/types';

interface StructuredPledge {
  rank: number;
  title: string;
  category: IssueCategory;
  problem: string;
  solution: string;
  timeline: string;
  expected_outcomes: string[];
  talking_points: string[];
  priority_reason: string;
  estimated_budget: string;
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = pledgeGenerationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 },
    );
  }

  const params = result.data;
  const locale = (request.headers.get('x-locale') ?? 'ko') as Locale;

  const ctx = await assembleContext(user.id, locale);
  if (!ctx) {
    return NextResponse.json(
      { error: 'Profile not found. Please complete your profile first.' },
      { status: 404 },
    );
  }

  const issueContext = formatIssueContext(ctx);

  const systemPrompt = buildPledgeSystemPrompt(ctx);
  const userPrompt = buildPledgeUserPrompt({
    focusAreas: params.focus_areas,
    numPledges: params.num_pledges,
    regionContext: params.region_context ?? null,
    issueContext,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    let structured: StructuredPledge[];
    try {
      const cleaned = outputText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      structured = JSON.parse(cleaned) as StructuredPledge[];
    } catch {
      structured = [];
    }

    const outputJson = JSON.stringify(structured.length > 0 ? structured : outputText);

    const supabase = await createClient();
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        profile_id: user.id,
        tool: 'pledge',
        input_params: params,
        context_used: {
          profile_fields: ['name', 'district_name', 'party', 'election_type'],
          issues_referenced: ctx.issues.map((i) => i.title),
        },
        output_text: outputJson,
        locale,
      })
      .select()
      .single();

    if (dbError) {
      return NextResponse.json({ output_text: outputJson, structured });
    }

    return NextResponse.json({
      ...generation,
      structured,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
