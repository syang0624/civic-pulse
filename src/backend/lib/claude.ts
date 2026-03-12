import { GoogleGenAI, Type } from '@google/genai';

export { Type } from '@google/genai';

let client: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return client;
}

export const GEMINI_MODEL = 'gemini-2.5-flash';

// kept for backward compat — callers reference CLAUDE_MODEL
export const CLAUDE_MODEL = GEMINI_MODEL;

export interface GeminiSchema {
  type: string;
  description?: string;
  properties?: Record<string, GeminiSchema>;
  required?: string[];
  items?: GeminiSchema;
  enum?: string[];
  nullable?: boolean;
}

export interface ClaudeGenerationOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  responseSchema?: GeminiSchema;
}

export async function generateWithClaude({
  system,
  prompt,
  maxTokens = 4096,
  temperature = 0.7,
  responseSchema,
}: ClaudeGenerationOptions): Promise<string> {
  const ai = getGeminiClient();

  const jsonConfig = responseSchema
    ? { responseMimeType: 'application/json' as const, responseSchema }
    : {};

  let response;
  try {
    response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: maxTokens,
        temperature,
        ...jsonConfig,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : String(err);

    // Surface rate-limit / quota errors clearly
    if (
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('429') ||
      message.includes('quota')
    ) {
      throw new Error(
        'AI_RATE_LIMIT: The AI service is temporarily unavailable due to rate limits. Please try again in a minute.',
      );
    }

    throw new Error(`AI generation failed: ${message}`);
  }

  const text = response.text;
  if (!text) {
    throw new Error('No text response from Gemini');
  }

  return text;
}

function escapeNewlinesInJsonStrings(text: string): string {
  return text.replace(/"(?:[^"\\]|\\.)*"/g, (match) =>
    match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t'),
  );
}

function tryParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch { /* fallthrough */ }

  try {
    return JSON.parse(escapeNewlinesInJsonStrings(text)) as T;
  } catch { /* fallthrough */ }

  return null;
}

export function parseJsonFromAI<T>(raw: string): T | null {
  // Strategy 1: direct parse
  const result = tryParse<T>(raw);
  if (result !== null) return result;

  // Strategy 2: strip markdown code fences
  const stripped = raw
    .replace(/^```(?:json|JSON)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();

  const strippedResult = tryParse<T>(stripped);
  if (strippedResult !== null) return strippedResult;

  // Strategy 3: extract outermost JSON object
  const objectMatch = raw.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const objResult = tryParse<T>(objectMatch[0]);
    if (objResult !== null) return objResult;
  }

  // Strategy 4: extract outermost JSON array
  const arrayMatch = raw.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const arrResult = tryParse<T>(arrayMatch[0]);
    if (arrResult !== null) return arrResult;
  }

  // Strategy 5: aggressive line-by-line repair for control chars in strings
  const repaired = repairJsonText(stripped || raw);
  if (repaired) {
    const repairedResult = tryParse<T>(repaired);
    if (repairedResult !== null) return repairedResult;
  }

  return null;
}

// Walks char-by-char to escape unescaped control characters inside JSON string values
function repairJsonText(text: string): string | null {
  try {
    const chars = [...text];
    const out: string[] = [];
    let inString = false;
    let prevChar = '';

    for (const ch of chars) {
      if (inString) {
        if (ch === '"' && prevChar !== '\\') {
          inString = false;
          out.push(ch);
        } else if (ch === '\n') {
          out.push('\\n');
        } else if (ch === '\r') {
          out.push('\\r');
        } else if (ch === '\t') {
          out.push('\\t');
        } else {
          out.push(ch);
        }
      } else {
        if (ch === '"' && prevChar !== '\\') {
          inString = true;
        }
        out.push(ch);
      }
      prevChar = ch;
    }

    return out.join('');
  } catch {
    return null;
  }
}
