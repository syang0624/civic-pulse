import { NextResponse } from 'next/server';
import { getAuthUser } from '@/backend/lib/auth';
import { generateWithClaude } from '@/backend/lib/claude';
import { documentSummarizeSchema } from '@/backend/validators/documents';
import type { DocumentSummary } from '@/shared/types';

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const result = documentSummarizeSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 400 },
    );
  }

  const { title, content } = result.data;

  const system = `You are an expert policy analyst for Korean local government politicians.
Analyze the provided document and return a structured JSON summary.
Always respond with valid JSON matching this exact schema:
{
  "one_line": "A single sentence summarizing the document",
  "key_changes": ["Array of 3-5 key changes or provisions"],
  "who_affected": ["Array of affected groups (e.g., youth, elderly, business owners)"],
  "timeline": "Implementation timeline or effective dates",
  "district_impact": "How this impacts a local district council member's constituents",
  "talking_points": ["Array of 3-5 talking points a politician could use"]
}
If the document is not a policy/legislative document, still extract the most relevant structured information.
Respond ONLY with the JSON object, no markdown fencing or extra text.`;

  const prompt = `Document Title: ${title}\n\nDocument Text:\n${content}`;

  try {
    const raw = await generateWithClaude({
      system,
      prompt,
      maxTokens: 2048,
      temperature: 0.3,
    });

    const summary: DocumentSummary = JSON.parse(raw);

    return NextResponse.json({
      title,
      summary,
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Summarization failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
