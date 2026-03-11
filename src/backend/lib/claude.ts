import { GoogleGenAI } from '@google/genai';

let client: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY! });
  }
  return client;
}

export const GEMINI_MODEL = 'gemini-2.0-flash';

// kept for backward compat — callers reference CLAUDE_MODEL
export const CLAUDE_MODEL = GEMINI_MODEL;

export interface ClaudeGenerationOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function generateWithClaude({
  system,
  prompt,
  maxTokens = 4096,
  temperature = 0.7,
}: ClaudeGenerationOptions): Promise<string> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      systemInstruction: system,
      maxOutputTokens: maxTokens,
      temperature,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('No text response from Gemini');
  }

  return text;
}
