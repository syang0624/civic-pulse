import type { ContextPackage } from '@/shared/types';

export interface QualityMeta {
  source_confidence: 'high' | 'medium' | 'low';
  policy_alignment: 'aligned' | 'needs_review';
  strict_factual: boolean;
  notes: string[];
}

function containsPolicySignal(outputText: string, ctx: ContextPackage): boolean {
  const lower = outputText.toLowerCase();
  const signals = ctx.positions
    .flatMap((position) => [position.topic, position.stance, ...(position.talking_points ?? [])])
    .map((text) => text.toLowerCase().trim())
    .filter((text) => text.length >= 4)
    .slice(0, 40);

  if (signals.length === 0) {
    return true;
  }

  return signals.some((signal) => lower.includes(signal));
}

export function buildQualityMeta(args: {
  strictFactual: boolean;
  ctx: ContextPackage;
  outputText: string;
}): QualityMeta {
  const { strictFactual, ctx, outputText } = args;

  const notes: string[] = [];
  const sourceConfidence: QualityMeta['source_confidence'] =
    ctx.issues.length >= 3 ? 'high' : ctx.issues.length >= 1 ? 'medium' : 'low';

  if (sourceConfidence === 'low') {
    notes.push('Limited local issue context was available.');
  }
  if (strictFactual) {
    notes.push('Strict factual mode enabled: no fabricated statistics allowed.');
  }

  const policyAligned = containsPolicySignal(outputText, ctx);
  if (!policyAligned) {
    notes.push('Output may need manual review for policy alignment.');
  }

  return {
    source_confidence: sourceConfidence,
    policy_alignment: policyAligned ? 'aligned' : 'needs_review',
    strict_factual: strictFactual,
    notes,
  };
}
