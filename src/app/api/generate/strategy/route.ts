import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getAuthUser } from '@/backend/lib/auth';
import { createClient } from '@/backend/lib/supabase/server';
import { generateWithClaude, parseJsonFromAI } from '@/backend/lib/claude';
import { strategyGenerationSchema } from '@/backend/validators/generate';
import { assembleContext } from '@/backend/services/context';
import {
  buildStrategySystemPrompt,
  buildStrategyUserPrompt,
} from '@/backend/prompts/strategy';
import type { Locale } from '@/shared/types';

interface StructuredStrategyOutput {
  issue_summary: string;
  key_voter_groups: Array<{
    group: string;
    concern: string;
    approach: string;
  }>;
  messaging_angle: {
    core_message: string;
    framing: string;
    tone_recommendation: string;
  };
  campaign_actions: Array<{
    action: string;
    timeline: string;
    expected_impact: string;
  }>;
  talking_points: string[];
  social_media_strategy: {
    key_hashtags: string[];
    content_themes: string[];
    recommended_platforms: string[];
    post_frequency: string;
  };
  risks_and_counters: Array<{
    risk: string;
    counter: string;
  }>;
}

const STRATEGY_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    issue_summary: { type: Type.STRING },
    key_voter_groups: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          group: { type: Type.STRING },
          concern: { type: Type.STRING },
          approach: { type: Type.STRING },
        },
        required: ['group', 'concern', 'approach'],
      },
    },
    messaging_angle: {
      type: Type.OBJECT,
      properties: {
        core_message: { type: Type.STRING },
        framing: { type: Type.STRING },
        tone_recommendation: { type: Type.STRING },
      },
      required: ['core_message', 'framing', 'tone_recommendation'],
    },
    campaign_actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING },
          timeline: { type: Type.STRING },
          expected_impact: { type: Type.STRING },
        },
        required: ['action', 'timeline', 'expected_impact'],
      },
    },
    talking_points: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    social_media_strategy: {
      type: Type.OBJECT,
      properties: {
        key_hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
        content_themes: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommended_platforms: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        post_frequency: { type: Type.STRING },
      },
      required: [
        'key_hashtags',
        'content_themes',
        'recommended_platforms',
        'post_frequency',
      ],
    },
    risks_and_counters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          risk: { type: Type.STRING },
          counter: { type: Type.STRING },
        },
        required: ['risk', 'counter'],
      },
    },
  },
  required: [
    'issue_summary',
    'key_voter_groups',
    'messaging_angle',
    'campaign_actions',
    'talking_points',
    'social_media_strategy',
    'risks_and_counters',
  ],
};

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = strategyGenerationSchema.safeParse(body);
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

  const issue = ctx.issues[0];
  if (!issue) {
    return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
  }

  const systemPrompt = buildStrategySystemPrompt(ctx);
  const userPrompt = buildStrategyUserPrompt({
    issue: {
      title: issue.title,
      description: issue.description,
      category: issue.category,
      urgency: issue.urgency,
    },
    focus: params.focus,
  });

  try {
    const outputText = await generateWithClaude({
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: 8192,
      temperature: 0.6,
      responseSchema: STRATEGY_RESPONSE_SCHEMA,
    });

    const structured: StructuredStrategyOutput = parseJsonFromAI<StructuredStrategyOutput>(outputText) ?? {
      issue_summary: outputText,
      key_voter_groups: [],
      messaging_angle: {
        core_message: '',
        framing: '',
        tone_recommendation: '',
      },
      campaign_actions: [],
      talking_points: [],
      social_media_strategy: {
        key_hashtags: [],
        content_themes: [],
        recommended_platforms: [],
        post_frequency: '',
      },
      risks_and_counters: [],
    };

    const outputJson = JSON.stringify(structured);

    const supabase = await createClient();
    const { data: generation, error: dbError } = await supabase
      .from('generations')
      .insert({
        profile_id: user.id,
        tool: 'strategy',
        input_params: {
          ...params,
          issue_title: issue.title,
        },
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
